import { type BrainConfig, type ConfigKey, CONFIG_KEYS, type ReviewLocation, defaultConfig, getKey } from "./config.js"
import { type PertinenceSignals, headings } from "./router.js"

/**
 * Pure classifiers behind the project-context part of `brain scan` and the
 * config `init` / `upgrade` write: where the project keeps its personas, its
 * tech-debt store and its review reports, and which config values follow.
 *
 * Everything here only SUGGESTS, each value with its reason. Moving or
 * extracting content is the LLM's job, with the user's confirmation
 * (init-brain → references/project-context.md).
 */

export interface ScannedFile {
  /** Repo-root-relative POSIX path. */
  readonly path: string
  readonly content: string
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

export interface PersonaCandidate {
  readonly path: string
  /** `file`: the whole file is about personas. `section`: a heading inside a larger file. */
  readonly kind: "file" | "section"
  readonly heading?: string
}

const isAgentDefinition = (p: string): boolean => /^\.(claude|agents)\/agents\//.test(p)
const isRootRouter = (p: string): boolean => p === "AGENTS.md" || p === "CLAUDE.md"
const isConstitution = (p: string): boolean => /(^|\/)CONSTITUTION\.md$/i.test(p)

/** The word itself, so `personality` never matches. */
const PERSONA_WORD = /(^|[^a-z])personas?([^a-z]|$)/i

const basename = (p: string): string => p.slice(p.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "")

/** The `type:` value of the file's leading YAML frontmatter, if any. */
export const frontmatterType = (content: string): string | null => {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (fm === null) return null
  const t = fm[1]!.match(/^type\s*:\s*["']?([\w-]+)["']?\s*$/m)
  return t === null ? null : t[1]!
}

/**
 * Where the project's personas live. A dedicated file (by name or by
 * `type: personas` frontmatter) is a `file` candidate; a `persona` heading inside
 * an agent definition, the root router or a constitution-style file is a
 * `section` candidate. One candidate per file.
 */
export const personaCandidates = (files: ReadonlyArray<ScannedFile>): Array<PersonaCandidate> => {
  const out: Array<PersonaCandidate> = []
  for (const f of files) {
    const sectionHost = isAgentDefinition(f.path) || isRootRouter(f.path) || isConstitution(f.path)
    if (!sectionHost && (PERSONA_WORD.test(basename(f.path)) || frontmatterType(f.content) === "personas")) {
      out.push({ path: f.path, kind: "file" })
      continue
    }
    if (!sectionHost) continue
    const heading = headings(f.content).find((h) => PERSONA_WORD.test(h))
    if (heading !== undefined) out.push({ path: f.path, kind: "section", heading })
  }
  return out
}

// ---------------------------------------------------------------------------
// Tech-debt store
// ---------------------------------------------------------------------------

export interface TechDebtEntry {
  readonly path: string
  readonly kind: "dir" | "file"
  /** Markdown files inside a `dir` entry, relative to it. Ignored for a `file` entry. */
  readonly files: ReadonlyArray<string>
}

export type TechDebtLayout = "per-spec" | "flat" | "single-file"

export interface TechDebtStore {
  readonly path: string
  readonly files: number
  /**
   * `per-spec`: `<domain>/<spec>.md` pages (an empty dir counts too — it is the
   * default layout). `flat`: markdown files directly in the dir. `single-file`: one
   * ledger file such as `TECH-DEBT.md`.
   */
  readonly layout: TechDebtLayout
}

export const techDebtStores = (entries: ReadonlyArray<TechDebtEntry>): Array<TechDebtStore> =>
  entries.map((e) => {
    if (e.kind === "file") return { path: e.path, files: 1, layout: "single-file" }
    const md = e.files.filter((f) => f.toLowerCase().endsWith(".md") && !/(^|\/)(README|index)\.md$/i.test(f))
    const nested = md.some((f) => f.includes("/"))
    return { path: e.path, files: md.length, layout: nested || md.length === 0 ? "per-spec" : "flat" }
  })

// ---------------------------------------------------------------------------
// Review store
// ---------------------------------------------------------------------------

export interface ReviewStore {
  readonly layout: ReviewLocation
  /** The dir holding `<domain>/<spec>/REPORT.md` reviews (or the default when there are none). */
  readonly reviewsDir: string
  readonly reports: number
  /** Reports at `<reviewsDir>/<domain>/<spec>/REPORT.md` for an existing spec. */
  readonly inTree: number
  /** Reports inside a spec folder (`brain/specs/<domain>/<spec>/REPORT.md`). */
  readonly inSpecFolders: number
}

const SPECS_ROOT = "brain/specs"

/**
 * Where case-B review reports live. A `REPORT.md` at `<dir>/<domain>/<spec>/`
 * whose `<domain>/<spec>` exists under `brain/specs/` is a review-tree report;
 * the dir most of them share is the reviews dir. Whichever layout holds more
 * reports wins; with none, `spec-folder` (the default).
 */
export const reviewLayout = (
  reportPaths: ReadonlyArray<string>,
  reviewsDir: string,
  specFolders: ReadonlySet<string>
): ReviewStore => {
  const treeDirs = new Map<string, number>()
  let inSpecFolders = 0
  for (const p of reportPaths) {
    if (p.startsWith(`${SPECS_ROOT}/`)) {
      if (specFolders.has(p.slice(SPECS_ROOT.length + 1, -"/REPORT.md".length))) inSpecFolders++
      continue
    }
    const m = p.match(/^(.+)\/([^/]+)\/([^/]+)\/REPORT\.md$/)
    if (m === null) continue
    const [, dir, domain, spec] = m
    if (specFolders.has(`${domain}/${spec}`)) treeDirs.set(dir!, (treeDirs.get(dir!) ?? 0) + 1)
  }
  const preferred = (d: string) => (d === reviewsDir ? 0 : 1)
  const [bestDir, inTree] =
    [...treeDirs].sort((a, b) => b[1] - a[1] || preferred(a[0]) - preferred(b[0]))[0] ?? [reviewsDir, 0]
  return {
    layout: inTree > 0 && inTree >= inSpecFolders ? "review-tree" : "spec-folder",
    reviewsDir: bestDir,
    reports: reportPaths.length,
    inTree,
    inSpecFolders
  }
}

// ---------------------------------------------------------------------------
// Suggested config
// ---------------------------------------------------------------------------

export interface ProjectFindings {
  readonly personas: ReadonlyArray<PersonaCandidate>
  readonly techDebt: ReadonlyArray<TechDebtStore>
  readonly review: ReviewStore
}

export interface RouterFinding {
  readonly path: string
  readonly signals: PertinenceSignals
}

export interface Suggestion {
  readonly key: ConfigKey
  readonly value: string | null
  readonly reason: string
  /** `detected`: backed by evidence in the repo. `default`: nothing (decisive) found. */
  readonly basis: "detected" | "default"
}

export interface SuggestedConfig {
  readonly config: BrainConfig
  /** One entry per config key, in key order. */
  readonly suggestions: ReadonlyArray<Suggestion>
}

const reviewModeSuggestion = (routers: ReadonlyArray<RouterFinding>): Suggestion => {
  // AGENTS.md is canonical: its policy wins over a holdout's.
  const ordered = [...routers].sort((a, b) => (a.path === "AGENTS.md" ? -1 : b.path === "AGENTS.md" ? 1 : 0))
  const stated = ordered.find((r) => r.signals.reviewPolicy !== null)
  if (stated === undefined) {
    return { key: "review.mode", value: "total", reason: "no review policy stated in the root router — default", basis: "default" }
  }
  return stated.signals.reviewPolicy === "on-request"
    ? { key: "review.mode", value: "none", reason: `${stated.path} states review only on request`, basis: "detected" }
    : { key: "review.mode", value: "total", reason: `${stated.path} states review is mandatory`, basis: "detected" }
}

const techDebtSuggestion = (stores: ReadonlyArray<TechDebtStore>): Suggestion => {
  const fallback = defaultConfig.paths.techDebt
  const dirs = stores
    .filter((s) => s.layout !== "single-file" && s.files > 0)
    .sort((a, b) => b.files - a.files || (a.path === fallback ? -1 : 1))
  const best = dirs[0]
  if (best !== undefined) {
    const others = dirs.slice(1).map((s) => s.path)
    return {
      key: "paths.techDebt",
      value: best.path,
      reason:
        `${best.files} page(s) in ${best.path} (${best.layout})` +
        (best.layout === "flat" ? " — pages are not `<domain>/<spec>.md` yet" : "") +
        (others.length > 0 ? `; also found ${others.join(", ")}` : ""),
      basis: "detected"
    }
  }
  const singles = stores.filter((s) => s.layout === "single-file")
  if (singles.length > 0) {
    return {
      key: "paths.techDebt",
      value: fallback,
      reason: `single-file store ${singles.map((s) => s.path).join(", ")} — migrate it into ${fallback}/<domain>/<spec>.md, with confirmation`,
      basis: "default"
    }
  }
  return { key: "paths.techDebt", value: fallback, reason: "no tech-debt pages found — default", basis: "default" }
}

const personasSuggestion = (candidates: ReadonlyArray<PersonaCandidate>): Suggestion => {
  const files = candidates.filter((c) => c.kind === "file")
  const sections = candidates.filter((c) => c.kind === "section")
  if (files.length === 1) {
    return { key: "paths.personas", value: files[0]!.path, reason: "a dedicated persona file", basis: "detected" }
  }
  if (files.length > 1) {
    return {
      key: "paths.personas",
      value: null,
      reason: `several persona files (${files.map((f) => f.path).join(", ")}) — ask which one is canonical`,
      basis: "default"
    }
  }
  if (sections.length > 0) {
    const where = sections.map((s) => `${s.path} § "${s.heading}"`).join(", ")
    return {
      key: "paths.personas",
      value: null,
      reason: `personas only as a section (${where}) — extract them verbatim to brain/personas.md, with confirmation`,
      basis: "default"
    }
  }
  return { key: "paths.personas", value: null, reason: "no persona source found", basis: "default" }
}

/**
 * The config these findings suggest, with a reason for every key. The root
 * router corroborates the paths and is the only source for `review.mode`.
 */
export const suggestConfig = (
  findings: ProjectFindings,
  routers: ReadonlyArray<RouterFinding>
): SuggestedConfig => {
  const { review } = findings
  const tree = review.layout === "review-tree"
  const suggestions: Array<Suggestion> = [
    reviewModeSuggestion(routers),
    tree
      ? { key: "review.location", value: "review-tree", reason: `${review.inTree} report(s) under ${review.reviewsDir}/<domain>/<spec>/`, basis: "detected" }
      : review.inSpecFolders > 0
        ? { key: "review.location", value: "spec-folder", reason: `${review.inSpecFolders} report(s) inside spec folders`, basis: "detected" }
        : { key: "review.location", value: "spec-folder", reason: "no spec review reports found — default", basis: "default" },
    techDebtSuggestion(findings.techDebt),
    tree
      ? { key: "paths.reviews", value: review.reviewsDir, reason: `existing review tree at ${review.reviewsDir}`, basis: "detected" }
      : { key: "paths.reviews", value: defaultConfig.paths.reviews, reason: "default", basis: "default" },
    personasSuggestion(findings.personas)
  ]
  const value = (k: ConfigKey) => suggestions.find((s) => s.key === k)!.value
  const config: BrainConfig = {
    version: defaultConfig.version,
    review: {
      mode: value("review.mode") as BrainConfig["review"]["mode"],
      location: value("review.location") as BrainConfig["review"]["location"]
    },
    paths: {
      techDebt: value("paths.techDebt")!,
      reviews: value("paths.reviews")!,
      personas: value("paths.personas")
    }
  }
  return { config, suggestions: CONFIG_KEYS.map((k) => suggestions.find((s) => s.key === k)!) }
}

/** Where an existing config disagrees with evidence-backed detection — for the `scan` note. */
export const configDisagreements = (config: BrainConfig, suggested: SuggestedConfig): Array<string> =>
  suggested.suggestions
    .filter((s) => s.basis === "detected" && getKey(config, s.key) !== s.value)
    .map((s) => `${s.key} is ${JSON.stringify(getKey(config, s.key))} but detection suggests ${JSON.stringify(s.value)} (${s.reason})`)
