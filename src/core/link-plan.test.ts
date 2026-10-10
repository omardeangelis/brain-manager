import { describe, expect, it } from "vitest"
import { type DiskFact, type LinkAction, expectedLinks, planLink } from "./link-plan.js"
import { byId } from "./providers.js"

const claude = byId("claude")!
const opencode = byId("opencode")!
const cursor = byId("cursor")!

const run = (
  providers: Array<ReturnType<typeof byId>>,
  disk: Record<string, DiskFact>,
  opts: { currentSkillsDir?: string | null; force?: boolean } = {}
) =>
  planLink({
    providers: providers.filter((p): p is NonNullable<typeof p> => p !== undefined),
    currentSkillsDir: opts.currentSkillsDir ?? null,
    disk: new Map(Object.entries(disk)),
    force: opts.force ?? false
  })

const at = (actions: Array<LinkAction>, path: string): LinkAction | undefined =>
  actions.find((a) => "path" in a && a.path === path)
const has = (actions: Array<LinkAction>, tag: LinkAction["_tag"]) => actions.some((a) => a._tag === tag)

describe("planLink — fresh install", () => {
  it("creates the canonical skills + agents dirs, the router, and Claude's three symlinks", () => {
    const actions = run([claude], {})
    expect(has(actions, "MakeCanonicalSkills")).toBe(true)
    expect(has(actions, "MakeCanonicalAgents")).toBe(true)
    expect(has(actions, "MakeCanonicalRouter")).toBe(true)
    expect(at(actions, ".claude/skills")).toMatchObject({ _tag: "LinkSkills", target: "../.agents/skills" })
    expect(at(actions, ".claude/agents")).toMatchObject({ _tag: "LinkAgents", target: "../.agents/agents" })
    expect(at(actions, "CLAUDE.md")).toMatchObject({ _tag: "LinkRouter", target: "AGENTS.md" })
  })

  it("links a router-native skill tool's skills but adds no router or agents symlink", () => {
    const actions = run([opencode], {})
    expect(at(actions, ".opencode/skills")).toMatchObject({ _tag: "LinkSkills" })
    expect(has(actions, "LinkRouter")).toBe(false)
    expect(has(actions, "LinkAgents")).toBe(false)
  })

  it("skips a router-only provider's skills (no skills concept)", () => {
    const actions = run([cursor], {})
    expect(at(actions, ".cursor")).toMatchObject({ _tag: "Skip" })
    expect(has(actions, "LinkSkills")).toBe(false)
    expect(has(actions, "LinkRouter")).toBe(false)
  })
})

describe("planLink — idempotency", () => {
  it("reports correct existing symlinks as up-to-date", () => {
    const actions = run([claude], {
      ".agents/skills": { kind: "dir" },
      ".claude/skills": { kind: "symlink", target: "../.agents/skills" },
      ".agents/agents": { kind: "dir" },
      ".claude/agents": { kind: "symlink", target: "../.agents/agents" },
      "AGENTS.md": { kind: "file" },
      "CLAUDE.md": { kind: "symlink", target: "AGENTS.md" }
    })
    expect(at(actions, ".claude/skills")?._tag).toBe("AlreadyLinked")
    expect(at(actions, ".claude/agents")?._tag).toBe("AlreadyLinked")
    expect(at(actions, "CLAUDE.md")?._tag).toBe("AlreadyLinked")
    expect(has(actions, "MakeCanonicalSkills")).toBe(false)
    expect(has(actions, "MakeCanonicalAgents")).toBe(false)
    expect(has(actions, "MakeCanonicalRouter")).toBe(false)
  })
})

describe("planLink — legacy migration", () => {
  it("relocates a real .claude/skills to canonical and symlinks it back", () => {
    const actions = run(
      [claude],
      { ".claude/skills": { kind: "dir" }, "CLAUDE.md": { kind: "file" } },
      { currentSkillsDir: ".claude/skills" }
    )
    expect(actions.find((a) => a._tag === "MigrateSkills")).toMatchObject({ from: ".claude/skills", to: ".agents/skills" })
    expect(at(actions, ".claude/skills")).toMatchObject({ _tag: "LinkSkills", target: "../.agents/skills" })
    // a pre-existing CLAUDE.md seeds the canonical router, then is symlinked back
    expect(actions.find((a) => a._tag === "PromoteRouter")).toMatchObject({ from: "CLAUDE.md", to: "AGENTS.md" })
    expect(at(actions, "CLAUDE.md")).toMatchObject({ _tag: "LinkRouter", target: "AGENTS.md" })
  })
})

