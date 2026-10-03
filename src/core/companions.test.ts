import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { agentName, agentSkills, companionAgents } from "./companions.js"

const agent = (frontmatter: string, body = "Body.\n") => `---\n${frontmatter}\n---\n\n${body}`

describe("agentSkills", () => {
  it("reads a YAML block list", () => {
    expect(agentSkills(agent('name: "a"\nskills:\n  - design-engineering\n  - "tdd"\nmodel: inherit'))).toEqual([
      "design-engineering",
      "tdd"
    ])
  })

  it("reads inline lists, bracketed or not", () => {
    expect(agentSkills(agent("name: a\nskills: [one, 'two']"))).toEqual(["one", "two"])
    expect(agentSkills(agent("name: a\nskills: one, two"))).toEqual(["one", "two"])
  })

  it("is empty without the field or without frontmatter", () => {
    expect(agentSkills(agent("name: a\ntools: Read"))).toEqual([])
    expect(agentSkills("# no frontmatter\nskills:\n  - x\n")).toEqual([])
  })

  it("ignores a skills: line in the body", () => {
    expect(agentSkills(agent("name: a", "skills:\n  - not-frontmatter\n"))).toEqual([])
  })
})

describe("companionAgents", () => {
  it("maps each skill to the agents that declare it", () => {
    const agents = new Map([
      ["b.md", { content: agent("name: b\nskills:\n  - shared") }],
      ["a.md", { content: agent("name: a\nskills:\n  - shared\n  - solo") }],
      ["c.md", { content: agent("name: c") }]
    ])
    const map = companionAgents(agents)
    expect(map.get("shared")).toEqual(["a.md", "b.md"])
    expect(map.get("solo")).toEqual(["a.md"])
    expect(map.size).toBe(2)
    expect(agentName("a.md")).toBe("a")
  })

  it("links the shipped design-engineer agent to the design-engineering skill", () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
    const content = fs.readFileSync(path.join(root, "assets", "agents", "design-engineer.md"), "utf8")
    expect(agentSkills(content)).toEqual(["design-engineering"])
  })
})
