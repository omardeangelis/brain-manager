import { describe, expect, it } from "vitest"
import {
  ROUTER_STUB,
  type RouterFile,
  describeSignals,
  headings,
  pertinenceSignals,
  routerDivergence,
  routerState
} from "./router.js"

const file = (content: string): RouterFile => ({ kind: "file", content })
const absent: RouterFile = { kind: "absent" }
const link = (target: string, content?: string): RouterFile =>
  content === undefined ? { kind: "symlink", target } : { kind: "symlink", target, content }

describe("routerState", () => {
  it("none — neither file", () => {
    expect(routerState({ agentsMd: absent, claudeMd: absent })).toBe("none")
  })

  it("claude-only — a real CLAUDE.md and no AGENTS.md", () => {
    expect(routerState({ agentsMd: absent, claudeMd: file("# Rules") })).toBe("claude-only")
  })

  it("claude-only — AGENTS.md is a symlink back to the real CLAUDE.md (reverse layout)", () => {
    expect(routerState({ agentsMd: link("CLAUDE.md", "# Rules"), claudeMd: file("# Rules") })).toBe("claude-only")
  })

  it("agents-only — a real AGENTS.md and no CLAUDE.md", () => {
    expect(routerState({ agentsMd: file("# Rules"), claudeMd: absent })).toBe("agents-only")
  })

  it("linked — CLAUDE.md already points to AGENTS.md", () => {
    expect(routerState({ agentsMd: file("# Rules"), claudeMd: link("AGENTS.md", "# Rules") })).toBe("linked")
  })

  it("identical — both real, same content (whitespace and line endings ignored)", () => {
    expect(routerState({ agentsMd: file("# Rules\n\n- a\n"), claudeMd: file("# Rules\r\n\r\n- a   \r\n\r\n") })).toBe("identical")
  })

  it("divergent — both real, different content", () => {
    expect(routerState({ agentsMd: file("# Rules\n- a"), claudeMd: file("# Rules\n- b") })).toBe("divergent")
  })

  it("divergent — a real CLAUDE.md whose content is unknown is never assumed identical", () => {
    expect(routerState({ agentsMd: { kind: "file" }, claudeMd: { kind: "file" } })).toBe("divergent")
  })
})

describe("routerDivergence", () => {
  const agents = "# Project\n\n## Gates\n\n`npm test`\n\n## Conventions\n\n- small PRs\n"
  const claude = "# Project\n\n## Gates\n\n`npm test`\n\n## Solid reactivity\n\n- never destructure props\n\n### Step 7 — Review\n"

  it("lists the headings only CLAUDE.md has, ignoring a file-name title", () => {
    expect(routerDivergence(agents, claude).claudeOnlyHeadings).toEqual(["Solid reactivity", "Step 7 — Review"])
    expect(routerDivergence("# AGENTS.md\n", "# CLAUDE.md\n## Extra").claudeOnlyHeadings).toEqual(["Extra"])
  })

  it("reports a line-level similarity in [0, 1]", () => {
    const { similarity } = routerDivergence(agents, claude)
    expect(similarity).toBeGreaterThan(0)
    expect(similarity).toBeLessThan(1)
    expect(routerDivergence(agents, agents).similarity).toBe(1)
    expect(routerDivergence("# a\nx", "# b\ny").similarity).toBe(0)
  })

  it("ignores headings inside fenced code", () => {
    expect(headings("# Real\n```bash\n# Development\npnpm i\n```\n## Also real")).toEqual(["Real", "Also real"])
  })
})

