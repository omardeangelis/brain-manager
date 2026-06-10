import { describe, expect, it } from "vitest"
import {
  ADVISORS_END,
  ADVISORS_START,
  carryAdvisorsOver,
  extractAdvisorsBlock,
  isPlaceholderBlock,
  normalizeAdvisors,
  replaceAdvisorsBlock
} from "./advisors.js"
import { contentHash } from "./hash.js"

const skill = (block: string) =>
  `# Skill\n\n## Project Advisors\n\n${ADVISORS_START}\n${block}\n${ADVISORS_END}\n\n## Rest\n`

const PLACEHOLDER = "_No project advisor agents detected. List each here._"
const WIRED = "- **`db-advisor`** — schema tasks — delegate via Agent tool"

describe("advisors block", () => {
  it("extracts the content between markers", () => {
    expect(extractAdvisorsBlock(skill(WIRED))).toBe(WIRED)
    expect(extractAdvisorsBlock("no markers here")).toBeNull()
  })

  it("recognizes the placeholder", () => {
    expect(isPlaceholderBlock(PLACEHOLDER)).toBe(true)
    expect(isPlaceholderBlock("")).toBe(true)
    expect(isPlaceholderBlock(WIRED)).toBe(false)
  })

  it("replaces only the block, keeping markers and surroundings", () => {
    const replaced = replaceAdvisorsBlock(skill(PLACEHOLDER), WIRED)
    expect(replaced).toContain(ADVISORS_START)
    expect(replaced).toContain(WIRED)
    expect(replaced).not.toContain(PLACEHOLDER)
    expect(replaced).toContain("## Rest")
  })

  it("normalizes wired and placeholder variants to the same content", () => {
    expect(normalizeAdvisors(skill(WIRED))).toBe(normalizeAdvisors(skill(PLACEHOLDER)))
  })

  it("carries a wired block into the incoming version", () => {
    const incoming = skill(PLACEHOLDER).replace("## Rest", "## Rest v2")
    const merged = carryAdvisorsOver(skill(WIRED), incoming)
    expect(merged).toContain(WIRED)
    expect(merged).toContain("## Rest v2")
  })

  it("does not carry a placeholder block over", () => {
    const incoming = skill(PLACEHOLDER)
    expect(carryAdvisorsOver(skill(PLACEHOLDER), incoming)).toBe(incoming)
  })
})

describe("contentHash", () => {
  it("ignores advisor wiring but sees other edits", () => {
    expect(contentHash(skill(WIRED))).toBe(contentHash(skill(PLACEHOLDER)))
    expect(contentHash(skill(WIRED) + "local edit")).not.toBe(contentHash(skill(WIRED)))
  })

  it("hashes marker-free files as-is", () => {
    expect(contentHash("plain")).toBe(contentHash("plain"))
    expect(contentHash("plain")).not.toBe(contentHash("plain2"))
  })
})
