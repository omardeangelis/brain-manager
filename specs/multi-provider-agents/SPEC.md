---
domain: providers
type: spec
status: draft
links:
  - "[[src/core/providers.ts]]"
  - "[[src/core/link-plan.ts]]"
  - "[[src/services/linker.ts]]"
created: 2026-06-14
updated: 2026-06-14
---

# Multi-provider advisor agents

Generate the shipped advisor subagents in each agent-capable tool's **native format**, from the single canonical source, so the agent layer is not Claude-only.

## Problem

The agent layer (`ux-advisor`, `adversarial-verifier`, `review-classifier`) is wired by **symlinking** the canonical `.agents/agents/*.md` into `<provider>/agents`. That works only for tools that read Claude Code's subagent format (markdown + YAML frontmatter with `name` / `description` / `tools` / `model` / `color` + a markdown body). Today that is **Claude only** (`agentCapable` in [providers.ts](src/core/providers.ts) returns just `claude`).

Other tools have a subagent concept but a **different on-disk format**, so a symlink to our `.md` files would point them at content they cannot parse. Confirmed for one tool already:

- **OpenAI Codex** — subagents are **TOML** files in `.codex/agents/` (project) / `~/.codex/agents/` (personal), with fields `name`, `description`, `developer_instructions` (+ optional `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, `skills.config`). Source: <https://developers.openai.com/codex/subagents>.

So a non-Claude user who installs brain gets the three advisors written to `.agents/agents/` but **inert** — nothing consumes them, and the skill steps that spawn them degrade to inline execution (see the "No subagent runtime?" rule shipped in `brain/AGENTS.md`). That degradation is the floor; this spec raises the ceiling for tools that *do* have native subagents.

## Goal

When an agent-capable tool is wired, the three shipped advisors appear in **that tool's native subagent format**, generated from the one canonical `.agents/agents/*.md` source and kept in sync by `brain upgrade` — with no new source of drift.

## Research (do this first — gates the design)

Before implementing, conduct **in-depth research on the major AI coding tools** and produce a capability matrix. The current provider list ([providers.ts](src/core/providers.ts)) is the population to cover: `claude`, `opencode`, `qwen`, `zed`, `codex`, `cursor`, `copilot`, `gemini`, `windsurf`, `cline`, `roo`, `kilo`, `amp`, `augment`, `continue`. For **each** tool, establish from primary sources (official docs, changelogs, repos — cite each):

1. **Does it have a subagent / custom-agent concept at all?** (distinct from skills and from the root instruction file)
2. **Where do definitions live?** Exact project-level and global directory paths.
3. **File format & extension** — markdown+frontmatter, TOML, YAML, JSON?
4. **Field schema** — the exact field names for: identifier, description/when-to-use, the agent's instructions/body, model selection, tool allow-listing, and anything mandatory.
5. **How a subagent is invoked** from a parent agent (and any depth/concurrency limits, e.g. Codex `agents.max_depth` / `agents.max_threads`).
6. **Whether the format is convergent** with Claude's (could ever be symlinked) or genuinely divergent (must be generated).

Deliverable: a matrix (tool × the six questions) saved alongside this spec, with a per-tool verdict of **none** / **symlink-compatible** / **needs-generation**, and the field-mapping notes for each "needs-generation" tool. This is what decides which providers become agent-capable and how.

> Treat anything not confirmed from a primary source as **unknown**, not assumed. A wrong path or field name produces files the tool silently ignores — worse than shipping nothing.

## Proposed approach (subject to the research)

- **One canonical source stays `.agents/agents/*.md`** (the Claude/markdown format remains the lingua franca and the only symlink target).
- Introduce a **generated** wiring kind: for a tool whose format is divergent, `brain` transpiles each canonical `.md` into the tool's native file (e.g. `.codex/agents/<name>.toml`). Generated files are **overwrite-on-every-`upgrade`**, marked "generated — do not edit," and tracked in the manifest so `doctor` and `upgrade` know them. Because the source of truth is always the `.md`, there is no merge/conflict path — they are pure build outputs.
- Extend the `Provider` model with an agents **format** (e.g. `agentsFormat: "claude-md" | "codex-toml" | …`) and the target dir; split `agentCapable` into *symlink-capable* (claude) vs *generation-capable* (the rest with a known format).
- A small, pure **transpiler per format** (testable without a filesystem, like the existing planners), with an explicit field map and documented lossy edges (e.g. Claude's `tools` allow-list and `color` have no Codex equivalent).

## Non-goals

- Re-authoring the advisor content per tool — there is **one** source; everything else is generated.
- Supporting tools the research finds have **no** subagent concept — they keep the skills + `AGENTS.md` workflow and the inline-degradation rule.
- A user-editable generated file — generated artifacts are not a customization surface.

## Acceptance criteria

- For each tool the research marks **needs-generation** and we choose to support, `brain init`/`link` writes the advisors in that tool's native format and location, and the tool can load them.
- `brain upgrade` regenerates them from the current canonical `.md`; a hand-edited generated file is overwritten (by design) and that is documented.
- `brain doctor` reports generated-agent drift/missing like any managed artifact; the manifest records them with the generated kind.
- Claude's existing symlink path is unchanged.
- The capability matrix is committed and cited.

## Open questions

- Lossy mappings: how to represent Claude's per-agent `tools` allow-list where a target format has no equivalent (drop? translate to the nearest concept, e.g. Codex `sandbox_mode` / `mcp_servers`?).
- Generated files in the user's repo: do they belong in version control, or `.gitignore`'d as build output? (Probably committed, since they are how the tool discovers the agent.)
- Global vs project scope: do we ever target `~/.codex/agents` (personal), or only project-level? (Default: project-level only, mirroring skills.)

## Risks

- **Format churn** — these formats are young; a field rename upstream breaks generation. Mitigate by isolating each format in its own pure transpiler with tests, and by citing the source version in the matrix.
- **Silent no-ops** — a wrong path/field means the tool ignores the file with no error. Mitigate with the research's primary-source requirement and, where feasible, a load check in the eval scenarios.
