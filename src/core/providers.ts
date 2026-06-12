/**
 * The provider registry — the single source of truth for which AI coding tools
 * brain-manager can wire into a project, and what each one needs on disk.
 *
 * Provider-agnosticism is two layers (see the init-brain skill's
 * references/providers.md):
 *
 *  - SKILLS — only tools that read the `SKILL.md` format (Claude Code, OpenCode,
 *    Qwen, Zed) get a skills symlink. The real suite lives once in the canonical
 *    `.agents/skills`; each capable provider gets `<provider>/skills ->
 *    ../.agents/skills` so the tool finds it where it natively looks.
 *
 *  - ROUTER — the root `AGENTS.md` is canonical. The ~20 tools that read
 *    `AGENTS.md` natively need nothing extra. The holdouts (Claude reads
 *    `CLAUDE.md`, not `AGENTS.md`) get `<rootFile> -> AGENTS.md`.
 *
 * This module is pure data + pure helpers so it can be unit-tested without a
 * filesystem; the FS mechanics live in the linker service and `link-plan.ts`.
 */

export interface Provider {
  readonly id: string
  readonly label: string
  /** Marker directory used to DETECT the tool in a repo (null = root-file only). */
  readonly dir: string | null
  /**
   * Skills directory to symlink at, relative to the repo root, or null when the
   * tool has no skills concept (router-only). e.g. ".claude/skills".
   */
  readonly skills: string | null
  /**
   * The tool's native root instruction file, or null when it only reads
   * `AGENTS.md`. e.g. "CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md".
   */
  readonly rootFile: string | null
  /** Whether the tool reads the canonical root `AGENTS.md` natively (→ no router symlink needed). */
  readonly readsAgentsMd: boolean
}

/** Real skill files live here; every provider skills dir symlinks into it. */
export const CANONICAL_SKILLS_DIR = ".agents/skills"
/** Canonical root instruction file; holdout root files symlink to it. */
export const CANONICAL_ROUTER = "AGENTS.md"

export const PROVIDERS: ReadonlyArray<Provider> = [
  // --- skill-capable: read the shared SKILL.md format ---
  { id: "claude", label: "Claude Code", dir: ".claude", skills: ".claude/skills", rootFile: "CLAUDE.md", readsAgentsMd: false },
  { id: "opencode", label: "OpenCode", dir: ".opencode", skills: ".opencode/skills", rootFile: null, readsAgentsMd: true },
  { id: "qwen", label: "Qwen Code", dir: ".qwen", skills: ".qwen/skills", rootFile: "QWEN.md", readsAgentsMd: true },
  // Zed has a SKILL.md concept (v1.4+) but its project skills path is not yet
  // confirmed from docs; wire it as router-only until verified, then set `skills`.
  { id: "zed", label: "Zed", dir: ".zed", skills: null, rootFile: null, readsAgentsMd: true },
  // --- router-only: no skills concept; read a root instruction file ---
  { id: "codex", label: "OpenAI Codex CLI", dir: ".codex", skills: null, rootFile: null, readsAgentsMd: true },
  { id: "cursor", label: "Cursor", dir: ".cursor", skills: null, rootFile: null, readsAgentsMd: true },
  { id: "copilot", label: "GitHub Copilot", dir: ".github", skills: null, rootFile: ".github/copilot-instructions.md", readsAgentsMd: true },
  { id: "gemini", label: "Gemini CLI", dir: ".gemini", skills: null, rootFile: "GEMINI.md", readsAgentsMd: true },
  { id: "windsurf", label: "Windsurf", dir: ".windsurf", skills: null, rootFile: null, readsAgentsMd: true },
  { id: "cline", label: "Cline", dir: ".clinerules", skills: null, rootFile: null, readsAgentsMd: true },
  { id: "roo", label: "Roo Code", dir: ".roo", skills: null, rootFile: null, readsAgentsMd: true },
  { id: "kilo", label: "Kilo Code", dir: ".kilocode", skills: null, rootFile: null, readsAgentsMd: true },
  { id: "amp", label: "Amp", dir: ".amp", skills: null, rootFile: null, readsAgentsMd: true },
  { id: "augment", label: "Augment Code", dir: ".augment", skills: null, rootFile: null, readsAgentsMd: true },
  { id: "continue", label: "Continue.dev", dir: ".continue", skills: null, rootFile: null, readsAgentsMd: true }
]

export const byId = (id: string): Provider | undefined =>
  PROVIDERS.find((p) => p.id === id.toLowerCase())

/** The provider whose native skills directory is `dir` (e.g. ".claude/skills" → claude). */
export const providerForSkillsDir = (dir: string): Provider | undefined =>
  PROVIDERS.find((p) => p.skills === dir)

/** De-duplicate a provider list by id, preserving first-seen order. */
export const uniqueProviders = (providers: ReadonlyArray<Provider>): Array<Provider> => {
  const seen = new Set<string>()
  const out: Array<Provider> = []
  for (const p of providers) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
  }
  return out
}

/** A provider participates in the skills layer when it reads the SKILL.md format. */
export const skillCapable = (p: Provider): boolean => p.skills !== null

/**
 * A provider needs a root-file symlink when it has its OWN root file that is not
 * the canonical `AGENTS.md` AND it does not read `AGENTS.md` natively. In
 * practice this is Claude (`CLAUDE.md`); everyone else reads `AGENTS.md` for free.
 */
export const needsRouterSymlink = (p: Provider): boolean =>
  p.rootFile !== null && p.rootFile !== CANONICAL_ROUTER && !p.readsAgentsMd

export interface ParseResult {
  readonly providers: ReadonlyArray<Provider>
  readonly unknown: ReadonlyArray<string>
}

/** Parse a comma-separated provider id list, partitioning known from unknown ids (dedup, order-preserving). */
export const parseProviders = (csv: string): ParseResult => {
  const providers: Array<Provider> = []
  const unknown: Array<string> = []
  const seen = new Set<string>()
  for (const raw of csv.split(",")) {
    const id = raw.trim().toLowerCase()
    if (id === "" || seen.has(id)) continue
    seen.add(id)
    const p = byId(id)
    if (p) providers.push(p)
    else unknown.push(id)
  }
  return { providers, unknown }
}

/**
 * POSIX relative symlink target from a link path to a target path, both
 * repo-root-relative. e.g. (".claude/skills", ".agents/skills") -> "../.agents/skills";
 * ("CLAUDE.md", "AGENTS.md") -> "AGENTS.md".
 */
export const relSymlinkTarget = (linkPath: string, targetPath: string): string => {
  const slash = linkPath.lastIndexOf("/")
  const from = slash === -1 ? [] : linkPath.slice(0, slash).split("/")
  const to = targetPath.split("/")
  let i = 0
  while (i < from.length && i < to.length && from[i] === to[i]) i++
  const parts = [...from.slice(i).map(() => ".."), ...to.slice(i)]
  return parts.length === 0 ? "." : parts.join("/")
}
