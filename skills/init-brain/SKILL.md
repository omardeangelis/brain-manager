---
name: init-brain
description: Bootstrap the `brain/` knowledge base and its spec-driven skill suite (create-spec, create-plan, grill-me, tdd, swarm-plan, implement-spec, docs-maintenance) plus the agent-browser validation tool skill into any project, driving the `brain` CLI for the mechanical work. Two modes — fresh init (scaffold + install skills) or migration (move existing domain/chore/tech-debt content into brain, repoint existing skills, delete old sources after confirmation). Use when the user wants to set up brain, initialize the knowledge base, replicate the brain/spec-driven workflow in a new repo, or migrate a prior docs/specs structure into brain.
---

# Init Brain

Bootstraps the `brain/` knowledge base and the spec-driven skill suite into the **current project**. The mechanical work (scaffolding, installing skills, manifest bookkeeping) is done by the **`brain` CLI**; this skill is the intelligent layer on top: it chooses the mode, folds legacy content in, classifies advisor agents, and verifies the result.

## What a run produces

- A scaffolded **`brain/`** folder (`AGENTS.md`, `CLAUDE.md`, `index.md`, `log.md`, the `raw/ specs/ domains/ chore/ tech-debt/` layout) plus `brain/.brain-manifest.json`, which makes future `brain upgrade` runs safe.
- The skill suite installed **once** into the canonical **`.agents/skills/`**, with each chosen AI provider symlinked into it (`.claude/skills → ../.agents/skills`, …). Seven process skills — **create-spec, create-plan, grill-me, tdd, swarm-plan, implement-spec, docs-maintenance** — plus the **agent-browser** tool skill (docs only; its CLI is a separate `npm i -g agent-browser`).
- A canonical root **`AGENTS.md`** (read natively by ~20 tools, incl. Codex & Cursor) with `CLAUDE.md → AGENTS.md` for Claude — the home for the project's own gates.
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
[ -z "$BRAIN" ] && BRAIN="npx -y brain-manager"
echo "BRAIN command: $BRAIN"
eval "$BRAIN --version"
```

**Remember the printed command.** Shell state does not persist between your commands, so wherever this skill or its references say `$BRAIN`, substitute the resolved command literally (e.g. `node /path/to/brain-manager/dist/bin.js scan`). If even the npx fallback fails, stop and tell the user to install the CLI (`npm i -g brain-manager`).

## Step 1 — Scan, then ask the user two things

```bash
$BRAIN scan
```

The scan reports legacy stores, loose specs, agent definitions, installed skills, the canonical-skills state, **and which AI providers are present** (`provider` lines, each tagged `skills-capable` or `router-only`). Read [references/providers.md](references/providers.md) for what those mean. Surface **two** explicit choices, with the scan findings as evidence — never decide silently:

**1. Mode** (legacy content could be moved/deleted — never pick migration silently):

- **A) Skills + fresh scaffold (fresh init)** — install the suite and a fresh, empty `brain/`. Recommend when the scan shows no `brain/` and no legacy store worth absorbing.
- **B) Reorganize existing knowledge (migration)** — fold existing docs / loose specs / tech-debt into `brain/`, repoint skills, remove old sources after confirmation. Recommend when the scan surfaced legacy doc stores, loose specs, or skills pointing at non-`brain/` paths.

**2. Providers** — which AI tools to wire into the shared `.agents/` layout:

- If the scan found `provider` lines, **recommend wiring all of them** and confirm. Skill-capable tools (Claude, OpenCode, Qwen, Zed) get a `skills/` symlink; router-only tools (Codex, Cursor, Copilot, …) are covered by the root `AGENTS.md` for free.
- If **none** were detected, **ask the user** which tools they use (offer the common ones from [references/providers.md](references/providers.md)). Default to `claude` if they are unsure.

Pass the chosen ids as a comma-separated `--providers` list in the next step.

## Step 2 — Run the chosen scenario

- **Fresh init** → run `$BRAIN init --providers <ids>`. It is additive (never overwrites existing content), stamps dates, installs the suite into `.agents/skills`, creates the provider symlinks + canonical `AGENTS.md`, writes the manifest, and reports created/kept/adopted/installed/linked per path. Relay anything `adopted`, `kept`, or `conflict` to the user.
- **Brain already present, just adding providers** → run `$BRAIN link --providers <ids>` (additive; keeps already-wired providers).
- **Legacy layout** (scan shows `brain/` but `canonical-skills … absent`, i.e. skills still under `.claude/skills`) → explain the move and **confirm**, then run `$BRAIN upgrade`: it relocates the skills to `.agents/skills`, symlinks the old path back, promotes any root `CLAUDE.md` into `AGENTS.md`, and wires detected providers. Non-destructive, but note it pulls along any non-brain skills in that dir (they stay reachable via the symlink).
- **Migration (mode B)** → read [references/migration.md](references/migration.md) and follow it. It runs `$BRAIN init --providers <ids>` at the right point, then moves content with your judgment, deleting old sources only after confirmation.

## Step 3 — Wire project advisors

Read [references/advisor-detection.md](references/advisor-detection.md). The scan already listed `agent-definition` findings; classify them and fill the `## Project Advisors` block (between the `init-brain:advisors` markers) in create-spec / create-plan / implement-spec. Advisor edits inside the markers are hash-normalized by the CLI, so they never block a future `brain upgrade`.

## Step 4 — Point the root AGENTS.md at brain

The CLI made the repo-root `AGENTS.md` canonical (creating a stub if none existed, or promoting an existing `CLAUDE.md` into it). Ensure it carries a one-line pointer to `brain/` and its skills under a "repo map" / "knowledge" section, and that the project's own **gates** (build/test/lint commands, review gates, contract/codegen chains) live there — that is their home now, there is no separate constitution file. Edit **`AGENTS.md` only**; the holdout files (`CLAUDE.md`, …) are symlinks to it — never hand-edit them. If a fresh project filled `AGENTS.md` with the stub, replace the `<!-- … -->` placeholder with the real gates (ask the user if unknown).

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
- Hand-create a provider's `skills/` dir or copy skills into `.claude/skills` — let `brain init --providers` / `brain link` make the symlinks so `.agents/skills` stays the one canonical copy.
