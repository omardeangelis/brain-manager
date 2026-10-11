---
name: init-brain
description: Bootstrap the `brain/` knowledge base and its spec-driven skill suite (create-spec, create-plan, grill-me, tdd, swarm-plan, implement-spec, docs-maintenance, adversarial-review, prototype) plus the design-engineering motion reference (adapted to the project's frontend stack), the ui-review static-UI bar and probes, and the agent-browser validation tool skill into any project, driving the `brain` CLI for the mechanical work. Two modes — fresh init (scaffold + install skills) or migration (move existing domain/chore/tech-debt content into brain, repoint existing skills, delete old sources after confirmation) — plus the upgrade of an existing brain to a newer package version. Use when the user wants to set up brain, initialize the knowledge base, replicate the brain/spec-driven workflow in a new repo, migrate a prior docs/specs structure into brain, or bring an existing brain up to date.
---

# Init Brain

Bootstraps the `brain/` knowledge base and the spec-driven skill suite into the **current project**. The mechanical work (scaffolding, installing skills, manifest bookkeeping) is done by the **`brain` CLI**; this skill is the intelligent layer on top: it chooses the mode, folds legacy content in, classifies advisor agents, and verifies the result.

## What a run produces

- A scaffolded **`brain/`** folder (`AGENTS.md`, `CLAUDE.md`, `index.md`, `log.md`, the `raw/ specs/ domains/ chore/ tech-debt/ review/` layout) plus `brain/.brain-manifest.json`, which makes future `brain upgrade` runs safe.
- The **project config**, `brain/brain.config.json`: the review mode the user chose and where this project keeps its tech debt, reviews and personas. Every suite skill and agent reads it, so the installed files never need editing to fit the project. When personas lived inside an agent or the router, they are extracted verbatim to **`brain/personas.md`**.
- The skill suite installed **once** into the canonical **`.agents/skills/`**, with each chosen AI provider symlinked into it (`.claude/skills → ../.agents/skills`, …). Nine process skills — **create-spec, create-plan, grill-me, tdd, swarm-plan, implement-spec, docs-maintenance, adversarial-review, prototype** (the last one explicit-invocation only) — plus the **design-engineering** motion-craft reference skill, the **ui-review** skill (the static-UI bar and its probes, used by `ui-reviewer` and the UI pass of `adversarial-review`), and the **agent-browser** tool skill: twelve skills in all. The `agent-browser` skill is the upstream discovery stub; the usage guide comes from the installed CLI through `agent-browser skills get core`, so it always matches the version. The CLI itself is a separate `npm i -g agent-browser`.
- Five shipped **advisor subagents** installed into the canonical **`.agents/agents/`** and symlinked into each capable provider (`.claude/agents → ../.agents/agents`): `ux-advisor` (reviews the UX of an approved prototype winner in the browser), `ui-reviewer` (reviews the static UI of the same winner, measuring it with the `ui-review` probes), `design-engineer` (motion and interaction craft), `adversarial-verifier`, and `review-classifier`. The spec-driven skills spawn them to verify reasoning off the orchestrator's context.
- A **stack profile**, `brain/chore/motion-stack.md`: the detected frontend stack and — for anything other than React on the web — a researched translation of the React APIs the `design-engineering` references use into the project's own (Vue, Svelte, Angular, Solid, React Native, Flutter, …).
- A canonical root **`AGENTS.md`** (read natively by ~20 tools, incl. Codex & Cursor) with `CLAUDE.md → AGENTS.md` for Claude — the home for the project's own gates, with a pointer to `brain/`.
- A **`## Project Advisors`** section in create-spec / create-plan / implement-spec listing any *additional* advisor agents detected in the repo (the shipped five are already wired into the skill bodies).

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

## Step 1 — Scan, then confirm mode, providers, stack, and review mode

```bash
$BRAIN scan
```

The scan reports legacy stores, loose specs, agent definitions, installed skills, the canonical-skills state, **which AI providers are present** (`provider` lines, each tagged `skills-capable` or `router-only`), **the frontend stack** (`frontend` lines, one per manifest, plus a `frontend:` verdict note), **and the project context**: `persona-source`, `tech-debt-store`, `review-store` and `router` lines, plus `config:` notes with the suggested config and a reason for each value. Read [references/providers.md](references/providers.md) for what the provider lines mean. Surface **three** explicit choices, plus a fourth only when the stack is unclear, with the scan findings as evidence — never decide silently:

**1. Mode** (legacy content could be moved/deleted — never pick migration silently):

- **A) Skills + fresh scaffold (fresh init)** — install the suite and a fresh, empty `brain/`. Recommend when the scan shows no `brain/` and no legacy store worth absorbing.
- **B) Reorganize existing knowledge (migration)** — fold existing docs / loose specs / tech-debt into `brain/`, repoint skills, remove old sources after confirmation. Recommend when the scan surfaced legacy doc stores, loose specs, or skills pointing at non-`brain/` paths.

