# Advisor Detection & Wiring

The bundled skills ship with five default advisors already wired into their bodies (`ux-advisor`, `ui-reviewer`, `design-engineer`, `adversarial-verifier`, `review-classifier`, installed under `.agents/agents/`). Their `## Project Advisors` block is for *additional* project-specific advisors and holds a placeholder. This step inspects the **target repo**, finds advisor agents beyond the shipped five, classifies them, and adds the relevant ones to the block in `create-spec`, `create-plan`, and `implement-spec`. This is what adapts the flow to the project's own agents.

## 1. Find agent definitions

Scan the repo (skip `node_modules`, `.venv`, `.git`, `dist`, `build`) for agent definition files:

```bash
find . \( -path ./node_modules -o -path ./.git -o -path ./.venv \) -prune -o \
  \( -path "*/.claude/agents/*" -o -path "*/.agents/agents/*" -o -path "*/agents/*.yaml" -o -path "*/agents/*.yml" \) \
  -name "*.md" -o -name "*.yaml" -o -name "*.yml" -print 2>/dev/null
```

Common locations: `.claude/agents/*.md`, `.agents/agents/**/*.{md,yaml}`. For each file, read its `name` and `description` (frontmatter for `.md`, top-level keys for `.yaml`).

**Exclude the shipped advisors** — `ux-advisor`, `ui-reviewer`, `design-engineer`, `adversarial-verifier`, `review-classifier` (they live in `.agents/agents/` and are already wired into the skill bodies). Only classify agents *beyond* these five.

**Recognize legacy twins.** A hand-installed suite often carries an older, renamed copy of a shipped advisor. Check every remaining agent against this alias table, and confirm a match by description similarity (same pipeline role, same outputs) before treating it as a twin:

| Legacy name | Shipped agent |
|---|---|
| `review-classifier-router` | `review-classifier` |
| `ux-flow-strategist` | `ux-advisor` |

An agent whose description matches a shipped one closely under another name is a twin too: say why you think so and let the user confirm.

**UI-review agents.** A project's own UI-review or visual-QA agent, under any name, is a legacy twin of `ui-reviewer` when it reviews the rendered page for static UI: placement, widths and wrapping, contrast, focus visibility, target size, accessible names. Its knowledge goes to `brain/chore/ui-review.md`, the page `ui-reviewer` and the UI pass of `adversarial-review` read before every UI review: the quirks of the project's components under **Component traps**, findings that changed the product under **Kept examples**, and findings the project rejected, each with its reason, under **Suppressed findings**. Create the page on first use with the template of the installed `create-spec/references/flow-map.md` → Rejected findings (base frontmatter, `domain: _root`, `type: concept`; the four sections in order). The Project bar is the user's: show the bar values the twin states (minimum width, target-size standard, engines and devices, design-system rules) and offer to start the section with them, writing only what the user confirms; never fill it in on your own. UX knowledge the same agent holds goes to `brain/chore/ux-review.md`.

For each twin:

1. **Do not wire it** as an additional advisor: the shipped agent already covers its role.
2. **Route its project facts first.** Personas it holds go to [project-context.md](project-context.md) §1 (extract to `brain/personas.md`); risk surfaces, critical paths and conventions go to the root `AGENTS.md` via [router.md](router.md); review knowledge goes to `brain/chore/ux-review.md` (UX) or `brain/chore/ui-review.md` (static UI). Nothing project-specific is lost when the twin goes.
3. **Offer to replace it** with the shipped agent: delete the twin's file after the user confirms (its memory folder is handled by [migration.md](migration.md) → Agent memory).
4. **List the docs that mention the old name** (`grep -rn "<legacy-name>" --include=*.md .`, skipping `node_modules`, `.git` and the agent memory folders), for the user to update. Do not rewrite historical specs or reviews: they record what ran at the time.

If no other agents are found, leave every `## Project Advisors` block as the placeholder and say so in the report. Do not invent agents.

## 2. Classify each agent

Use the agent's description to bucket it. You may spawn one subagent to do this classification over all found agents at once (return JSON: `{name, kind, trigger, when}`). Buckets:

- **schema/data** — keywords: schema, database, DB, migration, model, SQL, data model, table, index. Trigger: tasks touching the data/schema layer.
- **ux/design** — keywords: UX, UI, design, frontend, user flow, accessibility, interaction, usability. Not wired into any skill: the UX and UI reviews run from `prototype`, through the shipped `ux-advisor` and `ui-reviewer`, and the UI pass of `adversarial-review` covers the implemented change. The shipped owners are UX → `ux-advisor` · static UI of the rendered page → `ui-reviewer` (bar and probes: the `ui-review` skill) · motion and interaction craft → `design-engineer` (`design-engineering`). List such an agent in the report as invocable by hand, and offer to move its durable knowledge, split the same way, where the shipped agents read it: UX knowledge to `brain/chore/ux-review.md` (component traps, kept and suppressed findings) or `brain/personas.md`; static UI knowledge to `brain/chore/ui-review.md` (component traps, kept and suppressed findings; the Project bar only as an offer to the user, as above); motion decisions to `brain/chore/motion.md`.
- **other** — anything else relevant to spec/plan/implement (security, performance, API contract). Trigger: derive from the description.

## 3. Wire each skill's `## Project Advisors` block

Replace the content **between** `<!-- init-brain:advisors:start -->` and `<!-- init-brain:advisors:end -->` (keep the markers) in each skill, with a bullet per relevant agent:

```md
- **`<agent-name>`** — <trigger> — delegate via the `Agent` tool with `subagent_type: "<agent-name>"` <when to delegate, from its description>.
```

Which agents go where:

- **create-spec** → relevant "other" advisors only (e.g. a security or compliance expert at spec time). Omit pure schema and ux/design advisors.
- **create-plan** → schema/data advisors (between `$swarm-plan` and `$tdd`); include relevant "other" advisors as optional.
- **implement-spec** → schema/data advisors (and relevant "other" ones) as **pre-task** delegations keyed to task `location`.

If a bucket has no agent for a given skill, leave that skill's block as the placeholder text.

**Blocks carried over from an older install.** Adopted or upgraded skills keep whatever their block held. Remove every entry that names a shipped advisor (`ux-advisor`, `ui-reviewer`, `design-engineer`, `adversarial-verifier`, `review-classifier`) or a legacy twin, and every ux/design entry: those roles are now in the skill bodies, or in `prototype`. Keep the entries for agents that are still additional advisors. A block left with nothing goes back to the placeholder text, exactly as shipped, so the skill file is byte-identical to the package again.

## 4. Confirm

Show the user the detected agents, the legacy twins and what happened to each (facts routed, replaced or kept), and the per-skill wiring you applied. Keep names verbatim (they must match `subagent_type`).

## 5. Continue

Return to `SKILL.md` Step 4 (stack adaptation), then Step 5 (router pointer) and Step 6 ([verify.md](verify.md)).
