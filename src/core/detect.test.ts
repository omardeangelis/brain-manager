import { describe, expect, it } from "vitest"
import { defaultConfig } from "./config.js"
import {
  type ProjectFindings,
  type RouterFinding,
  configDisagreements,
  frontmatterType,
  personaCandidates,
  reviewLayout,
  suggestConfig,
  techDebtStores
} from "./detect.js"
import { pertinenceSignals } from "./router.js"

describe("personaCandidates", () => {
  it("finds a dedicated file by name or by frontmatter type", () => {
    expect(
      personaCandidates([
        { path: "brain/personas.md", content: "# Personas" },
        { path: "docs/users.md", content: "---\ntype: personas\n---\n# Who uses it" },
        { path: "brain/index.md", content: "---\ntype: index\n---\n" }
      ])
    ).toEqual([
      { path: "brain/personas.md", kind: "file" },
      { path: "docs/users.md", kind: "file" }
    ])
  })

  it("finds a persona heading inside an agent, the router or a constitution", () => {
    expect(
      personaCandidates([
        { path: ".claude/agents/ux-flow-strategist.md", content: "# Agent\n\n## The four Acme personas\n\n### Freelance" },
        { path: "CLAUDE.md", content: "# Rules\n\n## Personas\n" },
        { path: "brain/specs/CONSTITUTION.md", content: "# Constitution\n\n## Target persona\n" }
      ])
    ).toEqual([
      { path: ".claude/agents/ux-flow-strategist.md", kind: "section", heading: "The four Acme personas" },
      { path: "CLAUDE.md", kind: "section", heading: "Personas" },
      { path: "brain/specs/CONSTITUTION.md", kind: "section", heading: "Target persona" }
    ])
  })

  it("ignores 'personality' in headings and file names, and persona mentions in body text", () => {
    expect(
      personaCandidates([
        { path: ".claude/agents/voice.md", content: "# Voice\n\n## Personality\n\nWarm; talks to each persona directly." },
        { path: "docs/personality.md", content: "# Brand personality" },
        { path: "AGENTS.md", content: "# Rules\n\nKeep the persona in mind." }
      ])
    ).toEqual([])
  })

  it("does not treat a heading inside an ordinary doc as a candidate", () => {
    expect(personaCandidates([{ path: "docs/research.md", content: "# Research\n\n## Personas\n" }])).toEqual([])
  })

  it("reads the frontmatter type only from the leading block", () => {
    expect(frontmatterType("---\ndomain: _root\ntype: personas\n---\n")).toBe("personas")
    expect(frontmatterType("# Doc\n\n```yaml\n---\ntype: personas\n---\n```")).toBeNull()
  })
})

describe("techDebtStores", () => {
  it("guesses per-spec, flat and single-file layouts", () => {
    expect(
      techDebtStores([
        { path: "brain/tech-debt", kind: "dir", files: ["auth/login.md", "billing/invoices.md", "README.md"] },
        { path: "docs/tech-debt", kind: "dir", files: ["auth.md", "billing.md"] },
        { path: "TECH-DEBT.md", kind: "file", files: [] },
        { path: "tech-debt", kind: "dir", files: [] }
      ])
    ).toEqual([
      { path: "brain/tech-debt", files: 2, layout: "per-spec" },
      { path: "docs/tech-debt", files: 2, layout: "flat" },
      { path: "TECH-DEBT.md", files: 1, layout: "single-file" },
      { path: "tech-debt", files: 0, layout: "per-spec" }
    ])
  })
})

describe("reviewLayout", () => {
  const specs = new Set(["company/linkedin-sync", "freelance/skills"])

  it("is review-tree when reports mirror existing spec paths under the reviews dir", () => {
    const store = reviewLayout(
      ["brain/review/company/linkedin-sync/REPORT.md", "brain/review/freelance/skills/REPORT.md", "brain/review/standalone-fix/REPORT.md"],
      "brain/review",
      specs
    )
    expect(store).toEqual({ layout: "review-tree", reviewsDir: "brain/review", reports: 3, inTree: 2, inSpecFolders: 0 })
  })

  it("infers a reviews dir other than the default", () => {
    expect(reviewLayout(["brain/reviews/company/linkedin-sync/REPORT.md"], "brain/review", specs).reviewsDir).toBe("brain/reviews")
  })

  it("is spec-folder when reports live inside the spec folders, or when there are none", () => {
    expect(reviewLayout(["brain/specs/company/linkedin-sync/REPORT.md"], "brain/review", specs)).toMatchObject({
      layout: "spec-folder",
      inSpecFolders: 1,
      inTree: 0
    })
    expect(reviewLayout([], "brain/review", specs)).toMatchObject({ layout: "spec-folder", reviewsDir: "brain/review", reports: 0 })
  })

  it("ignores a review folder that does not mirror an existing spec", () => {
    expect(reviewLayout(["brain/review/gone/spec/REPORT.md"], "brain/review", specs).layout).toBe("spec-folder")
  })
})

