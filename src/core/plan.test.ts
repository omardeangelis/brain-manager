import { describe, expect, it } from "vitest"
import type { ManifestEntry } from "./manifest.js"
import { planUpgrade } from "./plan.js"

const managed = (path: string, hash: string): ManifestEntry => ({ path, role: "managed", hash })
const seed = (path: string, hash: string): ManifestEntry => ({ path, role: "seed", hash })

const plan = (
  manifestFiles: Array<ManifestEntry>,
  assets: Record<string, string>,
  disk: Record<string, string | null>
) =>
  planUpgrade({
    manifestFiles,
    assetHashes: new Map(Object.entries(assets)),
    diskHashes: new Map(Object.entries(disk))
  })

const only = (actions: ReturnType<typeof plan>, path: string) => {
  const matches = actions.filter((a) => a.path === path)
  expect(matches).toHaveLength(1)
  return matches[0]!
}

describe("planUpgrade — managed files", () => {
  it("updates when disk matches manifest and the asset changed", () => {
    const actions = plan([managed("a", "h1")], { a: "h2" }, { a: "h1" })
    expect(only(actions, "a")._tag).toBe("Update")
  })

  it("is up to date when disk already matches the asset", () => {
    const actions = plan([managed("a", "h1")], { a: "h2" }, { a: "h2" })
    expect(only(actions, "a")._tag).toBe("UpToDate")
  })

  it("conflicts when disk matches neither manifest nor asset", () => {
    const actions = plan([managed("a", "h1")], { a: "h2" }, { a: "h3" })
    expect(only(actions, "a")._tag).toBe("Conflict")
  })

  it("restores missing managed files", () => {
    const actions = plan([managed("a", "h1")], { a: "h1" }, { a: null })
    expect(only(actions, "a")).toMatchObject({ _tag: "Restore", role: "managed" })
  })

  it("flags manifest entries the package no longer ships as orphans", () => {
    const actions = plan([managed("gone", "h1")], {}, { gone: "h1" })
    expect(only(actions, "gone")._tag).toBe("Orphan")
  })
})

describe("planUpgrade — seed files", () => {
  it("keeps existing seed files even when the asset changed", () => {
    const actions = plan([seed("brain/index.md", "h1")], { "brain/index.md": "h9" }, { "brain/index.md": "h5" })
    expect(only(actions, "brain/index.md")._tag).toBe("KeepLocal")
  })

  it("restores missing seed files", () => {
    const actions = plan([seed("brain/log.md", "h1")], { "brain/log.md": "h1" }, { "brain/log.md": null })
    expect(only(actions, "brain/log.md")).toMatchObject({ _tag: "Restore", role: "seed" })
  })
})

describe("planUpgrade — files new to the manifest", () => {
  it("installs asset files missing from disk", () => {
    const actions = plan([], { fresh: "h1" }, { fresh: null })
    expect(only(actions, "fresh")._tag).toBe("Install")
  })

  it("adopts an on-disk file identical to the asset as up to date", () => {
    const actions = plan([], { same: "h1" }, { same: "h1" })
    expect(only(actions, "same")._tag).toBe("UpToDate")
  })

  it("conflicts on an unknown file that differs from the asset", () => {
    const actions = plan([], { diff: "h1" }, { diff: "h2" })
    expect(only(actions, "diff")._tag).toBe("Conflict")
  })
})
