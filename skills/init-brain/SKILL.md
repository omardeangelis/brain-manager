---
name: init-brain
description: Bootstrap the `brain/` knowledge base and its spec-driven skill suite (create-spec, create-plan, grill-me, tdd, swarm-plan, implement-spec, docs-maintenance, adversarial-review, prototype) plus the design-engineering motion reference (adapted to the project's frontend stack) and the agent-browser validation tool skill into any project, driving the `brain` CLI for the mechanical work. Two modes — fresh init (scaffold + install skills) or migration (move existing domain/chore/tech-debt content into brain, repoint existing skills, delete old sources after confirmation). Use when the user wants to set up brain, initialize the knowledge base, replicate the brain/spec-driven workflow in a new repo, or migrate a prior docs/specs structure into brain.
---

# Init Brain

Bootstraps the `brain/` knowledge base and the spec-driven skill suite into the **current project**. The mechanical work (scaffolding, installing skills, manifest bookkeeping) is done by the **`brain` CLI**; this skill is the intelligent layer on top: it chooses the mode, folds legacy content in, classifies advisor agents, and verifies the result.

## What a run produces

- A scaffolded **`brain/`** folder (`AGENTS.md`, `CLAUDE.md`, `index.md`, `log.md`, the `raw/ specs/ domains/ chore/ tech-debt/ review/` layout) plus `brain/.brain-manifest.json`, which makes future `brain upgrade` runs safe.
- The skill suite installed **once** into the canonical **`.agents/skills/`**, with each chosen AI provider symlinked into it (`.claude/skills → ../.agents/skills`, …). Nine process skills — **create-spec, create-plan, grill-me, tdd, swarm-plan, implement-spec, docs-maintenance, adversarial-review, prototype** (the last one explicit-invocation only) — plus the **design-engineering** motion-craft reference skill and the **agent-browser** tool skill (docs only; its CLI is a separate `npm i -g agent-browser`).
- Four shipped **advisor subagents** installed into the canonical **`.agents/agents/`** and symlinked into each capable provider (`.claude/agents → ../.agents/agents`): **ux-advisor** (writes a spec's `FLOW.md`), **design-engineer** (motion / interaction craft), **adversarial-verifier**, and **review-classifier**. The spec-driven skills spawn them to verify reasoning off the orchestrator's context.
- A **stack profile**, `brain/chore/motion-stack.md`: the detected frontend stack and — for anything other than React on the web — a researched translation of the React APIs the `design-engineering` references use into the project's own (Vue, Svelte, Angular, Solid, React Native, Flutter, …).
- A canonical root **`AGENTS.md`** (read natively by ~20 tools, incl. Codex & Cursor) with `CLAUDE.md → AGENTS.md` for Claude — the home for the project's own gates.
- A **`## Project Advisors`** section in create-spec / create-plan / implement-spec listing any *additional* advisor agents detected in the repo (the shipped four are already wired into the skill bodies).

## Contract

- **Role:** project bootstrap / migration orchestrator (drives the `brain` CLI)
- **Upstream:** a target repo (the CWD) that wants the brain + spec-driven workflow
- **Delegates to:** the `brain` CLI for all file mechanics; may spawn one subagent to classify detected advisor agents; the installed `design-engineering` skill's stack-adaptation procedure for the stack profile
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

## Step 1 — Scan, then confirm mode, providers, and stack

```bash
$BRAIN scan
```

The scan reports legacy stores, loose specs, agent definitions, installed skills, the canonical-skills state, **which AI providers are present** (`provider` lines, each tagged `skills-capable` or `router-only`), **and the frontend stack** (`frontend` lines, one per manifest, plus a `frontend:` verdict note). Read [references/providers.md](references/providers.md) for what the provider lines mean. Surface **two** explicit choices, plus a third only when the stack is unclear, with the scan findings as evidence — never decide silently:

**1. Mode** (legacy content could be moved/deleted — never pick migration silently):

- **A) Skills + fresh scaffold (fresh init)** — install the suite and a fresh, empty `brain/`. Recommend when the scan shows no `brain/` and no legacy store worth absorbing.
- **B) Reorganize existing knowledge (migration)** — fold existing docs / loose specs / tech-debt into `brain/`, repoint skills, remove old sources after confirmation. Recommend when the scan surfaced legacy doc stores, loose specs, or skills pointing at non-`brain/` paths.

**2. Providers** — which AI tools to wire into the shared `.agents/` layout:

- If the scan found `provider` lines, **recommend wiring all of them** and confirm. Skill-capable tools (Claude, OpenCode, Qwen, Zed) get a `skills/` symlink; router-only tools (Codex, Cursor, Copilot, …) are covered by the root `AGENTS.md` for free.
- If **none** were detected, **ask the user** which tools they use (offer the common ones from [references/providers.md](references/providers.md)). Default to `claude` if they are unsure.

Pass the chosen ids as a comma-separated `--providers` list in the next step.

**3. Frontend stack — only when detection falls short.** Detect first, ask as the fallback:

- The verdict names one stack → state it alongside the other two choices; no question.
- `none detected`, `several frontends`, or a stack that contradicts the root `AGENTS.md` → ask which UI stack the project uses (and, for several, which are in scope), offering the detected candidates plus "no UI in this repo". Common misses: the UI lives in server templates (Django, Rails, Laravel, Phoenix) or in another repo.

