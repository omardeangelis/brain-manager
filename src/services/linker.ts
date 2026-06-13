import { FileSystem } from "@effect/platform"
import { Effect, Option } from "effect"
import { type LinkAction, type DiskFact, expectedLinks, planLink } from "../core/link-plan.js"
import type { ManifestLink } from "../core/manifest.js"
import {
  CANONICAL_ROUTER,
  CANONICAL_SKILLS_DIR,
  PROVIDERS,
  type Provider,
  byId,
  parseProviders
} from "../core/providers.js"
import type { ReportLine } from "../core/report.js"
import { CliError } from "../errors.js"
import { exists, pathFact, removePath, renamePath, symlinkRel, writeText } from "./fsx.js"

/**
 * Providers whose footprint is visible in the repo. A provider is "detected" by
 * its marker dir or root file — except `.github` (Copilot's dir), which is too
 * generic, so Copilot is only detected via its `copilot-instructions.md` file.
 */
export const detectProviders = Effect.gen(function* () {
  const found: Array<Provider> = []
  for (const p of PROVIDERS) {
    const byDir = p.dir !== null && p.dir !== ".github" && (yield* exists(p.dir))
    const byFile = p.rootFile !== null && (yield* exists(p.rootFile))
    if (byDir || byFile) found.push(p)
  }
  return found
})

/**
 * Turn a `--providers` flag into a concrete selection: explicit list (failing on
 * unknown ids), else auto-detected providers, else Claude as the safe default.
 */
export const resolveProviders = (provided: Option.Option<string>) =>
  Effect.gen(function* () {
    if (Option.isSome(provided)) {
      const { providers, unknown } = parseProviders(provided.value)
      if (unknown.length > 0) {
        return yield* new CliError({
          message: `unknown provider id(s): ${unknown.join(", ")} — known: ${PROVIDERS.map((p) => p.id).join(", ")}`
        })
      }
      return [...providers]
    }
    const detected = yield* detectProviders
    return detected.length > 0 ? detected : [byId("claude")!]
  })

/**
 * Executes a `planLink` result against the filesystem. Shared by `brain link`,
 * `brain init` (when `--providers` is given), and the legacy-layout migration in
 * `brain upgrade`, so all three reach the `.agents/`-canonical layout the same way.
 */

const ROUTER_STUB = `# AGENTS.md

Guidance for AI coding agents working in this repo. The knowledge base and the
spec-driven skill suite live under \`brain/\` — start with \`create-spec\`, and read
\`brain/AGENTS.md\` for how to operate inside \`brain/\`.

## Project guidelines

<!-- Build / test / lint gates, review gates, and conventions every change must respect. -->
`

export interface RunLinkOptions {
  readonly providers: ReadonlyArray<Provider>
  /** Where the real skills currently live (manifest.skillsDir), or null when fresh. */
  readonly currentSkillsDir: string | null
  readonly force: boolean
  readonly dryRun: boolean
}

export interface RunLinkResult {
  readonly lines: Array<ReportLine>
  readonly actions: Array<LinkAction>
  /** The symlinks that should exist for this selection — to (re)write manifest.links. */
  readonly links: Array<ManifestLink>
  readonly skillsDir: string
}

const relevantPaths = (
  providers: ReadonlyArray<Provider>,
  currentSkillsDir: string | null
): Array<string> => {
  const set = new Set<string>([CANONICAL_SKILLS_DIR, CANONICAL_ROUTER])
  if (currentSkillsDir !== null) set.add(currentSkillsDir)
  for (const p of providers) {
    if (p.skills !== null) set.add(p.skills)
    if (p.rootFile !== null) set.add(p.rootFile)
  }
  return [...set]
}

/** Replace whatever is at `path` (if anything) with a fresh symlink to `target`. */
const linkAt = (path: string, target: string, dryRun: boolean) =>
  Effect.gen(function* () {
    if (dryRun) return
    const fact = yield* pathFact(path)
    if (fact.kind !== "absent") yield* removePath(path, fact.kind === "dir")
    yield* symlinkRel(target, path)
  })

const executeAction = (action: LinkAction, dryRun: boolean) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    switch (action._tag) {
      case "MigrateSkills":
        if (!dryRun) yield* renamePath(action.from, action.to)
        return { path: action.to, status: "migrated", note: `relocated from ${action.from}` }
      case "MakeCanonicalSkills":
        if (!dryRun) yield* fs.makeDirectory(action.path, { recursive: true })
        return { path: action.path, status: "created", note: "canonical skills dir" }
      case "LinkSkills":
        yield* linkAt(action.path, action.target, dryRun)
        return { path: action.path, status: "linked", note: `→ ${action.target}` }
      case "PromoteRouter":
        if (!dryRun) yield* renamePath(action.from, action.to)
        return { path: action.to, status: "promoted", note: `seeded from ${action.from}` }
      case "MakeCanonicalRouter":
        if (!dryRun) yield* writeText(action.path, ROUTER_STUB)
        return { path: action.path, status: "created", note: "canonical router stub" }
      case "LinkRouter":
        yield* linkAt(action.path, action.target, dryRun)
        return { path: action.path, status: "linked", note: `→ ${action.target}` }
      case "AlreadyLinked":
        return { path: action.path, status: "up-to-date" }
      case "Conflict":
        return { path: action.path, status: "conflict", note: action.why }
      case "Skip":
        return { path: action.path, status: "skipped", note: action.why }
    }
  })

export const runLink = (opts: RunLinkOptions) =>
  Effect.gen(function* () {
    const paths = relevantPaths(opts.providers, opts.currentSkillsDir)
    const disk = new Map<string, DiskFact>()
    for (const p of paths) disk.set(p, yield* pathFact(p))

    const actions = planLink({
      providers: opts.providers,
      currentSkillsDir: opts.currentSkillsDir,
      disk,
      force: opts.force
    })

    const lines: Array<ReportLine> = []
    for (const action of actions) lines.push(yield* executeAction(action, opts.dryRun))

    return { lines, actions, links: [...expectedLinks(opts.providers)], skillsDir: CANONICAL_SKILLS_DIR }
  })
