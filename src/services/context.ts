import { FileSystem } from "@effect/platform"
import { Effect, Either } from "effect"
import { type BrainConfig, CONFIG_PATH, decodeConfig, defaultConfig } from "../core/config.js"
import {
  type PersonaCandidate,
  type ProjectFindings,
  type ReviewStore,
  type RouterFinding,
  type ScannedFile,
  type SuggestedConfig,
  type TechDebtEntry,
  type TechDebtStore,
  personaCandidates,
  reviewLayout,
  suggestConfig,
  techDebtStores
} from "../core/detect.js"
import type { DiskFact } from "../core/link-plan.js"
import { CANONICAL_ROUTER } from "../core/providers.js"
import { type PertinenceSignals, type RouterState, pertinenceSignals, routerDivergence, routerState } from "../core/router.js"
import { exists, pathFact, readTextOrNull } from "./fsx.js"

/**
 * Collects the project facts the config is built from — persona sources, the
 * tech-debt store, review reports, the root router — and runs the pure
 * classifiers of core/detect.ts and core/router.ts over them. Shared by `scan`
 * (which reports everything) and `init` / `upgrade` (which write the suggested
 * config). Read-only.
 */

/** Where legacy knowledge usually lives (mirrors `scan`). */
export const LEGACY_DIRS = [
  "docs", "documentation", "wiki", ".notes", "notes", "knowledge",
  "adr", "rfcs", "decisions", "planning", "specs"
]
const AGENT_DIRS = [".claude/agents", ".agents/agents"]
const IGNORED = new Set([
  ".git", "node_modules", "dist", "build", ".venv", "venv",
  ".claude", ".agents", ".idea", ".vscode", "coverage", "target", "vendor"
])
const MAX_DEPTH = 6
const TECH_DEBT_DIRS = ["brain/tech-debt", "tech-debt", "docs/tech-debt"]
const TECH_DEBT_FILE = /^TECH-DEBT[^/]*\.md$/i
const HOLDOUT_ROUTER = "CLAUDE.md"

export interface RouterReport {
  readonly path: string
  readonly kind: DiskFact["kind"]
  readonly target?: string
  readonly signals: PertinenceSignals | null
}

export interface ProjectContext {
  readonly personas: ReadonlyArray<PersonaCandidate>
  readonly techDebt: ReadonlyArray<TechDebtStore>
  readonly review: ReviewStore
  readonly router: {
    readonly state: RouterState
    readonly files: ReadonlyArray<RouterReport>
    /** Set when both are real files with different content. */
    readonly divergence: { readonly claudeOnlyHeadings: ReadonlyArray<string>; readonly similarity: number } | null
  }
  readonly suggested: SuggestedConfig
  /** The config on disk: `null` when there is none, `Left` when it does not validate. */
  readonly config: Either.Either<BrainConfig, string> | null
}

/** Markdown files under `dir` (repo-relative), depth-bounded, skipping the usual build/vendor dirs. */
const markdownUnder = (dir: string, depth = 0): Effect.Effect<Array<string>, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    if (depth > MAX_DEPTH) return []
    const fs = yield* FileSystem.FileSystem
    const entries = yield* fs.readDirectory(dir).pipe(Effect.orElseSucceed(() => [] as Array<string>))
    const out: Array<string> = []
    for (const entry of entries.sort()) {
      if (IGNORED.has(entry)) continue
      const rel = `${dir}/${entry}`
      const stat = yield* fs.stat(rel).pipe(Effect.option)
      if (stat._tag === "None") continue
      if (stat.value.type === "Directory") out.push(...(yield* markdownUnder(rel, depth + 1)))
      else if (entry.toLowerCase().endsWith(".md")) out.push(rel)
    }
    return out
  })

/** `TECH-DEBT*.md` files anywhere in the repo (depth-bounded), brain/ included. */
const techDebtFiles = (dir: string, depth = 0): Effect.Effect<Array<string>, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    if (depth > 4) return []
    const fs = yield* FileSystem.FileSystem
    const entries = yield* fs.readDirectory(dir === "" ? "." : dir).pipe(Effect.orElseSucceed(() => [] as Array<string>))
    const out: Array<string> = []
    for (const entry of entries.sort()) {
      if (IGNORED.has(entry)) continue
      const rel = dir === "" ? entry : `${dir}/${entry}`
      const stat = yield* fs.stat(rel).pipe(Effect.option)
      if (stat._tag === "None") continue
      if (stat.value.type === "Directory") out.push(...(yield* techDebtFiles(rel, depth + 1)))
      else if (TECH_DEBT_FILE.test(entry)) out.push(rel)
    }
    return out
  })

const readAll = (paths: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const files: Array<ScannedFile> = []
    for (const p of [...new Set(paths)]) {
      const content = yield* readTextOrNull(p).pipe(Effect.orElseSucceed(() => null))
      if (content !== null) files.push({ path: p, content })
    }
    return files
  })

/** Root package.json script names, when there is one. */
export const packageScripts = Effect.gen(function* () {
  const raw = yield* readTextOrNull("package.json").pipe(Effect.orElseSucceed(() => null))
  if (raw === null) return undefined
  const parsed = yield* Effect.try(() => JSON.parse(raw)).pipe(Effect.orElseSucceed(() => null))
  const scripts = parsed?.scripts
  return scripts !== null && typeof scripts === "object" ? Object.keys(scripts) : undefined
})

