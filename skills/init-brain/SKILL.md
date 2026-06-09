---
name: init-brain
description: Bootstrap the `brain/` knowledge base and its spec-driven skill suite (create-spec, create-plan, grill-me, tdd, swarm-plan, implement-spec, docs-maintenance) plus the agent-browser validation tool skill into any project. Two modes — fresh init (scaffold + install skills) or migration (move existing domain/chore/tech-debt content into brain, repoint existing skills, delete old sources after confirmation). Use when the user wants to set up brain, initialize the knowledge base, replicate the brain/spec-driven workflow in a new repo, or migrate a prior docs/specs structure into brain.
---

# Init Brain

Bootstraps the `brain/` knowledge base and the spec-driven skill suite into the **current project**. Self-contained: everything it installs ships inside this skill's own `assets/` directory, so it works even in an empty repo.

## What a run produces

After a successful run the target project has:

- A fully scaffolded **`brain/`** folder: `AGENTS.md` + `CLAUDE.md` (the Brain Schema), `index.md`, `log.md`, `specs/CONSTITUTION.md`, and the `raw/ specs/ domains/ chore/ tech-debt/` layout.
- Seven installed/updated process skills, generic and wired to `brain/`: **create-spec, create-plan, grill-me, tdd, swarm-plan, implement-spec, docs-maintenance**.
- The **agent-browser** tool skill, bundled alongside them. `create-plan`/`implement-spec` name `$agent-browser` for `browser`/`mixed` `review_mode` tasks; its references stay gated, so backend-only projects never invoke it. The skill ships docs only — the CLI is a separate `npm i -g agent-browser` install.
- A populated **`## Project Advisors`** section in create-spec / create-plan / implement-spec, listing any advisor agents detected in the repo (e.g. a schema or UX advisor), so the flow delegates to what the project actually has.

## Contract

- **Role:** project bootstrap / migration orchestrator
- **Upstream:** a target repo (the CWD) that wants the brain + spec-driven workflow
- **Delegates to:** none required; may spawn one subagent to classify detected advisor agents
- **Stop conditions:** brain scaffold present, 7 process skills + the agent-browser tool skill installed/updated, advisors wired, verification report printed. In migration mode, old sources are deleted **only after explicit user confirmation and a content-presence check**.

## Step 0 — Locate this skill's assets

This skill's templates live in `assets/` next to this `SKILL.md`. Resolve the absolute path before doing anything:

```bash
SKILL_DIR=""
for c in "$HOME/.claude/skills/init-brain" "$HOME/.agents/skills/init-brain" "./.claude/skills/init-brain" "./.agents/skills/init-brain"; do
  [ -d "$c/assets/brain" ] && SKILL_DIR="$c" && break
done
echo "assets at: $SKILL_DIR/assets   (brain scaffold + skills/)"
```

If `$SKILL_DIR` is empty, stop and tell the user the skill is not installed where its assets can be found.

## Step 1 — Choose the scenario

Decide between the two modes and **state your choice with its evidence** before acting:

- **Fresh init** — no prior knowledge-base structure to absorb. Pick this if there is no `brain/`, and no obvious legacy store (`docs/`, `wiki/`, `.notes/`, scattered `*-spec.md`, an existing `specs/` tree of domain knowledge) the user wants folded in.
- **Migration** — there is a prior structure to absorb and retire. Pick this if the repo already holds domain docs, chore/planning material, tech-debt notes, or specs outside `brain/`, **or** if older copies of these skills exist and point at non-`brain/` paths.

If it is ambiguous, ask the user which mode they want — do not guess when legacy content could be destroyed.

## Step 2 — Resolve target locations

- **Brain folder:** `<repo-root>/brain/`.
- **Skills directory** (auto-detect, state the choice):
  - if `<repo>/.agents/skills/` exists → use it;
  - else if `<repo>/.claude/skills/` exists → use it;
  - else create `<repo>/.claude/skills/` (the Claude Code standard location).

## Step 3 — Run the chosen scenario

- Fresh init → read [references/fresh-init.md](references/fresh-init.md) and follow it.
- Migration → read [references/migration.md](references/migration.md) and follow it (it scaffolds brain too, then moves content, then deletes old sources after confirmation).

## Step 4 — Install / upsert the skill suite

Read [references/install-skills.md](references/install-skills.md). Idempotent upsert: missing skills are copied from `assets/skills/`; existing ones are updated to the generic, brain-wired version (preserving any hand-curated advisor entries).

## Step 5 — Wire project advisors

Read [references/advisor-detection.md](references/advisor-detection.md). Scan the repo for agent definitions, classify them, and fill the `## Project Advisors` block in create-spec / create-plan / implement-spec. This is the step that adapts the generic flow to the project's own agents.

## Step 6 — Verify and report

Read [references/verify.md](references/verify.md). Confirm the scaffold and skills are in place, no `__TODAY__` placeholders or stale legacy paths remain, then print a concise report (created / updated / migrated / deleted / advisors wired) and recommend the next step (usually `create-spec`).

## Never do

- Overwrite an existing non-empty `brain/index.md`, `log.md`, or `AGENTS.md`/`CLAUDE.md` without confirmation — add only what is missing.
- Delete any legacy source in migration mode without explicit confirmation **and** a check that the content now exists in `brain/`.
- Hardcode advisor agent names anywhere except between the `init-brain:advisors` markers.
- Leave `__TODAY__` placeholders unstamped.