When the scan reports `brain/ — present, manifest v<X>` with `<X>` older than the package, neither applies: it is an **upgrade** (Step 2, "Existing brain, older version"). Say so instead of asking for a mode, and still confirm the other choices.

**2. Providers** — which AI tools to wire into the shared `.agents/` layout:

- If the scan found `provider` lines, **recommend wiring all of them** and confirm. Skill-capable tools (Claude, OpenCode, Qwen, Zed) get a `skills/` symlink; router-only tools (Codex, Cursor, Copilot, …) are covered by the root `AGENTS.md` for free.
- If **none** were detected, **ask the user** which tools they use (offer the common ones from [references/providers.md](references/providers.md)). Default to `claude` if they are unsure.

Pass the chosen ids as a comma-separated `--providers` list in the next step.

**3. Frontend stack — only when detection falls short.** Detect first, ask as the fallback:

- The verdict names one stack → state it alongside the other two choices; no question.
- `none detected`, `several frontends`, or a stack that contradicts the root `AGENTS.md` → ask which UI stack the project uses (and, for several, which are in scope), offering the detected candidates plus "no UI in this repo". Common misses: the UI lives in server templates (Django, Rails, Laravel, Phoenix) or in another repo.

The answer feeds Step 4.

**4. Review mode** — how much clean-context review the flows start on their own (`brain/AGENTS.md` → Project configuration → Review modes):

- **`total`** (default) — the spec, the plan and the code are reviewed;
- **`plan`** — only the plan is reviewed; code review runs on request;
- **`none`** — every review runs only on request.

Recommend the value the scan suggests, with its reason (`config: review.mode = … — <reason>`: a review policy the root router states). With no stated policy, recommend `total`. Explicit `/adversarial-review` works in every mode.

## Step 1b — Project context

Read [references/project-context.md](references/project-context.md) and decide, with the user, where the personas, the tech-debt store and the reviews live. Nothing is written yet: the decisions become flags in Step 2 (or `$BRAIN config set` calls on an existing brain).

## Step 2 — Run the chosen scenario

- **Fresh init** → run `$BRAIN init --providers <ids> --review-mode <mode>`, plus the project-context flags from Step 1b (`--review-location`, `--tech-debt-dir`, `--personas`). It is additive (never overwrites existing content), stamps dates, installs the suite into `.agents/skills`, creates the provider symlinks + canonical `AGENTS.md`, writes the manifest, and reports created/kept/adopted/installed/linked per path. Relay anything `adopted`, `kept`, or `conflict` to the user.
It also writes `brain/brain.config.json` (detected values ⊕ flags) and reports each value with its reason; relay them.
- **Existing brain, older version** (scan: `brain/ — present, manifest v<X>`, older than `$BRAIN --version`) → read [references/upgrade.md](references/upgrade.md) and follow it: a previewed `$BRAIN upgrade`, the conflicts that leave old and new behavior mixed, the project context, the advisor blocks and legacy twins an older install left, the router, and the specs and reports already in flight. It sends you back to Steps 3, 5 and 6.
- **Brain already present, just adding providers** → run `$BRAIN link --providers <ids>` (additive; keeps already-wired providers). Record the Step 1/1b decisions with `$BRAIN config set <key> <value>`.
- **Pre-CLI install** (scan: `brain/ — present, no manifest`, with the suite as real files under `.claude/skills`) → adopt it in place first with `$BRAIN init --skills-dir .claude/skills --review-mode <mode>` (plus the Step 1b flags), then follow the legacy-layout row below. [references/migration.md](references/migration.md) → "Legacy agents dir" covers a real `.claude/agents`.
- **Legacy layout** (scan shows `brain/` with a manifest but `canonical-skills … absent`, i.e. skills still under `.claude/skills`) → explain the move and **confirm**, then run `$BRAIN upgrade`: it relocates the skills to `.agents/skills`, symlinks the old path back, promotes any root `CLAUDE.md` into `AGENTS.md`, and wires detected providers. Non-destructive, but note it pulls along any non-brain skills in that dir (they stay reachable via the symlink).
- **Migration (mode B)** → read [references/migration.md](references/migration.md) and follow it. It runs `$BRAIN init --providers <ids> --review-mode <mode>` at the right point, then moves content with your judgment, deleting old sources only after confirmation.

Then finish the project context: write `brain/personas.md` when Step 1b chose an extraction, and set any key the flags did not cover (`$BRAIN config set …`). `$BRAIN upgrade` on an install that predates the config writes one from detection with `review.mode` defaulted to `total`: set the chosen mode afterwards.

## Step 3 — Wire additional project advisors