/** The config on disk: null when absent, Left(message) when it does not parse or validate. */
export const readConfig = Effect.gen(function* () {
  const raw = yield* readTextOrNull(CONFIG_PATH).pipe(Effect.orElseSucceed(() => null))
  return raw === null ? null : decodeConfig(raw)
})

export interface CollectOptions {
  /** Shipped agent file names (`ux-advisor.md`, …): their own headings are never a persona source. */
  readonly shippedAgents: ReadonlySet<string>
}

export const collectContext = (opts: CollectOptions) =>
  Effect.gen(function* () {
    const config = yield* readConfig
    const configured = config !== null && Either.isRight(config) ? config.right : null

    const brainFiles = (yield* exists("brain")) ? yield* markdownUnder("brain") : []

    // --- personas: brain/, legacy stores, agent definitions, routers, constitutions
    const candidates: Array<string> = [...brainFiles]
    for (const dir of LEGACY_DIRS) if (yield* exists(dir)) candidates.push(...(yield* markdownUnder(dir)))
    for (const dir of AGENT_DIRS) {
      // `.claude/agents -> ../.agents/agents` would list every agent twice.
      const fact = yield* pathFact(dir)
      if (fact.kind !== "dir") continue
      for (const p of yield* markdownUnder(dir)) {
        if (!opts.shippedAgents.has(p.slice(dir.length + 1))) candidates.push(p)
      }
    }
    for (const root of [CANONICAL_ROUTER, HOLDOUT_ROUTER, "CONSTITUTION.md"]) {
      if ((yield* pathFact(root)).kind === "file") candidates.push(root)
    }
    const personas = personaCandidates(yield* readAll(candidates))

    // --- tech-debt store
    const debtDirs = [...new Set([...(configured ? [configured.paths.techDebt] : []), ...TECH_DEBT_DIRS])]
    const entries: Array<TechDebtEntry> = []
    for (const dir of debtDirs) {
      if ((yield* pathFact(dir)).kind !== "dir") continue
      const files = (yield* markdownUnder(dir)).map((p) => p.slice(dir.length + 1))
      entries.push({ path: dir, kind: "dir", files })
    }
    for (const file of yield* techDebtFiles("")) {
      if (!debtDirs.some((d) => file.startsWith(`${d}/`))) entries.push({ path: file, kind: "file", files: [] })
    }
    const techDebt = techDebtStores(entries)

    // --- review reports, against the spec folders that exist
    const fs = yield* FileSystem.FileSystem
    const specFolders = new Set<string>()
    for (const domain of yield* fs.readDirectory("brain/specs").pipe(Effect.orElseSucceed(() => [] as Array<string>))) {
      const specs = yield* fs.readDirectory(`brain/specs/${domain}`).pipe(Effect.orElseSucceed(() => [] as Array<string>))
      for (const spec of specs) {
        const stat = yield* fs.stat(`brain/specs/${domain}/${spec}`).pipe(Effect.option)
        if (stat._tag === "Some" && stat.value.type === "Directory") specFolders.add(`${domain}/${spec}`)
      }
    }
    const reports = brainFiles.filter((p) => p.endsWith("/REPORT.md"))
    const review = reviewLayout(reports, configured?.paths.reviews ?? defaultConfig.paths.reviews, specFolders)

    // --- root router: state + pertinence
    const scripts = yield* packageScripts
    const files: Array<RouterReport> = []
    const facts = new Map<string, DiskFact & { content?: string }>()
    for (const p of [CANONICAL_ROUTER, HOLDOUT_ROUTER]) {
      const fact = yield* pathFact(p)
      const content = fact.kind === "absent" || fact.kind === "dir"
        ? null
        : yield* readTextOrNull(p).pipe(Effect.orElseSucceed(() => null))
      facts.set(p, content === null ? fact : { ...fact, content })
      if (fact.kind === "absent") continue
      // A symlink to the other router file carries no content of its own.
      const isLink = fact.kind === "symlink"
      files.push({
        path: p,
        kind: fact.kind,
        ...(fact.target !== undefined ? { target: fact.target } : {}),
        signals: content === null || isLink ? null : pertinenceSignals(content, scripts)
      })
    }
    const agentsFact = facts.get(CANONICAL_ROUTER)!
    const claudeFact = facts.get(HOLDOUT_ROUTER)!
    const state = routerState({ agentsMd: agentsFact, claudeMd: claudeFact })
    const divergence =
      state === "divergent" && agentsFact.content !== undefined && claudeFact.content !== undefined
        ? routerDivergence(agentsFact.content, claudeFact.content)
        : null

    const findings: ProjectFindings = { personas, techDebt, review }
    const routerFindings: Array<RouterFinding> = files
      .filter((f): f is RouterReport & { signals: PertinenceSignals } => f.signals !== null)
      .map((f) => ({ path: f.path, signals: f.signals }))

    const context: ProjectContext = {
      personas,
      techDebt,
      review,
      router: { state, files, divergence },
      suggested: suggestConfig(findings, routerFindings),
      config
    }
    return context
  })