describe("suggestConfig", () => {
  const referenceRouter: RouterFinding = {
    path: "CLAUDE.md",
    signals: pertinenceSignals("# CLAUDE.md\n\n## Agent workflow\n\n### Step 7 — Review (optional, only on request)\n")
  }
  const referenceFindings: ProjectFindings = {
    personas: [{ path: ".claude/agents/ux-flow-strategist.md", kind: "section", heading: "The four personas" }],
    techDebt: [{ path: "brain/tech-debt", files: 15, layout: "per-spec" }],
    review: { layout: "review-tree", reviewsDir: "brain/review", reports: 19, inTree: 17, inSpecFolders: 0 }
  }

  it("suggests the reference project's config, with a reason for every key", () => {
    const { config, suggestions } = suggestConfig(referenceFindings, [referenceRouter])
    expect(config).toEqual({
      version: 1,
      review: { mode: "none", location: "review-tree" },
      paths: { techDebt: "brain/tech-debt", reviews: "brain/review", personas: null }
    })
    expect(suggestions.map((s) => s.key)).toEqual(["review.mode", "review.location", "paths.techDebt", "paths.reviews", "paths.personas"])
    for (const s of suggestions) expect(s.reason.length).toBeGreaterThan(0)
    expect(suggestions[0]!.reason).toBe("CLAUDE.md states review only on request")
    expect(suggestions[4]!.reason).toMatch(/extract them verbatim to brain\/personas\.md/)
  })

  it("falls back to the defaults on an empty project", () => {
    const { config, suggestions } = suggestConfig(
      { personas: [], techDebt: [], review: { layout: "spec-folder", reviewsDir: "brain/review", reports: 0, inTree: 0, inSpecFolders: 0 } },
      []
    )
    expect(config).toEqual(defaultConfig)
    expect(suggestions.every((s) => s.basis === "default")).toBe(true)
  })

  it("points at a dedicated persona file and a non-default tech-debt dir", () => {
    const { config } = suggestConfig(
      {
        personas: [{ path: "docs/personas.md", kind: "file" }],
        techDebt: [
          { path: "brain/tech-debt", files: 0, layout: "per-spec" },
          { path: "docs/tech-debt", files: 4, layout: "per-spec" }
        ],
        review: { layout: "spec-folder", reviewsDir: "brain/review", reports: 0, inTree: 0, inSpecFolders: 0 }
      },
      []
    )
    expect(config.paths.personas).toBe("docs/personas.md")
    expect(config.paths.techDebt).toBe("docs/tech-debt")
  })

  it("keeps the default for a single-file store and says to migrate it", () => {
    const { suggestions } = suggestConfig(
      {
        personas: [],
        techDebt: [{ path: "TECH-DEBT.md", files: 1, layout: "single-file" }],
        review: { layout: "spec-folder", reviewsDir: "brain/review", reports: 0, inTree: 0, inSpecFolders: 0 }
      },
      []
    )
    expect(suggestions.find((s) => s.key === "paths.techDebt")).toMatchObject({ value: "brain/tech-debt", reason: expect.stringMatching(/migrate/) })
  })

  it("prefers AGENTS.md's stated policy over CLAUDE.md's", () => {
    const agents: RouterFinding = { path: "AGENTS.md", signals: pertinenceSignals("Adversarial review is mandatory before every merge.") }
    const { config } = suggestConfig(referenceFindings, [referenceRouter, agents])
    expect(config.review.mode).toBe("total")
  })
})

describe("configDisagreements", () => {
  it("lists only evidence-backed keys the config contradicts", () => {
    const suggested = suggestConfig(
      {
        personas: [],
        techDebt: [],
        review: { layout: "review-tree", reviewsDir: "brain/review", reports: 2, inTree: 2, inSpecFolders: 0 }
      },
      []
    )
    const out = configDisagreements(defaultConfig, suggested)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(/^review\.location is "spec-folder" but detection suggests "review-tree"/)
  })
})
