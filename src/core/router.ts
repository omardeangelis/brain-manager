import type { DiskFact } from "./link-plan.js"
import { CANONICAL_ROUTER } from "./providers.js"

/**
 * Pure analysis of the repo-root router (`AGENTS.md`, plus a holdout root file
 * such as `CLAUDE.md`). Two questions, both mechanical:
 *
 * - **State** — how the two files relate on disk, which decides what `brain link`
 *   may do without losing content (`routerState`, `routerDivergence`).
 * - **Pertinence** — what a router already carries that the flows need: gates,
 *   a pointer to `brain/`, a review policy, personas… (`pertinenceSignals`).
 *   Classifying a router (stub / foreign / partial / complete) from these
 *   signals is the LLM's job (init-brain → references/router.md).
 */

/** The router stub `brain link` writes when a project has no root router at all. */
export const ROUTER_STUB = `# AGENTS.md

Guidance for AI coding agents working in this repo. The knowledge base and the
spec-driven skill suite live under \`brain/\` — start with \`create-spec\`, and read
\`brain/AGENTS.md\` for how to operate inside \`brain/\`.

## Project guidelines

<!-- Build / test / lint gates, review gates, and conventions every change must respect. -->
`

/** A router file on disk: its kind, its symlink target, and its text when it is (or resolves to) a file. */
export interface RouterFile extends DiskFact {
  readonly content?: string
}

export type RouterState =
  | "none"
  | "claude-only"
  | "agents-only"
  | "linked"
  | "identical"
  | "divergent"

/** Trailing whitespace and line endings never count as a difference. */
const normalize = (s: string): string =>
  s.replace(/\r\n/g, "\n").split("\n").map((l) => l.trimEnd()).join("\n").trim()

export const sameContent = (a: string, b: string): boolean => normalize(a) === normalize(b)

/**
 * How `AGENTS.md` and a holdout root file (`CLAUDE.md`) relate.
 *
 * - `AGENTS.md` as a symlink back to the holdout is the reverse layout: the
 *   content lives in the holdout, so it reads as `claude-only` (promotable).
 * - `identical` / `divergent` need both contents; a holdout whose content is
 *   unknown reads as `divergent`, so nothing is ever discarded on a guess.
 */
export const routerState = (input: {
  readonly agentsMd: RouterFile
  readonly claudeMd: RouterFile
  /** The holdout's own file name (default `CLAUDE.md`), to recognise the reverse link. */
  readonly holdout?: string
}): RouterState => {
  const { agentsMd: a, claudeMd: c } = input
  const holdout = input.holdout ?? "CLAUDE.md"
  const agentsReal = a.kind === "file" || (a.kind === "symlink" && a.target !== holdout)
  if (!agentsReal) return c.kind === "file" ? "claude-only" : "none"
  if (c.kind === "absent") return "agents-only"
  if (c.kind === "symlink" && c.target === CANONICAL_ROUTER) return "linked"
  if (c.kind === "dir") return "divergent"
  if (a.content === undefined || c.content === undefined) return "divergent"
  return sameContent(a.content, c.content) ? "identical" : "divergent"
}

/** Markdown headings outside fenced code blocks, as written (without the `#`s). */
export const headings = (content: string): Array<string> => {
  const out: Array<string> = []
  let fenced = false
  for (const line of content.replace(/\r\n/g, "\n").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    if (fenced) continue
    const m = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)
    if (m) out.push(m[1]!)
  }
  return out
}

