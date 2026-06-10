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
  | { readonly _tag: "Orphan"; readonly path: string }

export interface UpgradeInput {
  readonly manifestFiles: ReadonlyArray<ManifestEntry>
  /** path -> normalized hash of the bundled (managed-scope) asset */
  readonly assetHashes: ReadonlyMap<string, string>
  /** path -> normalized hash of the file on disk, or null when missing */
  readonly diskHashes: ReadonlyMap<string, string | null>
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
      actions.push({ _tag: "Orphan", path: entry.path })
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
  for (const [path, assetHash] of input.assetHashes) {
    if (inManifest.has(path)) continue
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
