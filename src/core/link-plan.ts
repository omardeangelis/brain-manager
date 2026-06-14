import {
  CANONICAL_AGENTS_DIR,
  CANONICAL_ROUTER,
  CANONICAL_SKILLS_DIR,
  type Provider,
  agentCapable,
  needsRouterSymlink,
  relSymlinkTarget,
  skillCapable
} from "./providers.js"

/**
 * Pure planner for `brain link` (and the layout migration inside `brain upgrade`).
 * Mirrors `plan.ts`: it takes a snapshot of the chosen providers plus the disk
 * state, and decides the symlink/move actions to reach the `.agents/`-canonical
 * layout. All FS effects are executed elsewhere (the linker service) so this
 * stays unit-testable.
 *
 * The planner reasons about the POST-migration state of the one dir it moves
 * (`migratedFrom`) and the one root file it promotes (`promotedFrom`), so a
 * real `.claude/skills` that is being relocated to canonical is then turned into
 * a symlink in the same plan rather than reported as a conflict.
 */

export type PathKind = "absent" | "file" | "dir" | "symlink"

export interface DiskFact {
  readonly kind: PathKind
  /** The symlink's stored (relative) target — present only when kind === "symlink". */
  readonly target?: string
}

export interface LinkInput {
  readonly providers: ReadonlyArray<Provider>
  /** Where the real skills currently live (manifest.skillsDir), or null when fresh. */
  readonly currentSkillsDir: string | null
  /** Disk facts for every relevant path, keyed by repo-root-relative path. */
  readonly disk: ReadonlyMap<string, DiskFact>
  /** Replace a conflicting real dir/file or wrong symlink with the intended link. */
  readonly force: boolean
}

export type LinkAction =
  | { readonly _tag: "MigrateSkills"; readonly from: string; readonly to: string }
  | { readonly _tag: "MakeCanonicalSkills"; readonly path: string }
  | { readonly _tag: "LinkSkills"; readonly provider: string; readonly path: string; readonly target: string }
  | { readonly _tag: "MakeCanonicalAgents"; readonly path: string }
  | { readonly _tag: "LinkAgents"; readonly provider: string; readonly path: string; readonly target: string }
  | { readonly _tag: "PromoteRouter"; readonly from: string; readonly to: string }
  | { readonly _tag: "MakeCanonicalRouter"; readonly path: string }
  | { readonly _tag: "LinkRouter"; readonly provider: string; readonly path: string; readonly target: string }
  | { readonly _tag: "AlreadyLinked"; readonly path: string }
  | { readonly _tag: "Conflict"; readonly path: string; readonly why: string }
  | { readonly _tag: "Skip"; readonly provider: string; readonly path: string; readonly why: string }

