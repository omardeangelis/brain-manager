import { describe, expect, it } from "vitest"
import { BRAIN_SCHEMA_FILES, type ManifestEntry, defaultRole, reconcileRoles } from "./manifest.js"
import { planUpgrade } from "./plan.js"

describe("defaultRole", () => {
  it("makes the Brain Schema files managed", () => {
    expect(defaultRole("brain/AGENTS.md")).toBe("managed")
    expect(defaultRole("brain/CLAUDE.md")).toBe("managed")
  })

  it("keeps the rest of brain/ as seed", () => {
    expect(defaultRole("brain/index.md")).toBe("seed")
    expect(defaultRole("brain/log.md")).toBe("seed")
    expect(defaultRole("brain/specs/auth/login/SPEC.md")).toBe("seed")
  })

  it("treats skills and agents as managed", () => {
    expect(defaultRole(".agents/skills/create-spec/SKILL.md")).toBe("managed")
    expect(defaultRole(".agents/agents/ux-advisor.md")).toBe("managed")
  })

  it("agrees with the BRAIN_SCHEMA_FILES set", () => {
    for (const p of BRAIN_SCHEMA_FILES) expect(defaultRole(p)).toBe("managed")
  })
})

describe("reconcileRoles", () => {
  const entry = (path: string, role: ManifestEntry["role"]): ManifestEntry => ({ path, role, hash: "h" })

  it("promotes a pre-split seed schema file to managed", () => {
    const out = reconcileRoles([entry("brain/AGENTS.md", "seed"), entry("brain/CLAUDE.md", "seed")])
    expect(out.every((f) => f.role === "managed")).toBe(true)
  })

  it("leaves genuine seed content untouched", () => {
    const out = reconcileRoles([entry("brain/index.md", "seed"), entry("brain/log.md", "seed")])
    expect(out.every((f) => f.role === "seed")).toBe(true)
  })

  it("is a no-op for already-managed entries", () => {
    const input = [entry("brain/AGENTS.md", "managed"), entry(".agents/skills/tdd/SKILL.md", "managed")]
    expect(reconcileRoles(input)).toEqual(input)
  })

  it("lets a pre-split schema file pick up a bundled update after reconciliation", () => {
    // An old install: brain/AGENTS.md recorded as seed, disk still matches what we
    // wrote (h1), the bundled version has moved on (h2).
    const old: Array<ManifestEntry> = [{ path: "brain/AGENTS.md", role: "seed", hash: "h1" }]

    const beforeReconcile = planUpgrade({
      manifestFiles: old,
      assetHashes: new Map([["brain/AGENTS.md", "h2"]]),
      diskHashes: new Map([["brain/AGENTS.md", "h1"]])
    })
    // As seed, the schema improvement would be ignored.
    expect(beforeReconcile.find((a) => a.path === "brain/AGENTS.md")?._tag).toBe("KeepLocal")

    const afterReconcile = planUpgrade({
      manifestFiles: reconcileRoles(old),
      assetHashes: new Map([["brain/AGENTS.md", "h2"]]),
      diskHashes: new Map([["brain/AGENTS.md", "h1"]])
    })
    // As managed, it updates — and a locally edited copy (disk = h3) would conflict, not clobber.
    expect(afterReconcile.find((a) => a.path === "brain/AGENTS.md")?._tag).toBe("Update")
  })
})
