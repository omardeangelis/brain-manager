---
name: init-brain
description: Bootstrap the `brain/` knowledge base and its spec-driven skill suite (create-spec, create-plan, grill-me, tdd, swarm-plan, implement-spec, docs-maintenance) plus the agent-browser validation tool skill into any project, driving the `brain` CLI for the mechanical work. Two modes — fresh init (scaffold + install skills) or migration (move existing domain/chore/tech-debt content into brain, repoint existing skills, delete old sources after confirmation). Use when the user wants to set up brain, initialize the knowledge base, replicate the brain/spec-driven workflow in a new repo, or migrate a prior docs/specs structure into brain.
---

# Init Brain

Bootstraps the `brain/` knowledge base and the spec-driven skill suite into the **current project**. The mechanical work (scaffolding, installing skills, manifest bookkeeping) is done by the **`brain` CLI**; this skill is the intelligent layer on top: it chooses the mode, folds legacy content in, classifies advisor agents, and verifies the result.

## What a run produces

- A scaffolded **`brain/`** folder (`AGENTS.md`, `CLAUDE.md`, `index.md`, `log.md`, `specs/CONSTITUTION.md`, the `raw/ specs/ domains/ chore/ tech-debt/` layout) plus `brain/.brain-manifest.json`, which makes future `brain upgrade` runs safe.
- Seven process skills installed and brain-wired: **create-spec, create-plan, grill-me, tdd, swarm-plan, implement-spec, docs-maintenance** — plus the **agent-browser** tool skill (docs only; its CLI is a separate `npm i -g agent-browser`).
- A populated **`## Project Advisors`** section in create-spec / create-plan / implement-spec, listing advisor agents detected in the repo.

## Contract

- **Role:** project bootstrap / migration orchestrator (drives the `brain` CLI)
- **Upstream:** a target repo (the CWD) that wants the brain + spec-driven workflow
- **Delegates to:** the `brain` CLI for all file mechanics; may spawn one subagent to classify detected advisor agents
- **Stop conditions:** `brain doctor` passes, advisors wired, verification report printed. In migration mode, old sources are deleted **only after explicit user confirmation and a content-presence check**.

## Step 0 — Resolve the CLI

```bash
BRAIN=""
if command -v brain >/dev/null 2>&1; then BRAIN="brain"
else
  # Maintainer setup: this skill is symlinked out of the brain-manager repo.
  for c in "$HOME/.claude/skills/init-brain" "$HOME/.agents/skills/init-brain"; do
    [ -e "$c/SKILL.md" ] || continue
    repo="$(dirname "$(dirname "$(cd "$c" && pwd -P)")")"
    [ -f "$repo/dist/bin.js" ] && BRAIN="node $repo/dist/bin.js" && break
  done
fi
[ -z "$BRAIN" ] && BRAIN="npx -y @omardeangelis/brain-manager"
echo "BRAIN command: $BRAIN"
eval "$BRAIN --version"
```

**Remember the printed command.** Shell state does not persist between your commands, so wherever this skill or its references say `$BRAIN`, substitute the resolved command literally (e.g. `node /path/to/brain-manager/dist/bin.js scan`). If even the npx fallback fails, stop and tell the user to install the CLI (`npm i -g @omardeangelis/brain-manager`).

## Step 1 — Scan and choose the scenario

```bash
$BRAIN scan
```

Decide between the two modes from the scan findings and **state your choice with its evidence** before acting:

- **Fresh init** — no `brain/` and no legacy store worth absorbing (`legacy-store` / `loose-spec` findings empty or clearly irrelevant).
- **Migration** — the scan surfaced legacy doc stores, loose specs/planning/tech-debt files, or installed skills pointing at non-`brain/` paths.

If it is ambiguous, ask the user which mode they want — do not guess when legacy content could be destroyed.

## Step 2 — Run the chosen scenario

- **Fresh init** → run `$BRAIN init`. It is additive (never overwrites existing content), stamps dates, installs the suite, writes the manifest, and reports created/kept/adopted/installed per path. Relay anything `adopted` or `kept` to the user.
- **Migration** → read [references/migration.md](references/migration.md) and follow it. It runs `$BRAIN init` at the right point, then moves content with your judgment, and deletes old sources only after confirmation.

## Step 3 — Wire project advisors

Read [references/advisor-detection.md](references/advisor-detection.md). The scan already listed `agent-definition` findings; classify them and fill the `## Project Advisors` block (between the `init-brain:advisors` markers) in create-spec / create-plan / implement-spec. Advisor edits inside the markers are hash-normalized by the CLI, so they never block a future `brain upgrade`.

## Step 4 — Point the agent layer at brain

If the repo root has a `CLAUDE.md` / `AGENTS.md` router, add a one-line pointer to `brain/` and its skills under an existing "repo map" / "knowledge" section. Do not create a router unprompted.

## Step 5 — Verify and report

```bash
$BRAIN doctor
```

Then read [references/verify.md](references/verify.md) for the intelligent checks the CLI cannot do (foreign tokens, legacy path references) and print the final report (mode, created/updated/migrated/deleted, advisors wired, next step — usually `create-spec`).

## Never do

- Overwrite existing `brain/` content — `brain init` is additive by design; do not "fix" that with manual copies.
- Delete any legacy source in migration mode without explicit confirmation **and** a check that the content now exists in `brain/`.
- Hardcode advisor agent names anywhere except between the `init-brain:advisors` markers.
- Bypass the CLI for scaffolding or skill installs — the manifest it writes is what keeps `brain upgrade` safe later.
