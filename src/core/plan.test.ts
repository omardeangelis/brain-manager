import { describe, expect, it } from "vitest"
import type { ManifestEntry } from "./manifest.js"
import { ADVISORS_END, ADVISORS_START } from "./advisors.js"
import { emptiedDirCandidates, planRuleInputs, planUpgrade } from "./plan.js"

const managed = (path: string, hash: string): ManifestEntry => ({ path, role: "managed", hash })
const seed = (path: string, hash: string): ManifestEntry => ({ path, role: "seed", hash })

const plan = (
  manifestFiles: Array<ManifestEntry>,
  assets: Record<string, string>,
  disk: Record<string, string | null>,
  extra: { advisorContent?: Array<string>; seedSkillDirs?: Array<string> } = {}
) =>
  planUpgrade({
    manifestFiles,
    assetHashes: new Map(Object.entries(assets)),
    diskHashes: new Map(Object.entries(disk)),
    advisorContent: new Set(extra.advisorContent ?? []),
    seedSkillDirs: new Set(extra.seedSkillDirs ?? [])
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

})

describe("planUpgrade — managed files the package no longer ships", () => {
  it("an untouched managed file the package no longer ships is planned for removal", () => {
    const actions = plan([managed("gone", "h1")], {}, { gone: "h1" })
    expect(only(actions, "gone")._tag).toBe("Remove")
  })

  it("keeps an edited orphan on disk", () => {
    const actions = plan([managed("gone", "h1")], {}, { gone: "h2" })
    expect(only(actions, "gone")._tag).toBe("OrphanModified")
  })

  it("treats an orphan whose advisor block holds content as modified, though its hash matches", () => {
    const actions = plan([managed("gone", "h1")], {}, { gone: "h1" }, { advisorContent: ["gone"] })
    expect(only(actions, "gone")._tag).toBe("OrphanModified")
  })

  it("reports an orphan missing on disk without removing anything", () => {
    const actions = plan([managed("gone", "h1")], {}, { gone: null })
    expect(only(actions, "gone")._tag).toBe("OrphanMissing")
  })

  it("leaves seed entries the package no longer ships to the seed rules", () => {
    const actions = plan([seed("brain/old.md", "h1")], {}, { "brain/old.md": "h1" })
    expect(only(actions, "brain/old.md")._tag).toBe("KeepLocal")
  })
})

describe("planUpgrade — the seed-skill rule", () => {
  const dir = ".agents/skills/agent-browser"

  it("skips a new bundled path under a seed-owned skill folder", () => {
    const actions = plan(
      [seed(`${dir}/SKILL.md`, "h1")],
      { [`${dir}/SKILL.md`]: "h9", [`${dir}/LICENSE`]: "h2" },
      { [`${dir}/SKILL.md`]: "h1", [`${dir}/LICENSE`]: null },
      { seedSkillDirs: [dir] }
    )
    expect(only(actions, `${dir}/LICENSE`)._tag).toBe("SkipSeed")
    expect(only(actions, `${dir}/SKILL.md`)._tag).toBe("KeepLocal")
  })

  it("skips it even when a file already sits at that path", () => {
    const actions = plan([], { [`${dir}/LICENSE`]: "h2" }, { [`${dir}/LICENSE`]: "h3" }, { seedSkillDirs: [dir] })
    expect(only(actions, `${dir}/LICENSE`)._tag).toBe("SkipSeed")
  })

  it("installs a new bundled path under a managed skill folder", () => {
    const actions = plan(
      [managed(".agents/skills/tdd/SKILL.md", "h1")],
      { ".agents/skills/tdd/SKILL.md": "h1", ".agents/skills/tdd/new.md": "h2" },
      { ".agents/skills/tdd/SKILL.md": "h1", ".agents/skills/tdd/new.md": null },
      { seedSkillDirs: [dir] }
    )
    expect(only(actions, ".agents/skills/tdd/new.md")._tag).toBe("Install")
  })
})

describe("planRuleInputs", () => {
  const skills = ".agents/skills"

  it("lists only skill folders whose entries are all seed", () => {
    const { seedSkillDirs } = planRuleInputs({
      manifestFiles: [
        seed(`${skills}/agent-browser/SKILL.md`, "h"),
        seed(`${skills}/agent-browser/references/a.md`, "h"),
        managed(`${skills}/tdd/SKILL.md`, "h"),
        seed(`${skills}/mixed/SKILL.md`, "h"),
        managed(`${skills}/mixed/b.md`, "h"),
        seed("brain/index.md", "h")
      ],
      skillsDir: skills,
      diskContent: new Map()
    })
    expect([...seedSkillDirs]).toEqual([`${skills}/agent-browser`])
  })

  it("never lists a folder with no entries (a brand-new bundled skill)", () => {
    const { seedSkillDirs } = planRuleInputs({ manifestFiles: [], skillsDir: skills, diskContent: new Map() })
    expect(seedSkillDirs.size).toBe(0)
  })

  it("lists the paths whose raw content holds a non-placeholder advisor block", () => {
    const block = (inner: string) => `# Skill\n\n${ADVISORS_START}\n${inner}\n${ADVISORS_END}\n`
    const { advisorContent } = planRuleInputs({
      manifestFiles: [],
      skillsDir: skills,
      diskContent: new Map<string, string | null>([
        ["wired", block("- ux-advisor — UX flows")],
        ["placeholder", block("_No project advisor agents detected yet._")],
        ["empty", block("")],
        ["plain", "# no markers\n"],
        ["missing", null]
      ])
    })
    expect([...advisorContent]).toEqual(["wired"])
  })
})

describe("emptiedDirCandidates", () => {
  const roots = [".agents/skills", ".agents/agents", "brain"]

  it("walks up to and including the skill folder, deepest first", () => {
    expect(emptiedDirCandidates([".agents/skills/old/references/deep/x.md", ".agents/skills/old/SKILL.md"], roots)).toEqual([
      ".agents/skills/old/references/deep",
      ".agents/skills/old/references",
      ".agents/skills/old"
    ])
  })

  it("never offers a root or anything outside the roots", () => {
    expect(emptiedDirCandidates([".agents/agents/old.md", "brain/AGENTS.md", "elsewhere/x.md"], roots)).toEqual([])
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
