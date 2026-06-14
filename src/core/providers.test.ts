import { describe, expect, it } from "vitest"
import {
  CANONICAL_AGENTS_DIR,
  CANONICAL_ROUTER,
  CANONICAL_SKILLS_DIR,
  PROVIDERS,
  agentCapable,
  byId,
  needsRouterSymlink,
  parseProviders,
  providerForSkillsDir,
  relSymlinkTarget,
  skillCapable,
  uniqueProviders
} from "./providers.js"

describe("registry", () => {
  it("has unique ids", () => {
    const ids = PROVIDERS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("marks exactly the SKILL.md tools as skill-capable", () => {
    const capable = PROVIDERS.filter(skillCapable).map((p) => p.id)
    expect(capable).toEqual(expect.arrayContaining(["claude", "opencode", "qwen"]))
    expect(capable).not.toContain("codex")
    expect(capable).not.toContain("cursor")
  })

  it("only Claude needs a router symlink (everyone else reads AGENTS.md natively)", () => {
    const needing = PROVIDERS.filter(needsRouterSymlink).map((p) => p.id)
    expect(needing).toEqual(["claude"])
  })

  it("marks only Claude as agent-capable (the one tool with the subagent format)", () => {
    const capable = PROVIDERS.filter(agentCapable).map((p) => p.id)
    expect(capable).toEqual(["claude"])
    expect(byId("claude")?.agents).toBe(".claude/agents")
    expect(byId("opencode")?.agents ?? null).toBeNull()
  })

  it("looks providers up by id (case-insensitive) and by skills dir", () => {
    expect(byId("CLAUDE")?.id).toBe("claude")
    expect(byId("nope")).toBeUndefined()
    expect(providerForSkillsDir(".claude/skills")?.id).toBe("claude")
    expect(providerForSkillsDir(".agents/skills")).toBeUndefined()
  })
})

describe("parseProviders", () => {
  it("partitions known from unknown ids, dedupes, preserves order", () => {
    const { providers, unknown } = parseProviders("cursor, claude ,claude,bogus")
    expect(providers.map((p) => p.id)).toEqual(["cursor", "claude"])
    expect(unknown).toEqual(["bogus"])
  })

  it("ignores blanks", () => {
    const { providers, unknown } = parseProviders(" , ,claude")
    expect(providers.map((p) => p.id)).toEqual(["claude"])
    expect(unknown).toEqual([])
  })
})

describe("uniqueProviders", () => {
  it("dedupes by id keeping first occurrence", () => {
    const claude = byId("claude")!
    const cursor = byId("cursor")!
    expect(uniqueProviders([claude, cursor, claude]).map((p) => p.id)).toEqual(["claude", "cursor"])
  })
})

describe("relSymlinkTarget", () => {
  it("points a nested skills dir up to the canonical one", () => {
    expect(relSymlinkTarget(".claude/skills", CANONICAL_SKILLS_DIR)).toBe("../.agents/skills")
    expect(relSymlinkTarget(".opencode/skills", CANONICAL_SKILLS_DIR)).toBe("../.agents/skills")
  })

  it("points a nested agents dir up to the canonical one", () => {
    expect(relSymlinkTarget(".claude/agents", CANONICAL_AGENTS_DIR)).toBe("../.agents/agents")
  })

  it("points a root file at the canonical router in the same dir", () => {
    expect(relSymlinkTarget("CLAUDE.md", CANONICAL_ROUTER)).toBe("AGENTS.md")
  })

  it("handles a file nested one level down", () => {
    expect(relSymlinkTarget(".github/copilot-instructions.md", CANONICAL_ROUTER)).toBe("../AGENTS.md")
  })
})