The answer feeds Step 4.

## Step 2 — Run the chosen scenario

- **Fresh init** → run `$BRAIN init --providers <ids>`. It is additive (never overwrites existing content), stamps dates, installs the suite into `.agents/skills`, creates the provider symlinks + canonical `AGENTS.md`, writes the manifest, and reports created/kept/adopted/installed/linked per path. Relay anything `adopted`, `kept`, or `conflict` to the user.
- **Brain already present, just adding providers** → run `$BRAIN link --providers <ids>` (additive; keeps already-wired providers).
- **Legacy layout** (scan shows `brain/` but `canonical-skills … absent`, i.e. skills still under `.claude/skills`) → explain the move and **confirm**, then run `$BRAIN upgrade`: it relocates the skills to `.agents/skills`, symlinks the old path back, promotes any root `CLAUDE.md` into `AGENTS.md`, and wires detected providers. Non-destructive, but note it pulls along any non-brain skills in that dir (they stay reachable via the symlink).
- **Migration (mode B)** → read [references/migration.md](references/migration.md) and follow it. It runs `$BRAIN init --providers <ids>` at the right point, then moves content with your judgment, deleting old sources only after confirmation.

## Step 3 — Wire additional project advisors

The four shipped advisors (`ux-advisor`, `design-engineer`, `adversarial-verifier`, `review-classifier`) are already wired into the skill bodies and installed under `.agents/agents/` — do not re-wire them. This step finds any *additional* project-specific advisors. Read [references/advisor-detection.md](references/advisor-detection.md): the scan listed `agent-definition` findings (the shipped four are among them — ignore those), classify the rest, and add them to the `## Project Advisors` block (between the `init-brain:advisors` markers) in create-spec / create-plan / implement-spec. Advisor edits inside the markers are hash-normalized by the CLI, so they never block a future `brain upgrade`. If no other advisors exist, leave the blocks as the placeholder.

## Step 4 — Adapt design-engineering to the frontend stack

The `design-engineering` skill writes its framework-specific examples for React with Motion for React. Make it fit this project once, now, so no later motion task has to guess. With the stack confirmed in Step 1, read the installed suite's `design-engineering/references/stack-adaptation.md` (under `.agents/skills/` by default; if it is missing, the install predates it — run `$BRAIN upgrade`, or `$BRAIN upgrade --skill design-engineering` to add only that skill) and follow it:

- **React on the web** → a short profile: the references apply as written; record which motion and UI libraries are installed. No research.
- **Any other stack** — web (Vue, Svelte, Angular, Solid, Astro, vanilla, …) or native (React Native, Flutter, SwiftUI, Compose) → **research** the stack's equivalents for every row of its checklist from primary sources at the installed version (official docs, a docs MCP such as Context7, web search), each with its source and a verified/unverified status.
- **No UI** → a profile with `Framework: none`.

The result is `brain/chore/motion-stack.md`, linked from `brain/index.md` and logged in `brain/log.md`. It is project-owned (not in the manifest), so `brain upgrade` never touches it. Install nothing: libraries the stack lacks go under the profile's Open decisions. Relay the detected stack, any `unverified` rows, and the open decisions in the final report.

## Step 5 — Point the root AGENTS.md at brain

The CLI made the repo-root `AGENTS.md` canonical (creating a stub if none existed, or promoting an existing `CLAUDE.md` into it). Ensure it carries a one-line pointer to `brain/` and its skills under a "repo map" / "knowledge" section, and that the project's own **gates** (build/test/lint commands, review gates, contract/codegen chains) live there — that is their home now, there is no separate constitution file. Edit **`AGENTS.md` only**; the holdout files (`CLAUDE.md`, …) are symlinks to it — never hand-edit them. If a fresh project filled `AGENTS.md` with the stub, replace the `<!-- … -->` placeholder with the real gates (ask the user if unknown).

## Step 6 — Verify and report

```bash
$BRAIN doctor
```

Then read [references/verify.md](references/verify.md) for the intelligent checks the CLI cannot do (foreign tokens, legacy path references) and print the final report (mode, created/updated/migrated/deleted, advisors wired, the stack profile, next step — usually `create-spec`).

## Never do

- Overwrite existing `brain/` content — `brain init` is additive by design; do not "fix" that with manual copies.
- Delete any legacy source in migration mode without explicit confirmation **and** a check that the content now exists in `brain/`.
- Hardcode *project-specific* advisor names anywhere except between the `init-brain:advisors` markers — the shipped advisors (`ux-advisor` / `design-engineer` / `adversarial-verifier` / `review-classifier`) are referenced in the skill bodies by design and are not project-specific.
- Edit the installed `design-engineering` skill to fit the stack — the adaptation lives in `brain/chore/motion-stack.md`, which the skill reads first; an edited skill turns every `brain upgrade` into a conflict.
- Bypass the CLI for scaffolding or skill installs — the manifest it writes is what keeps `brain upgrade` safe later.
- Hand-create a provider's `skills/` dir or copy skills into `.claude/skills` — let `brain init --providers` / `brain link` make the symlinks so `.agents/skills` stays the one canonical copy.
