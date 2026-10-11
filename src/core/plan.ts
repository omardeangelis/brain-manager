import { extractAdvisorsBlock, isPlaceholderBlock } from "./advisors.js"
import type { ManifestEntry } from "./manifest.js"

/**
 * Pure upgrade planner. Compares three views of every file — the manifest
 * (what we installed), the disk (what is there now), the bundled assets (what
 * this package version ships) — and decides what `upgrade` should do.
 */

export type UpgradeAction =
  | { readonly _tag: "Install"; readonly path: string }
  | { readonly _tag: "Update"; readonly path: string }
  | { readonly _tag: "Restore"; readonly path: string; readonly role: "managed" | "seed" }
  | { readonly _tag: "UpToDate"; readonly path: string }
  | { readonly _tag: "KeepLocal"; readonly path: string }
  | { readonly _tag: "Conflict"; readonly path: string }
  /** Managed, no longer shipped, untouched since install: safe to delete. */
  | { readonly _tag: "Remove"; readonly path: string }
  /** Managed, no longer shipped, edited (or advisor-wired): left on disk, never deleted. */
  | { readonly _tag: "OrphanModified"; readonly path: string }
  /** Managed, no longer shipped, already gone from disk. */
  | { readonly _tag: "OrphanMissing"; readonly path: string }
  /** A newly shipped path inside a project-owned (all-`seed`) skill folder: not installed. */
  | { readonly _tag: "SkipSeed"; readonly path: string }

export interface UpgradeInput {
  readonly manifestFiles: ReadonlyArray<ManifestEntry>
  /** path -> normalized hash of the bundled (managed-scope) asset */
  readonly assetHashes: ReadonlyMap<string, string>
  /** path -> normalized hash of the file on disk, or null when missing */
  readonly diskHashes: ReadonlyMap<string, string | null>
  /**
   * Paths whose raw disk content holds a Project Advisors block with content.
   * The hashes normalize that block away, so only this set shows the edit.
   */
  readonly advisorContent: ReadonlySet<string>
  /** Skill folders whose manifest entries are all `seed` (a project-owned copy). */
  readonly seedSkillDirs: ReadonlySet<string>
}

export const planUpgrade = (input: UpgradeInput): Array<UpgradeAction> => {
  const actions: Array<UpgradeAction> = []
  const inManifest = new Map(input.manifestFiles.map((f) => [f.path, f]))

  for (const entry of input.manifestFiles) {
    const disk = input.diskHashes.get(entry.path) ?? null
    const asset = input.assetHashes.get(entry.path)

    if (entry.role === "seed") {
      actions.push(
        disk === null
          ? { _tag: "Restore", path: entry.path, role: "seed" }
          : { _tag: "KeepLocal", path: entry.path }
      )
      continue
    }

    // managed
    if (asset === undefined) {
      // No longer shipped. Deleted only when provably ours and untouched.
      if (disk === null) {
        actions.push({ _tag: "OrphanMissing", path: entry.path })
      } else if (disk === entry.hash && !input.advisorContent.has(entry.path)) {
        actions.push({ _tag: "Remove", path: entry.path })
      } else {
        actions.push({ _tag: "OrphanModified", path: entry.path })
      }
    } else if (disk === null) {
      actions.push({ _tag: "Restore", path: entry.path, role: "managed" })
    } else if (disk === asset) {
      actions.push({ _tag: "UpToDate", path: entry.path })
    } else if (disk === entry.hash) {
      actions.push({ _tag: "Update", path: entry.path })
    } else {
      actions.push({ _tag: "Conflict", path: entry.path })
    }
  }

  // Files the new package version ships that the manifest has never seen.
  // A project-owned skill folder never receives them.
  const seedOwned = (path: string): boolean =>
    [...input.seedSkillDirs].some((dir) => path.startsWith(`${dir}/`))
  for (const [path, assetHash] of input.assetHashes) {
    if (inManifest.has(path)) continue
    if (seedOwned(path)) {
      actions.push({ _tag: "SkipSeed", path })
      continue
    }
    const disk = input.diskHashes.get(path) ?? null
    if (disk === null) {
      actions.push({ _tag: "Install", path })
    } else if (disk === assetHash) {
      actions.push({ _tag: "UpToDate", path })
    } else {
      actions.push({ _tag: "Conflict", path })
    }
  }

  return actions.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * The two rule inputs of `planUpgrade` that the hashes cannot carry, computed
 * the same way for `upgrade` and `doctor`:
 * - `seedSkillDirs`: each skill folder (`<skillsDir>/<name>`) that has at least
 *   one manifest entry, all of them `seed`. A folder with no entry (a skill
 *   this version ships for the first time) is never in the set.
 * - `advisorContent`: each path whose raw disk content holds a Project
 *   Advisors block other than the placeholder.
 */
export const planRuleInputs = (input: {
  readonly manifestFiles: ReadonlyArray<ManifestEntry>
  readonly skillsDir: string
  readonly diskContent: ReadonlyMap<string, string | null>
}): { readonly seedSkillDirs: ReadonlySet<string>; readonly advisorContent: ReadonlySet<string> } => {
  const allSeed = new Map<string, boolean>()
  const prefix = `${input.skillsDir}/`
  for (const entry of input.manifestFiles) {
    if (!entry.path.startsWith(prefix)) continue
    const rest = entry.path.slice(prefix.length)
    const slash = rest.indexOf("/")
    if (slash <= 0) continue
    const dir = `${prefix}${rest.slice(0, slash)}`
    allSeed.set(dir, (allSeed.get(dir) ?? true) && entry.role === "seed")
  }
  const seedSkillDirs = new Set([...allSeed].filter(([, seed]) => seed).map(([dir]) => dir))

  const advisorContent = new Set<string>()
  for (const [path, content] of input.diskContent) {
    if (content === null) continue
    const block = extractAdvisorsBlock(content)
    if (block !== null && !isPlaceholderBlock(block)) advisorContent.add(path)
  }
  return { seedSkillDirs, advisorContent }
}

/**
 * Folders a `Remove` may have left empty: every ancestor of a removed path
 * strictly below one of `roots` (so up to and including a skill folder, never
 * the skills, agents or brain directory itself), deepest first. The caller
 * removes the ones that are actually empty, in this order.
 */
export const emptiedDirCandidates = (
  removed: ReadonlyArray<string>,
  roots: ReadonlyArray<string>
): Array<string> => {
  const dirs = new Set<string>()
  for (const path of removed) {
    const root = roots.find((r) => path.startsWith(`${r}/`))
    if (root === undefined) continue
    let dir = path.slice(0, path.lastIndexOf("/"))
    while (dir.length > root.length && dir.startsWith(`${root}/`)) {
      dirs.add(dir)
      dir = dir.slice(0, dir.lastIndexOf("/"))
    }
  }
  const depth = (d: string) => d.split("/").length
  return [...dirs].sort((a, b) => depth(b) - depth(a) || a.localeCompare(b))
}