describe("pertinenceSignals", () => {
  it("recognises our own stub", () => {
    const s = pertinenceSignals(ROUTER_STUB)
    expect(s.isStub).toBe(true)
    expect(describeSignals(s)).toBe("stub · brain pointer")
  })

  it("still lists what a short file carries", () => {
    expect(describeSignals(pertinenceSignals("# CLAUDE.md\n\n### Step 7 — Review (optional, only on request)\n"))).toBe(
      "stub · workflow section · review on-request"
    )
  })

  it("reads a Cursor-only rules file as foreign: no gates, no brain pointer, no workflow", () => {
    const cursorRules = [
      "# Project rules for Cursor",
      "",
      "You are an expert in TypeScript, Node.js, Next.js App Router, React, Shadcn UI, Radix UI and Tailwind.",
      "",
      "## Code style",
      "",
      "- Write concise, technical TypeScript code with accurate examples.",
      "- Use functional and declarative programming patterns; avoid classes.",
      "- Prefer iteration and modularization over code duplication.",
      "- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).",
      "",
      "## Naming",
      "",
      "- Use lowercase with dashes for directories (e.g., components/auth-wizard)."
    ].join("\n")
    const s = pertinenceSignals(cursorRules)
    expect(s.isStub).toBe(false)
    expect(s.hasGates).toBe(false)
    expect(s.hasBrainPointer).toBe(false)
    expect(s.hasWorkflow).toBe(false)
    expect(s.reviewPolicy).toBeNull()
  })

  it("finds gates in a gates-only file and checks them against package.json scripts", () => {
    const gatesOnly = [
      "# AGENTS.md",
      "",
      "Run these before every commit; CI runs them in the same order and fails the PR on any error.",
      "",
      "```bash",
      "pnpm install          # dependencies",
      "pnpm biome:check      # lint + format",
      "pnpm typecheck        # tsc --noEmit",
      "pnpm test             # vitest",
      "pnpm build:legacy     # removed last year",
      "```"
    ].join("\n")
    const s = pertinenceSignals(gatesOnly, ["biome:check", "typecheck", "test", "build"])
    expect(s.hasGates).toBe(true)
    expect(s.gateCommands).toEqual(["pnpm biome:check", "pnpm typecheck", "pnpm test"])
    expect(s.hasBrainPointer).toBe(false)
    expect(s.hasWorkflow).toBe(false)
    expect(s.isStub).toBe(false)
  })

  it("reads a reference-like CLAUDE.md: workflow, review on request, brain pointer, paths", () => {
    const reference = [
      "# CLAUDE.md",
      "",
      "## Commands",
      "",
      "```bash",
      "pnpm typecheck        # TypeScript type check (no emit)",
      "pnpm test             # Run all Vitest tests",
      "```",
      "",
      "## Agent workflow",
      "",
      "### Step 1 — Load relevant skills (mandatory, before anything else)",
      "",
      "| Task | Skill |",
      "|------|-------|",
      "| new feature | create-spec |",
      "",
      "### Step 7 — Review (optional, only on request)",
      "",
      "`adversarial-review` is not a default step: run it only when the user explicitly asks for it.",
      "It writes `RUBRIC.md` + `REPORT.md` under `brain/review/<domain>/<spec>/`.",
      "",
      "### Step 8 — Close out",
      "",
      "Fold durable findings into `brain/tech-debt/<domain>/<spec>.md`."
    ].join("\n")
    const s = pertinenceSignals(reference, ["typecheck", "test"])
    expect(s.reviewPolicy).toBe("on-request")
    expect(s.hasWorkflow).toBe(true)
    expect(s.hasBrainPointer).toBe(true)
    expect(s.hasSkillRouting).toBe(true)
    expect(s.mentionsTechDebtPath).toBe(true)
    expect(s.mentionsReviewPath).toBe(true)
    expect(s.gateCommands).toEqual(["pnpm typecheck", "pnpm test"])
    expect(describeSignals(s)).toContain("review on-request")
  })

  it("reads a mandatory review policy", () => {
    expect(pertinenceSignals("Every PR needs an adversarial review: it is mandatory before merge.").reviewPolicy).toBe("mandatory")
  })

  it("finds a personas section", () => {
    expect(pertinenceSignals("# Agent\n\n## The four personas\n\n- Freelance").hasPersonas).toBe(true)
    expect(pertinenceSignals("# Agent\n\n## Personality\n\nWarm and direct.").hasPersonas).toBe(false)
  })
})