const headingKey = (h: string): string => h.toLowerCase().replace(/[`*_]/g, "").replace(/\s+/g, " ").trim()

export interface RouterDivergence {
  /** Headings present in the holdout file and absent from `AGENTS.md`: what a reconcile must carry over. */
  readonly claudeOnlyHeadings: ReadonlyArray<string>
  /** Line-level similarity in [0, 1] (Dice coefficient over non-blank lines). */
  readonly similarity: number
}

/** What differs between `AGENTS.md` and the holdout file, for the conflict message and the reconcile. */
export const routerDivergence = (agentsMd: string, claudeMd: string): RouterDivergence => {
  const agentsKeys = new Set(headings(agentsMd).map(headingKey))
  // A title that is just the file's own name (`# CLAUDE.md`) carries nothing to merge.
  const claudeOnlyHeadings = headings(claudeMd).filter(
    (h) => !agentsKeys.has(headingKey(h)) && !/^[\w.-]+\.md$/i.test(headingKey(h))
  )

  const lines = (s: string) => normalize(s).split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
  const a = lines(agentsMd)
  const b = lines(claudeMd)
  const pool = new Map<string, number>()
  for (const l of a) pool.set(l, (pool.get(l) ?? 0) + 1)
  let common = 0
  for (const l of b) {
    const n = pool.get(l) ?? 0
    if (n > 0) {
      common++
      pool.set(l, n - 1)
    }
  }
  const total = a.length + b.length
  const similarity = total === 0 ? 1 : Math.round((2 * common / total) * 100) / 100
  return { claudeOnlyHeadings, similarity }
}

// ---------------------------------------------------------------------------
// Pertinence
// ---------------------------------------------------------------------------

export type ReviewPolicy = "on-request" | "mandatory"

export interface PertinenceSignals {
  /** Empty, our own stub, or too short to carry project guidance. */
  readonly isStub: boolean
  readonly hasGates: boolean
  /** Build / test / lint / typecheck commands found in code (spans or blocks). */
  readonly gateCommands: ReadonlyArray<string>
  readonly hasBrainPointer: boolean
  readonly hasWorkflow: boolean
  readonly reviewPolicy: ReviewPolicy | null
  readonly hasSkillRouting: boolean
  readonly hasPersonas: boolean
  readonly mentionsTechDebtPath: boolean
  readonly mentionsReviewPath: boolean
}

/** Below this many meaningful characters (no comments, no headings) a router carries no guidance. */
const STUB_THRESHOLD = 200

/** Text inside code spans and fenced blocks, one candidate command per line. */
const codeLines = (content: string): Array<string> => {
  const out: Array<string> = []
  let fenced = false
  for (const line of content.replace(/\r\n/g, "\n").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) {
      out.push(line.trim())
      continue
    }
    for (const m of line.matchAll(/`([^`\n]+)`/g)) out.push(m[1]!.trim())
  }
  // Drop a shell prompt and a trailing `# comment`.
  return out.map((l) => l.replace(/^\$\s+/, "").replace(/\s+#.*$/, "").trim()).filter((l) => l.length > 0 && !l.startsWith("#"))
}

const GATE_WORD =
  /\b(build|test|tests|lint|typecheck|type-check|tsc|check|format|vitest|jest|eslint|biome|prettier|pytest|ruff|mypy|clippy|vet)\b/
/** `npm run x`, `pnpm x`, `yarn run x`, `bun x`… → the script name, so it can be checked against package.json. */
const PM_SCRIPT = /^(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?([\w:.-]+)/
const PM_BUILTINS = new Set(["install", "i", "add", "ci", "exec", "dlx", "x", "create", "init", "publish"])

const gateCommandsOf = (content: string, scripts?: ReadonlyArray<string>): Array<string> => {
  const found: Array<string> = []
  for (const raw of codeLines(content)) {
    const cmd = raw.replace(/\s+/g, " ")
    if (cmd.length > 120 || !GATE_WORD.test(cmd)) continue
    const pm = cmd.match(PM_SCRIPT)
    if (pm) {
      const script = pm[1]!
      if (PM_BUILTINS.has(script)) continue
      // `npm test` is the one script the package manager runs without `run`.
      if (scripts !== undefined && !scripts.includes(script)) continue
    } else if (!/^(npx|tsc|make|cargo|go|pytest|ruff|mypy|vitest|jest|eslint|biome|prettier|just|gradle|\.\/gradlew|mvn|dotnet|swift|flutter|dart|bundle|rake|mix|python|uv|poetry)\b/.test(cmd)) {
      continue
    }
    if (!found.includes(cmd)) found.push(cmd)
  }
  return found
}

const ON_REQUEST =
  /review[^\n]{0,80}\b(optional|opt-in|only on (?:explicit )?request|on request|only when (?:explicitly )?(?:asked|requested)|solo su richiesta|su richiesta)\b|\b(optional|opt-in|only on (?:explicit )?request|on request)\b[^\n]{0,40}\breview/i
const MANDATORY =
  /review[^\n]{0,60}\b(mandatory|required|always runs?|must run|obbligatori[ao])\b|\b(mandatory|required|obbligatori[ao])\b[^\n]{0,40}\breview/i

export const reviewPolicyOf = (content: string): ReviewPolicy | null =>
  ON_REQUEST.test(content) ? "on-request" : MANDATORY.test(content) ? "mandatory" : null

/** Signals that tell what a router already carries; `scripts` are the root package.json script names. */
export const pertinenceSignals = (content: string, scripts?: ReadonlyArray<string>): PertinenceSignals => {
  const heads = headings(content)
  const meaningful = content
    .replace(/<!--[\s\S]*?-->/g, "")
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .join("\n")
    .trim()
  const gateCommands = gateCommandsOf(content, scripts)
  return {
    isStub: sameContent(content, ROUTER_STUB) || meaningful.length < STUB_THRESHOLD,
    hasGates: gateCommands.length > 0,
    gateCommands,
    hasBrainPointer: /(^|[^\w/-])brain\//m.test(content),
    hasWorkflow: heads.some((h) => /workflow|\bstep\s+\d+/i.test(h)),
    reviewPolicy: reviewPolicyOf(content),
    hasSkillRouting:
      heads.some((h) => /\bskills?\b/i.test(h)) || /^\s*\|[^\n]*\bskills?\b[^\n]*\|\s*$/im.test(content),
    hasPersonas: heads.some((h) => /\bpersonas?\b/i.test(h)),
    mentionsTechDebtPath: /tech-debt\/|TECH-DEBT[\w-]*\.md/i.test(content),
    mentionsReviewPath: /(^|[\s`'"(\[])(brain\/)?reviews?\/[\w<{*]/m.test(content)
  }
}

/** A one-line summary of the signals for the text report. */
export const describeSignals = (s: PertinenceSignals): string => {
  const parts: Array<string> = s.isStub ? ["stub"] : []
  if (s.hasGates) parts.push(`gates: ${s.gateCommands.slice(0, 4).join(", ")}${s.gateCommands.length > 4 ? ", …" : ""}`)
  else if (!s.isStub) parts.push("no gates")
  if (s.hasBrainPointer) parts.push("brain pointer")
  else if (!s.isStub) parts.push("no brain pointer")
  if (s.hasWorkflow) parts.push("workflow section")
  if (s.reviewPolicy !== null) parts.push(`review ${s.reviewPolicy}`)
  if (s.hasSkillRouting) parts.push("skill routing")
  if (s.hasPersonas) parts.push("personas")
  if (s.mentionsTechDebtPath) parts.push("tech-debt path")
  if (s.mentionsReviewPath) parts.push("review path")
  return parts.join(" · ")
}