describe("planLink — conflicts", () => {
  it("conflicts on a real skills dir in the way (canonical already present)", () => {
    const actions = run([claude], {
      ".agents/skills": { kind: "dir" },
      ".claude/skills": { kind: "dir" }
    })
    expect(at(actions, ".claude/skills")?._tag).toBe("Conflict")
  })

  it("--force replaces the conflicting dir with a symlink", () => {
    const actions = run(
      [claude],
      { ".agents/skills": { kind: "dir" }, ".claude/skills": { kind: "dir" } },
      { force: true }
    )
    expect(at(actions, ".claude/skills")?._tag).toBe("LinkSkills")
  })

  it("conflicts on a real CLAUDE.md with its own content alongside a real AGENTS.md", () => {
    const actions = run([claude], {
      ".agents/skills": { kind: "dir" },
      ".claude/skills": { kind: "symlink", target: "../.agents/skills" },
      "AGENTS.md": { kind: "file" },
      "CLAUDE.md": { kind: "file" }
    })
    expect(at(actions, "CLAUDE.md")?._tag).toBe("Conflict")
  })

  it("re-points a symlink aimed at the wrong target", () => {
    const actions = run([claude], {
      ".agents/skills": { kind: "dir" },
      ".claude/skills": { kind: "symlink", target: "../somewhere/else" }
    })
    expect(at(actions, ".claude/skills")?._tag).toBe("Conflict")
  })
})

describe("planLink — router states", () => {
  const linkedSkills = {
    ".agents/skills": { kind: "dir" as const },
    ".claude/skills": { kind: "symlink" as const, target: "../.agents/skills" }
  }

  it("identical CLAUDE.md and AGENTS.md: links without --force (nothing is lost)", () => {
    const actions = run([claude], {
      ...linkedSkills,
      "AGENTS.md": { kind: "file", content: "# Rules\n\n- run `npm test`\n" },
      "CLAUDE.md": { kind: "file", content: "# Rules\r\n\r\n- run `npm test`\r\n" }
    })
    expect(at(actions, "CLAUDE.md")).toMatchObject({ _tag: "LinkRouter", target: "AGENTS.md" })
  })

  it("divergent CLAUDE.md: a conflict naming the CLAUDE.md-only headings and the similarity", () => {
    const actions = run([claude], {
      ...linkedSkills,
      "AGENTS.md": { kind: "file", content: "# Rules\n\n## Gates\n\n`npm test`\n" },
      "CLAUDE.md": { kind: "file", content: "# Rules\n\n## Gates\n\n`npm test`\n\n## Solid reactivity\n\n- no destructuring\n" }
    })
    const conflict = at(actions, "CLAUDE.md")
    expect(conflict?._tag).toBe("Conflict")
    expect(conflict && "why" in conflict ? conflict.why : "").toMatch(/CLAUDE\.md-only headings: "Solid reactivity"/)
    expect(conflict && "why" in conflict ? conflict.why : "").toMatch(/similarity 0\.\d\d/)
    expect(conflict && "why" in conflict ? conflict.why : "").toMatch(/reconcile into AGENTS\.md \(init-brain → router\.md\)/)
  })

  it("divergent CLAUDE.md with --force: still a conflict, never discarded", () => {
    const actions = run(
      [claude],
      {
        ...linkedSkills,
        "AGENTS.md": { kind: "file", content: "# A" },
        "CLAUDE.md": { kind: "file", content: "# B" }
      },
      { force: true }
    )
    const conflict = at(actions, "CLAUDE.md")
    expect(conflict?._tag).toBe("Conflict")
    expect(conflict && "why" in conflict ? conflict.why : "").toMatch(/refusing to discard differing CLAUDE\.md content/)
  })

  it("a CLAUDE.md symlink already pointing to AGENTS.md is up to date", () => {
    const actions = run([claude], {
      ...linkedSkills,
      "AGENTS.md": { kind: "file", content: "# Rules" },
      "CLAUDE.md": { kind: "symlink", target: "AGENTS.md", content: "# Rules" }
    })
    expect(at(actions, "CLAUDE.md")?._tag).toBe("AlreadyLinked")
  })

  it("reverse layout (AGENTS.md -> CLAUDE.md): promotes CLAUDE.md over the link, then links it back", () => {
    const actions = run([claude], {
      ...linkedSkills,
      "AGENTS.md": { kind: "symlink", target: "CLAUDE.md", content: "# Rules" },
      "CLAUDE.md": { kind: "file", content: "# Rules" }
    })
    expect(actions.find((a) => a._tag === "PromoteRouter")).toMatchObject({ from: "CLAUDE.md", to: "AGENTS.md" })
    expect(at(actions, "CLAUDE.md")).toMatchObject({ _tag: "LinkRouter", target: "AGENTS.md" })
    expect(has(actions, "MakeCanonicalRouter")).toBe(false)
  })
})

describe("expectedLinks", () => {
  it("lists skills + router links for the selection, skipping router-native and non-skill tools", () => {
    expect(expectedLinks([claude])).toEqual([
      { path: ".claude/skills", target: "../.agents/skills", kind: "skills" },
      { path: ".claude/agents", target: "../.agents/agents", kind: "agents" },
      { path: "CLAUDE.md", target: "AGENTS.md", kind: "router" }
    ])
    expect(expectedLinks([opencode])).toEqual([
      { path: ".opencode/skills", target: "../.agents/skills", kind: "skills" }
    ])
    expect(expectedLinks([cursor])).toEqual([])
  })
})