export const planLink = (input: LinkInput): Array<LinkAction> => {
  const { currentSkillsDir, disk, force, providers } = input
  const actions: Array<LinkAction> = []
  const factOf = (p: string): DiskFact => disk.get(p) ?? { kind: "absent" }

  // --- skills: establish the canonical dir ---------------------------------
  const canon = CANONICAL_SKILLS_DIR
  const canonAbsent = factOf(canon).kind === "absent"
  // Legacy install: real skills live elsewhere and canonical does not exist yet.
  const migratedFrom =
    canonAbsent &&
    currentSkillsDir !== null &&
    currentSkillsDir !== canon &&
    factOf(currentSkillsDir).kind === "dir"
      ? currentSkillsDir
      : null

  if (canonAbsent) {
    if (migratedFrom !== null) actions.push({ _tag: "MigrateSkills", from: migratedFrom, to: canon })
    else actions.push({ _tag: "MakeCanonicalSkills", path: canon })
  }

  // --- skills: per-provider symlinks ---------------------------------------
  for (const p of providers) {
    if (!skillCapable(p)) {
      actions.push({
        _tag: "Skip",
        provider: p.id,
        path: p.dir ?? p.id,
        why: "no skills concept — covered by the AGENTS.md router"
      })
      continue
    }
    const linkPath = p.skills!
    if (linkPath === canon) {
      actions.push({ _tag: "AlreadyLinked", path: linkPath })
      continue
    }
    const target = relSymlinkTarget(linkPath, canon)
    const fact = factOf(linkPath)
    if (fact.kind === "symlink") {
      if (fact.target === target) actions.push({ _tag: "AlreadyLinked", path: linkPath })
      else if (force) actions.push({ _tag: "LinkSkills", provider: p.id, path: linkPath, target })
      else actions.push({ _tag: "Conflict", path: linkPath, why: `symlink points to ${fact.target ?? "?"}, expected ${target}` })
    } else if (fact.kind === "absent" || linkPath === migratedFrom) {
      // absent, or just relocated to canonical → now safe to point a symlink here
      actions.push({ _tag: "LinkSkills", provider: p.id, path: linkPath, target })
    } else if (force) {
      actions.push({ _tag: "LinkSkills", provider: p.id, path: linkPath, target })
    } else {
      actions.push({ _tag: "Conflict", path: linkPath, why: `real ${fact.kind} in the way — refusing to replace (use --force)` })
    }
  }

  // --- router: establish the canonical AGENTS.md ---------------------------
  const router = CANONICAL_ROUTER
  // Holdout root files present as real files that could seed the canonical router.
  const promotable = providers
    .map((p) => p.rootFile)
    .filter((f): f is string => f !== null && f !== router && factOf(f).kind === "file")
  const promotedFrom: string | null =
    factOf(router).kind === "absent" ? (promotable[0] ?? null) : null

  if (factOf(router).kind === "absent") {
    if (promotedFrom !== null) actions.push({ _tag: "PromoteRouter", from: promotedFrom, to: router })
    else actions.push({ _tag: "MakeCanonicalRouter", path: router })
  }

  // --- router: per-provider holdout symlinks -------------------------------
  for (const p of providers) {
    if (!needsRouterSymlink(p)) continue
    const linkPath = p.rootFile!
    const target = relSymlinkTarget(linkPath, router)
    const fact = factOf(linkPath)
    if (fact.kind === "symlink") {
      if (fact.target === target) actions.push({ _tag: "AlreadyLinked", path: linkPath })
      else if (force) actions.push({ _tag: "LinkRouter", provider: p.id, path: linkPath, target })
      else actions.push({ _tag: "Conflict", path: linkPath, why: `symlink points to ${fact.target ?? "?"}, expected ${target}` })
    } else if (fact.kind === "absent" || linkPath === promotedFrom) {
      // absent, or its content was just promoted into AGENTS.md → link it back
      actions.push({ _tag: "LinkRouter", provider: p.id, path: linkPath, target })
    } else if (force) {
      actions.push({ _tag: "LinkRouter", provider: p.id, path: linkPath, target })
    } else {
      actions.push({
        _tag: "Conflict",
        path: linkPath,
        why: `real file with its own content — reconcile it into ${router} first (or use --force)`
      })
    }
  }

  // --- agents: establish the canonical dir + per-provider symlinks ---------
  // No legacy migration: the agents layer is newer than any pre-`.agents/`
  // install, so there is never a real agents dir to relocate.
  const agentsCanon = CANONICAL_AGENTS_DIR
  if (factOf(agentsCanon).kind === "absent") {
    actions.push({ _tag: "MakeCanonicalAgents", path: agentsCanon })
  }
  for (const p of providers) {
    if (!agentCapable(p)) continue
    const linkPath = p.agents!
    if (linkPath === agentsCanon) {
      actions.push({ _tag: "AlreadyLinked", path: linkPath })
      continue
    }
    const target = relSymlinkTarget(linkPath, agentsCanon)
    const fact = factOf(linkPath)
    if (fact.kind === "symlink") {
      if (fact.target === target) actions.push({ _tag: "AlreadyLinked", path: linkPath })
      else if (force) actions.push({ _tag: "LinkAgents", provider: p.id, path: linkPath, target })
      else actions.push({ _tag: "Conflict", path: linkPath, why: `symlink points to ${fact.target ?? "?"}, expected ${target}` })
    } else if (fact.kind === "absent" || force) {
      actions.push({ _tag: "LinkAgents", provider: p.id, path: linkPath, target })
    } else {
      actions.push({ _tag: "Conflict", path: linkPath, why: `real ${fact.kind} in the way — refusing to replace (use --force)` })
    }
  }

  return actions
}

/**
 * The symlinks that SHOULD exist for a provider selection, independent of what
 * was just created — used to (re)write `manifest.links` idempotently.
 */
export const expectedLinks = (
  providers: ReadonlyArray<Provider>
): Array<{ readonly path: string; readonly target: string; readonly kind: "skills" | "router" | "agents" }> => {
  const links: Array<{ path: string; target: string; kind: "skills" | "router" | "agents" }> = []
  for (const p of providers) {
    if (skillCapable(p) && p.skills !== CANONICAL_SKILLS_DIR) {
      links.push({ path: p.skills!, target: relSymlinkTarget(p.skills!, CANONICAL_SKILLS_DIR), kind: "skills" })
    }
    if (agentCapable(p) && p.agents !== CANONICAL_AGENTS_DIR) {
      links.push({ path: p.agents!, target: relSymlinkTarget(p.agents!, CANONICAL_AGENTS_DIR), kind: "agents" })
    }
    if (needsRouterSymlink(p)) {
      links.push({ path: p.rootFile!, target: relSymlinkTarget(p.rootFile!, CANONICAL_ROUTER), kind: "router" })
    }
  }
  return links
}
