# Advisor Detection & Wiring

The bundled skills ship with three default advisors already wired into their bodies (`ux-advisor`, `adversarial-verifier`, `review-classifier`, installed under `.agents/agents/`). Their `## Project Advisors` block is for *additional* project-specific advisors and holds a placeholder. This step inspects the **target repo**, finds advisor agents beyond the shipped three, classifies them, and adds the relevant ones to the block in `create-spec`, `create-plan`, and `implement-spec`. This is what adapts the flow to the project's own agents.

## 1. Find agent definitions

Scan the repo (skip `node_modules`, `.venv`, `.git`, `dist`, `build`) for agent definition files:

```bash
find . \( -path ./node_modules -o -path ./.git -o -path ./.venv \) -prune -o \
  \( -path "*/.claude/agents/*" -o -path "*/.agents/agents/*" -o -path "*/agents/*.yaml" -o -path "*/agents/*.yml" \) \
  -name "*.md" -o -name "*.yaml" -o -name "*.yml" -print 2>/dev/null
```

Common locations: `.claude/agents/*.md`, `.agents/agents/**/*.{md,yaml}`. For each file, read its `name` and `description` (frontmatter for `.md`, top-level keys for `.yaml`).

**Exclude the shipped advisors** — `ux-advisor`, `adversarial-verifier`, `review-classifier` (they live in `.agents/agents/` and are already wired into the skill bodies). Only classify agents *beyond* these three.

If no other agents are found, leave every `## Project Advisors` block as the placeholder and say so in the report. Do not invent agents.

## 2. Classify each agent

Use the agent's description to bucket it. You may spawn one subagent to do this classification over all found agents at once (return JSON: `{name, kind, trigger, when}`). Buckets:

- **schema/data** — keywords: schema, database, DB, migration, model, SQL, data model, table, index. Trigger: tasks touching the data/schema layer.
- **ux/design** — keywords: UX, UI, design, frontend, user flow, accessibility, interaction, usability. Trigger: user-facing flows.
- **other** — anything else relevant to spec/plan/implement (security, performance, API contract). Trigger: derive from the description.

## 3. Wire each skill's `## Project Advisors` block

Replace the content **between** `<!-- init-brain:advisors:start -->` and `<!-- init-brain:advisors:end -->` (keep the markers) in each skill, with a bullet per relevant agent:

```md
- **`<agent-name>`** — <trigger> — delegate via the `Agent` tool with `subagent_type: "<agent-name>"` <when to delegate, from its description>.
```

Which agents go where:

- **create-spec** → ux/design advisors (spec-time UX review before the quality bar). Omit pure schema advisors.
- **create-plan** → schema/data advisors (between `$swarm-plan` and `$tdd`) **and** ux/design advisors (implementation-order pressure-test); include relevant "other" advisors as optional.
- **implement-spec** → schema/data and ux/design advisors as **pre-task** delegations keyed to task `location`.

If a bucket has no agent for a given skill, leave that skill's block as the placeholder text.

## 4. Confirm

Show the user the detected agents and the per-skill wiring you applied. Keep names verbatim (they must match `subagent_type`).

## 5. Continue

Return to `SKILL.md` Step 4 (router pointer), then Step 5 ([verify.md](verify.md)).