The five shipped advisors (`ux-advisor`, `ui-reviewer`, `design-engineer`, `adversarial-verifier`, `review-classifier`) are already wired into the skill bodies and installed under `.agents/agents/` — do not re-wire them. This step finds any *additional* project-specific advisors. Read [references/advisor-detection.md](references/advisor-detection.md): the scan listed `agent-definition` findings (the shipped five are among them — ignore those), recognize **legacy twins** of the shipped five by its alias table, and a project's own UI-review or visual-QA agents as twins of `ui-reviewer` (they are replaced, never wired, after their project facts are routed to the config, `brain/personas.md`, the root `AGENTS.md` and the review pages `brain/chore/ux-review.md` and `brain/chore/ui-review.md`), classify the rest, and add them to the `## Project Advisors` block (between the `init-brain:advisors` markers) in create-spec / create-plan / implement-spec. Advisor edits inside the markers are hash-normalized by the CLI, so they never block a future `brain upgrade`. If no other advisors exist, leave the blocks as the placeholder.

## Step 4 — Adapt design-engineering to the frontend stack

The `design-engineering` skill writes its framework-specific examples for React with Motion for React. Make it fit this project once, now, so no later motion task has to guess. With the stack confirmed in Step 1, read the installed suite's `design-engineering/references/stack-adaptation.md` (under `.agents/skills/` by default; if it is missing, the install predates it — run `$BRAIN upgrade`, or `$BRAIN upgrade --skill design-engineering` to add only that skill) and follow it:

- **React on the web** → a short profile: the references apply as written; record which motion and UI libraries are installed. No research.
- **Any other stack** — web (Vue, Svelte, Angular, Solid, Astro, vanilla, …) or native (React Native, Flutter, SwiftUI, Compose) → **research** the stack's equivalents for every row of its checklist from primary sources at the installed version (official docs, a docs MCP such as Context7, web search), each with its source and a verified/unverified status.
- **No UI** → a profile with `Framework: none`.

The result is `brain/chore/motion-stack.md`, linked from `brain/index.md` and logged in `brain/log.md`. It is project-owned (not in the manifest), so `brain upgrade` never touches it. Install nothing: libraries the stack lacks go under the profile's Open decisions. Relay the detected stack, any `unverified` rows, and the open decisions in the final report.

## Step 5 — Make the root AGENTS.md canonical and pertinent

Read [references/router.md](references/router.md) and follow it. The CLI made the repo-root `AGENTS.md` canonical where it could: it created a stub when none existed, promoted a lone `CLAUDE.md`, and linked an identical one. A `CLAUDE.md` with its own content is still a `conflict`: reconcile it into `AGENTS.md` (the user confirms the merge), then `$BRAIN link`. Then classify the router (stub / foreign / partial / complete) from the scan's signals, make sure it carries the project's **gates** and a pointer to `brain/`, and propose replacing hand-written process sections that a skill or the config now owns. Edit **`AGENTS.md` only** once the holdout files are symlinks.

## Step 6 — Verify and report

```bash
$BRAIN doctor
```

Then read [references/verify.md](references/verify.md) for the intelligent checks the CLI cannot do (foreign tokens, legacy path references, the `agent-browser` CLI and its version, Appium as optional, the config against the actual project) and print the final report (mode, created/updated/migrated/deleted, the project config, the router, advisors wired, the tools, the stack profile, next step — usually `create-spec`).

## Never do

- Overwrite existing `brain/` content — `brain init` is additive by design; do not "fix" that with manual copies.
- Delete any legacy source in migration mode without explicit confirmation **and** a check that the content now exists in `brain/`.
- Hardcode *project-specific* advisor names anywhere except between the `init-brain:advisors` markers — the shipped advisors (`ux-advisor` / `ui-reviewer` / `design-engineer` / `adversarial-verifier` / `review-classifier`) are referenced in the skill bodies by design and are not project-specific.
- Edit an installed suite skill or shipped agent to fit the project — project facts go in `brain/brain.config.json` or the project-owned file it points to (`brain/personas.md`, the root `AGENTS.md`, `brain/chore/…`); an edited file turns every `brain upgrade` into a conflict.
- Discard a `CLAUDE.md` with its own content — reconcile it into `AGENTS.md` first; `--force` never does it for you.
- Edit the installed `design-engineering` skill to fit the stack — the adaptation lives in `brain/chore/motion-stack.md`, which the skill reads first; an edited skill turns every `brain upgrade` into a conflict.
- Bypass the CLI for scaffolding or skill installs — the manifest it writes is what keeps `brain upgrade` safe later.
- Hand-create a provider's `skills/` dir or copy skills into `.claude/skills` — let `brain init --providers` / `brain link` make the symlinks so `.agents/skills` stays the one canonical copy.
