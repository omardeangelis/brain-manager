# brain-manager

A CLI + [Claude Code](https://claude.com/claude-code) skill that bootstraps and maintains the **`brain/`** knowledge base and its spec-driven skill suite in any project.

Two layers, by design:

- **The `brain` CLI** (this package) does the *mechanical* work — deterministic, testable, agent-agnostic: scaffold `brain/`, install the skill suite, track every installed file in a manifest, sync safely on upgrade.
- **The `init-brain` skill** is the *intelligent* layer an LLM runs — it chooses fresh-init vs migration, folds legacy docs into `brain/`, classifies project advisor agents, and verifies the result. It drives the CLI for everything mechanical.

## Get started

The fastest path — let your IDE / AI assistant drive it. **No clone, no global install.**

Open your project and tell your AI assistant:

> Run `npx -y brain-manager onboard` and follow it.

`brain onboard` prints the orchestration playbook — fresh from this package, with its references inlined — straight to stdout. Your assistant reads it and drives the whole setup: it scans the repo and **asks you what you want**:

- **Skills + fresh scaffold** — install the spec-driven skills and a fresh, empty `brain/`.
- **Reorganize existing knowledge** — fold your existing docs / specs / tech-debt into `brain/` the brain way (migration).

On a project that already has a `brain/` from an older version, it takes the upgrade path instead (see [Upgrading an existing project to 0.7.0](#upgrading-an-existing-project-to-070)).

It also detects which AI tools your repo already uses (`.claude`, `.codex`, `.cursor`, …) and **asks which to wire** — setting up a shared `.agents/` folder that every chosen tool reads. It detects the frontend stack too (asking when it can't tell) and adapts the motion skill to it — for anything other than React it researches the framework's own equivalents. Then it wires project advisors and verifies with `brain doctor`. Nothing is installed on your machine and nothing can drift — the playbook is read from the package on every run.

> **Want a reusable `/init-brain` slash command** (Claude Code only)? Install the skill once per machine: `npx -y brain-manager install-skill`. It copies the same orchestrator into your global skills dir (`~/.agents/skills` / `~/.claude/skills`). Re-run it (or pass `--force`) to re-sync if it ever drifts.

> **Just the mechanical scaffold, no AI?** Run `npx -y brain-manager init` inside the project. You get `brain/` + the skill suite, but skip the scan, the fresh-vs-migration choice, and advisor wiring.

## CLI

```bash
npx -y brain-manager <command>     # or: npm i -g brain-manager
```

| Command | What it does |
|---|---|
| `brain onboard` | Print the `init-brain` orchestration playbook (with references inlined) to stdout for an AI assistant to follow — **no install, no drift**. The drift-free entry point: read fresh from the package every run. `--json` for the structured body. |
| `brain install-skill [skill]` | Copy the `init-brain` orchestrator skill into your global skills dir (`~/.agents/skills` / `~/.claude/skills`) so `/init-brain` works in every project — **no clone needed**. Name a suite skill (`brain install-skill design-engineering`) to install just that one, outside any brain project; agents linked to it come along (`~/.claude/agents`, or next to `--skills-dir`; `--agents-dir` to override). These copies are untracked: an existing install is kept (`up-to-date` / `exists`) unless you pass `--force`. |
| `brain init` | Scaffold `brain/` + install the 12 skills into the canonical `.agents/skills` and the 5 advisor subagents into `.agents/agents`, then wire the chosen AI providers (`--providers claude,codex,cursor`; auto-detects if omitted). Writes the project config `brain/brain.config.json` from what it detects plus flags (`--review-mode total\|plan\|none`; advanced: `--review-location`, `--tech-debt-dir`, `--personas`). **Additive**: existing files are never overwritten — pre-existing skills are *adopted* into the manifest instead, and an existing config only gains missing keys, and flags never change it (they are reported as ignored; use `brain config set`). Writes `brain/.brain-manifest.json`. |
| `brain link` | Wire (or add) AI providers into the `.agents/`-canonical layout: symlink `<provider>/skills → ../.agents/skills` for skill-capable tools and the root `AGENTS.md` for the rest. Idempotent and additive; `--force` to replace a conflicting path. A `CLAUDE.md` identical to `AGENTS.md` is linked without `--force`; one with its own content is never discarded, not even with `--force` — reconcile it into `AGENTS.md` first. |
| `brain upgrade` | Sync installed skills to this package version. Manifest-aware: untouched files update, locally modified files are skipped as conflicts (`--force` to overwrite, `--dry-run` to preview). Auto-migrates a legacy `.claude/skills` install to the `.agents/` layout (`--no-migrate` to skip). `--skill <name>` (repeatable) installs or updates just that skill and the agents linked to it, with the same conflict rules, and leaves everything else — other skills, agents, `brain/`, the config, the manifest version — as it is. A full run writes `brain/brain.config.json` when an older install has none (detected paths, `review.mode` defaulted to `total`), or adds the keys an older config lacks; existing values never change. |
| `brain doctor` | Read-only health check: the project config (valid, and every configured path exists), scaffold structure, unstamped placeholders, manifest, skill drift, files inside the bundled skills that the package does not ship (`untracked`), and provider symlinks. Exit 1 on problems. |
| `brain scan` | Inventory the repo: legacy doc stores, loose specs, agent definitions, installed skills, **which AI providers are present, the frontend stack** (framework, meta-framework, motion and UI libraries per manifest), **and the project context** — persona sources, the tech-debt store, where review reports live, the root router's state and what it carries (gates, brain pointer, review policy, …) — with a suggested config and a reason per value. Feeds the LLM's mode, provider, stack, and config decisions. |
| `brain config get [key]` / `brain config set <key> <value>` | Read the resolved project config (defaults applied), or change one key with validation — an invalid value is rejected with the allowed set. |

All commands take `--json` for machine/agent-friendly output.

### How upgrades stay safe

`brain init` records a content hash for every file it installs. `brain upgrade` then compares manifest / disk / bundled-assets three ways: a file you never touched updates silently; a file you edited becomes a `conflict` and is left alone. Two ownership rules on top:

- **`brain/` content is yours** (seed): written once, restored only if deleted, never overwritten. The one exception is the two **Brain Schema** files (`brain/AGENTS.md` / `brain/CLAUDE.md`), which are *managed* — schema improvements reach you on upgrade, and a copy you edited locally becomes a skipped `conflict` (never a silent overwrite).
- **The `## Project Advisors` blocks are yours**: hashes are computed with the block normalized away, so LLM-wired advisors never count as a modification and are carried over on every update.
- **Project facts live outside the skills.** Review policy, tech-debt and review paths, and personas are read at runtime from `brain/brain.config.json` and the project files it points to. You never edit an installed skill or agent to fit your project, so upgrades stay conflict-free.

## Project configuration

`brain/brain.config.json` is project-owned (seed): `brain init` writes it from what it detects, `brain upgrade` only adds missing keys, `brain doctor` validates it, and `brain config get|set` reads and changes it. No file means every default: the 0.6.0 review behavior, with supervised delegation.

```json
{
  "version": 1,
  "review": { "mode": "total", "location": "spec-folder" },
  "paths": { "techDebt": "brain/tech-debt", "reviews": "brain/review", "personas": null },
  "execution": { "delegation": "supervised" }
}
```

| Key | Values | Default | What it decides |
|---|---|---|---|
| `review.mode` | `total` \| `plan` \| `none` | `total` | which clean-context reviews the flows start on their own (below) |
| `review.location` | `spec-folder` \| `review-tree` | `spec-folder` | a spec's review lands inside the spec folder, or at `<reviews>/<domain>/<spec>/` |
| `paths.techDebt` | repo-relative dir | `brain/tech-debt` | the tech-debt store, one page per spec |
| `paths.reviews` | repo-relative dir | `brain/review` | standalone reviews (and spec reviews under `review-tree`) |
| `paths.personas` | repo-relative file, or `null` | `null` | the project's personas page, read by `ux-advisor`, `create-spec` and `prototype` |
| `execution.delegation` | `supervised` \| `inline` | `supervised` | who writes each task's code in `implement-spec` (below) |

**Review modes.** Explicit `/adversarial-review` (or asking for a verifier pass) works in every mode; the mode only decides what the flows start on their own.

| Gate | `total` | `plan` | `none` |
|---|---|---|---|
| `create-spec`: verifier on `SPEC.md` | runs | self-check only | — |
| `create-plan`: verifier on `PLAN.md` | runs | runs | offered |
| `implement-spec`: `adversarial-review` before the acceptance audit | runs | offered | offered |
| a `PLAN.md` task that lists review as a closing step | executed | offered | offered |

**Execution delegation.** Under `supervised`, `implement-spec` acts as a supervisor in both execution modes. It writes each task's RED test, hands the task to one worker on the model tier the plan's `complexity` names (`low` → fast, `medium` → balanced, `high` → strongest; in Claude Code `haiku`, `sonnet`, inherited), and reviews the result itself. A failed review goes back to the same worker with a concrete fix. After two failures, a worker one tier up takes over; after that, the supervisor does it or reports a blocker. `inline` turns this off. `brain init --delegation inline` or `brain config set execution.delegation inline`.

**Root router.** `AGENTS.md` is canonical. `brain link` promotes a lone `CLAUDE.md` (also when `AGENTS.md` is a symlink to it), links an identical one, and refuses to discard a differing one even with `--force`: init-brain merges its sections into `AGENTS.md` (you confirm the diff), then links it.

## The UX and UI reviews: prototype first, then reviews with evidence

`ux-advisor` and `ui-reviewer` run at one moment only: when you approve the winner of a `prototype` run. `prototype` spawns them in parallel, each on its own `agent-browser` session, and gives you one combined verdict, the stricter of the two.

> UX → `ux-advisor` · static UI of the rendered page → `ui-reviewer` (bar and probes: the `ui-review` skill) · motion and interaction craft → `design-engineer` (`design-engineering`)

```
prototype ──(you keep a winner)──▶ ux-advisor + ui-reviewer, in parallel ──▶ create-spec
                                        │  verdict `iterate`  ▲                    ▲
                                        ▼                      │ re-review          │ you approve
                          prototype applies ≤ 3 small changes   │ (≤ 2 rounds)      │ the changed
                          you accept ───────────────────────────┘ ──────────────────┘ winner
```

- **The UX review.** It covers UX only: static UI goes to `ui-reviewer`, motion and interaction craft to `design-engineer`. The agent reads the code behind the winner and lists every outcome the real operation can return, including the ones the prototype cannot show (uncertain saves, each error, limits). Then it drives `agent-browser` read-only: it walks each task with the mouse and with the keyboard (where focus goes, what is announced), forces the outcomes it can, tries leaving and interrupting mid-task (Escape, back, closing while it saves, reopening mid-transition), reads every label and message in every state, and walks 2–4 concrete persona situations from your personas page. It also reads the code around the surface.
- **The UI review.** `ui-reviewer` covers first, then measures what it reports. It goes through every state the harness can force, with the longest realistic content, at every width from the project's minimum (280 px by default) to the widest breakpoint, opens a screenshot of each, and checks placement, wrapping, contrast, focus rings, hit areas and names. It backs each finding with a number from the page, using the tested probes of the `ui-review` skill for focus rings, hit areas, composited contrast, width ranges and layout jumps, and axe when the project has a source for it. Every number it states is in a file it kept, and it names the engine behind each finding: Chromium, or Mobile Safari in the iOS Simulator only when Appium with the XCUITest driver is already installed. Otherwise a device finding is marked "not verified on device", with a manual check. Target size belongs to the `ui-review` bar: 24 px by default, 44 or 48 px when the project says touch-first (`brain/chore/ui-review.md` → Project bar).
- **What they return.** Each returns a verdict (`proceed`, `proceed with decisions`, or `iterate` with at most 3 small prototype changes) and ranked decisions (at most 6 from the UX review; every one it measured from the UI review), each with a recommended default, an acceptance criterion and the evidence it observed, plus at most 3 open questions. The UX review bundles its keyboard and announcement fixes, the UI review its mechanical fixes (location · rule · measured → required · fix). A finding with no evidence becomes a question. Without a browser each says so in a `DEGRADED` banner and reports only what the code shows.
- **One iterate loop.** You pick at most 3 changes per round from both reviews, `prototype` applies them, and both reviewers run their regression pass, because a copy fix can re-wrap a row and a hit-area fix can move focus. At most 2 rounds. Then `prototype` shows you the changed winner (its route, each change with its values before → after, screenshots) and waits: you approve it, revert a change, or adjust one. `create-spec` opens only after you approve. If you stop after the reviews, they are saved as `UX-REVIEW.md` and `UI-REVIEW.md` next to the winner, with `CHANGES.md` recording the applied changes and whether you approved them.
- **What it turns into.** `create-spec` makes each decision an acceptance criterion and writes `FLOW.md` as a **map** that cites those criteria. A UX finding and a UI finding on the same element become one criterion: the UI wording carries the cause and the fix, the UX wording the task consequence. UI criteria need no `FLOW.md` row. `SPEC.md` is the only acceptance contract: the verifier checks every criterion and never treats a `FLOW.md` row as scope.
- **Calibration.** Two optional, project-owned pages, `brain/chore/ux-review.md` and `brain/chore/ui-review.md`, hold your stack's component traps, kept examples, and suppressed findings, so a rejected finding does not come back. `ui-review.md` also holds the Project bar (minimum width, target-size standard, supported engines and devices), which you write.
- **After implementation.** The implementation adds defects the prototype did not have, so `adversarial-review` runs a **UI pass** on any change to rendered-UI code: an `adversarial-verifier` run with the `ui-review` bar and probes, against the route the review serves from your root `AGENTS.md` dev command.

A user-facing spec with no prototype gets no `FLOW.md`; `create-spec` says no UX or UI review ran and suggests `/prototype`.

## Feature improvements: proposed, never written on their own

Next to the tech-debt store, `brain/feature-improvement/<domain>/<spec>.md` collects improvements to a feature noticed during the work: what the feature could do better than its spec asked, as opposed to tech debt, which is what the code owes against what was decided.

- **Proposed, then recorded.** `implement-spec` (at its final report), `adversarial-review` (at its closeout; verifiers list up to 3 candidates apart from their findings) and `create-spec` (ideas the spec leaves out) explain each candidate: what was seen and where, the improvement, who gains, its size. Each one is recorded only when you accept it. Workers and verifiers never write the store, and `docs-maintenance` never folds findings or notes into it.
- **Fed back into specs.** `create-spec` reads the domain's `open` improvements before its questions and offers the ones your request touches; one it takes up becomes `planned`, and `docs-maintenance` marks it `done` when the spec is implemented and ingested.

## What ends up in a project

- **`brain/`** — `AGENTS.md` + `CLAUDE.md` (the Brain Schema), `index.md`, `log.md`, the `raw/ specs/ domains/ chore/ tech-debt/ feature-improvement/ review/` layout, `.brain-manifest.json`, and the project config **`brain.config.json`**. When the project's personas lived inside an agent or the router, init-brain extracts them verbatim to **`brain/personas.md`**.
- **A canonical `.agents/skills/`** holding the suite once, with each chosen provider symlinked into it (`.claude/skills → ../.agents/skills`, …) so every AI tool reads the same files.
- **A canonical `.agents/agents/`** holding the shipped advisor subagents once, symlinked into each agent-capable provider (`.claude/agents → ../.agents/agents`).
- **A root `AGENTS.md`** as the canonical instruction file (read natively by ~20 tools incl. Codex & Cursor), with `CLAUDE.md → AGENTS.md` for Claude. This is also where the project's own gates (build/test/lint) live, with a pointer to `brain/`.
- **Nine process skills**, generic and brain-wired: `create-spec`, `create-plan`, `grill-me`, `tdd`, `swarm-plan`, `implement-spec`, `docs-maintenance`, `adversarial-review`, and `prototype` (explicit invocation only — builds N divergent variants of one UI piece behind a visual picker; the winner feeds `create-spec`).
- **The `design-engineering` reference skill** — the motion-craft bar: when to animate and exact values (easing curves, durations, springs, origins), gestures, scroll, reduced motion, performance, plus the review rubric, audit/opportunities procedures, diagnosis loop, and motion-brief template. Loads on its own whenever motion is written, reviewed, or fixed; the `design-engineer` agent and `prototype` run on it. The agent is linked to it through its frontmatter `skills:` list — Claude Code preloads the skill into the agent, and the CLI always installs and updates the two together. Its code examples are React; on any other stack (Vue, Svelte, Angular, Solid, Astro, React Native, Flutter, SwiftUI, Compose, …) a researched **stack profile** in `brain/chore/motion-stack.md` maps every React API to the project's own, written at init or on first use.
- **The `ui-review` reference skill** — the static-UI bar: one page per class (placement and geometry, widths and wrapping, contrast, focus-indicator visibility, target size and hit area, accessible-name markup, browser and device rendering), each with its rule source, what the project can override and the evidence that proves it; the seven tested probes, run through `agent-browser` with `bash <skillsDir>/ui-review/scripts/probe.sh …`; a fixture page with each probe's expected result; the driver traps; and the axe and device notes. Never downloads or installs anything during a review. The `ui-reviewer` agent and the UI pass of `adversarial-review` run on it. Like `design-engineering`, it is linked to its agent through the agent's `skills:` list, so `brain install-skill ui-review` and `brain upgrade --skill ui-review` bring `ui-reviewer` along. Your overrides (minimum width, target-size standard, supported engines and devices) live in `brain/chore/ui-review.md`.
- **Five advisor subagents**, spawned by the spec-driven skills to verify reasoning off the orchestrator's context: `ux-advisor` (reviews the UX of the approved `prototype` winner in the browser and returns ranked decisions with evidence — see above), `ui-reviewer` (reviews the static UI of the same winner, in parallel with `ux-advisor`: measures with the `ui-review` probes, names the engine behind every finding, and returns ranked decisions with evidence; also on a live route you name), `design-engineer` (motion / interaction-craft advisor routed through `design-engineering`: motion budget and exact values for `create-plan`, `implement-spec`, and the `adversarial-review` motion-craft pass; standalone review, audit, opportunities, diagnosis, and library-pick modes), `adversarial-verifier` (clean-context quality gate → SHIP / DO NOT SHIP; it also runs the motion-craft and UI passes), and `review-classifier` (routes the `adversarial-review` pipeline).
- **The `agent-browser` tool skill** — the upstream discovery stub, with its Apache-2.0 `LICENSE` next to it. The usage guide is served by the CLI itself: everything that drives the browser runs `agent-browser skills get core` first, so the guide always matches the installed version. The CLI is a separate `npm i -g agent-browser` (0.27.1 or later), which `ux-advisor`, `ui-reviewer` and the UI pass need; without it they run `DEGRADED`. Appium with the XCUITest driver is optional and adds Mobile Safari for the device checks; nothing installs it for you. A pre-existing project-specific copy of the skill is detected and never clobbered.

## Release notes — 0.9.0

- **Approval gate after the reviews.** When the `prototype` iterate loop changes the winner, `create-spec` no longer opens right away. `prototype` reloads the winner, checks each change on screen, and shows you the route, each change with its reviewer and its values before → after, the screenshots and the last verdict. Then it waits: approve, revert a change (its finding goes back to the spec as a decision), or adjust one. The reviewers' verdict never counts as your approval. If you stop at the gate, `CHANGES.md` is saved next to `UX-REVIEW.md` and `UI-REVIEW.md` with `approved: no`, and `create-spec` shows the changed winner for approval before writing.
- **Feature-improvement store.** New `brain/feature-improvement/<domain>/<spec>.md`, next to the tech-debt store: what a feature could do better than its spec asked, noticed during the work. Entries move `open` → `planned` → `done` (or `dropped`). See "Feature improvements" above.
- **Proposed, never written on their own.** `implement-spec` (final report), `adversarial-review` (closeout) and `create-spec` (ideas the spec leaves out) explain each candidate and record only the ones you accept. Workers and verifiers never write the store; `adversarial-verifier` lists up to 3 improvement candidates apart from its findings, with no severity and no effect on the verdict. `create-spec` offers the domain's `open` entries before its questions, and `docs-maintenance` marks an implemented one `done`.
- **Upgrading from 0.8.** `brain upgrade` installs `brain/feature-improvement/` and updates the Brain Schema and the changed skills (`prototype`, `create-spec`, `implement-spec`, `adversarial-review`, `docs-maintenance`) and `adversarial-verifier`. `brain/brain.config.json` is untouched: the store's path is fixed, not a config key. Until you upgrade, `brain doctor` reports `brain/feature-improvement/` as missing. Your `brain/index.md` is project-owned and kept as it is: add a `## Feature improvements` section by hand, or let the first recorded entry add it. An edited skill or schema is skipped as a conflict: move your project facts out and run `brain upgrade --force`.

## Release notes — 0.8.0

- **Supervised delegation.** `implement-spec` no longer writes every task with the orchestrator's model. Each task goes to a worker on the tier its `complexity` names; the orchestrator writes the RED test, reviews every result itself, sends back concrete fixes, and escalates one tier after two failed reviews. It applies to `sequential` as well as `parallel`, and only the orchestrator writes `PLAN.md` and `IMPLEMENTATION-NOTES.md`. New config key `execution.delegation` (`supervised` default · `inline`), and `brain init --delegation`.
- **Task complexity.** `swarm-plan` and `create-plan` rate every task `low` · `medium` · `high` with one rubric (the same vocabulary `review-classifier` uses for verifier passes). An older plan without ratings still runs: `implement-spec` rates the tasks before spawning.
- **Worker brief.** `parallel-worker-brief.md` became `worker-brief.md`, shared by both modes and narrower: exact files, the RED test, the validation commands; no plan reading or codebase research for the worker. The dangling `.agents/subagents/manifest.mjs` reference is gone.
- **Upgrading from 0.7.** `brain upgrade` adds `execution.delegation: supervised` to an existing `brain/brain.config.json` without touching the other keys, installs `delegation.md` and `worker-brief.md`, and removes an unedited `parallel-worker-brief.md` (the orphan rule). An edited `implement-spec`, `swarm-plan` or `create-plan` is skipped: move your project facts out and run `brain upgrade --force`, or keep 0.7 execution with `brain config set execution.delegation inline`.

## Release notes — 0.7.0

- **Project config.** New `brain/brain.config.json` (review mode, review location, tech-debt / reviews / personas paths), written by `init`, completed by `upgrade`, validated by `doctor`, edited with the new `brain config`. Every suite skill and agent reads it; paths in the skills are now tokens (`<techDebt>`, `<reviews>`, `<personas>`).
- **Review modes** `total` (default, the 0.6.0 behavior) · `plan` · `none` decide which reviews the flows start on their own.
- **The UX trigger moved.** `ux-advisor` no longer runs from `create-spec`, `create-plan` or `implement-spec`; it runs only after you approve a `prototype` winner (or when you ask, on a live route). The agent was redesigned: it reviews the UX of the rendered UI in the browser and in the code behind it, with evidence and caps, leaves static UI to `ui-reviewer` and motion and interaction craft to `design-engineer`, and never writes files.
- **Measured, not just rewritten.** The redesign was accepted on a replay of three shipped specs. From each approved prototype it found 17 of the 27 UX defects that later surfaced in review or in fixes, against 14 for the old agent's `FLOW.md`. Each review ran about 70–90 lines, against 350–735 for the old `FLOW.md`, and every decision came with a default and an acceptance criterion.
- **A UI reviewer.** New `ui-reviewer` agent and its companion skill `ui-review`: the static-UI bar (seven classes, one page each), seven tested probes, and a fixture page with each probe's expected result. After you keep a `prototype` winner, `ui-reviewer` reviews it in parallel with `ux-advisor`. You get one combined verdict and one shared iterate loop, and `create-spec` merges a UX and a UI finding on the same element into one criterion. It measures before it judges, names the engine behind every finding, uses Mobile Safari only when Appium with the XCUITest driver is already installed, and installs nothing.
- **One owner per concern.** UX → `ux-advisor` · static UI of the rendered page → `ui-reviewer` (bar and probes: the `ui-review` skill) · motion and interaction craft → `design-engineer` (`design-engineering`). Every agent, skill and doc states it the same way. The 44 px tap-target rule left the motion references. Target size belongs to the `ui-review` bar: 24 px by default, 44 or 48 px when the project says touch-first (`brain/chore/ui-review.md` → Project bar).
- **The UI pass.** `review-classifier` charters a UI pass in `adversarial-review` when a change touches rendered-UI code (markup, styles, tokens, ARIA, inline SVG). The orchestrator serves the route from the root `AGENTS.md` dev command and stops the server it started; `adversarial-verifier` measures the change with the `ui-review` bar and probes, still read-only. Without a route the pass runs on the code only, `DEGRADED`; without the skill it does not run, and `REPORT.md` says why. It runs whenever a review runs.
- **Verifier contract.** `adversarial-verifier` and `adversarial-review` judge the `SPEC.md` acceptance criteria only; `FLOW.md` is a map that locates them. `FLOW.md` files in the older format (Error paths / Edge cases) are still read everywhere, but only the rows a numbered criterion covers are verified.
- **Review ingest.** `docs-maintenance` now ingests `REPORT.md` files: durable findings go to the tech-debt store, the report is backlinked and marked ingested.
- **Router.** An identical `CLAUDE.md` is linked without `--force`; a differing one is never discarded. `scan` reports the router's state and what it carries.
- **The `agent-browser` stub.** The bundled `agent-browser` skill is now the upstream discovery stub, with its Apache-2.0 `LICENSE`. Everything that drives the browser runs `agent-browser skills get core` first, so the usage guide always matches the installed CLI. `upgrade` replaces an untouched old copy and removes its references and templates; a project-owned copy is left alone.
- **The orphan rule.** `upgrade` now cleans up files the package no longer ships, in every skill. A file the manifest tracks as `managed` and that you never edited is `removed`, with the folders it leaves empty; `--dry-run` lists it as `would remove`. An edited one, or one whose `## Project Advisors` block holds entries, stays on disk as `orphan`, even with `--force`. One already gone only leaves the manifest. A `--skill` run touches only its own skill. Before the upgrade, `doctor` lists them as `orphan` and still exits 0.
- **Agent memory.** `adversarial-verifier` and `review-classifier` declare `memory: project` (Claude Code); `ux-advisor`, `ui-reviewer` and `design-engineer` keep none.
- **An upgrade path in init-brain.** On a project with an older `brain/`, the playbook previews `brain upgrade`, resolves the conflicts that would mix versions, records the project context, and cleans what an older install left behind (below).

## Upgrading an existing project to 0.7.0

Tell your AI assistant:

> Run `npx -y brain-manager@latest onboard` and follow it.

The playbook sees the existing `brain/` and takes the upgrade path. It previews `brain upgrade`, runs it, then walks you through what the CLI cannot decide alone. The mechanical part on its own is:

```bash
npx -y brain-manager@latest upgrade --dry-run
npx -y brain-manager@latest upgrade
npx -y brain-manager@latest doctor
```

`upgrade` syncs the skills and agents you never edited, installs the new ones (`ui-review` and `ui-reviewer`), updates the Brain Schema, removes the files this version no longer ships (the orphan rule, below), and writes `brain/brain.config.json` from what it detects. With `review.mode: total` and the default paths, every review gate fires as in 0.6. The behavior changes you get either way are the review trigger (`ux-advisor` and `ui-reviewer`, after you keep a `prototype` winner) and the UI pass in `adversarial-review`. What still needs you (the playbook asks about each):

- **Review mode.** `upgrade` writes `total` even when your router says review is opt-in. Set yours with `brain config set review.mode plan` (or `none`), and let the playbook replace the router's hand-written review step with a pointer to the config.
- **Personas.** `paths.personas` starts at `null`, so `ux-advisor` describes users generically. Point it at your personas page with `brain config set paths.personas <file>`, or let the playbook extract personas that live inside an agent or the router into `brain/personas.md`.
- **The old UX wiring.** An older init-brain may have wired your UX or design agent into the `## Project Advisors` blocks of `create-spec`, `create-plan` and `implement-spec`. Those blocks are yours, so `upgrade` keeps them, and the old UX trigger keeps firing until the entries are removed. Project agents that duplicate a shipped one are replaced; a UI-review or visual-QA agent of your own now duplicates `ui-reviewer`. Their notes move to `brain/personas.md`, `brain/chore/ux-review.md`, `brain/chore/ui-review.md` (the Project bar stays yours to write), `brain/chore/motion.md` or the root `AGENTS.md`.
- **Conflicts that mix versions.** A file you edited is skipped. Three groups only work together:
  - the Brain Schema: the skills point at its new "Project configuration" section;
  - `prototype`, `create-spec`, `create-plan`, `implement-spec` and `ux-advisor`: the new UX and UI review flow (an old `prototype` never spawns `ui-reviewer`);
  - `adversarial-review`, `adversarial-verifier` and `review-classifier`: `SPEC.md` as the only contract, and the UI pass.

  Move your project facts into the config or `brain/`, then run `brain upgrade --force`.
- **Specs in flight.** `FLOW.md` files in the older format are still read, but only numbered `SPEC.md` acceptance criteria are verified. Lift the rows you want enforced into criteria before implementing.
- **Old review reports** never reached the tech-debt store. Run `docs-maintenance` on each `REPORT.md` to ingest it.
- **The browser.** `ux-advisor`, `ui-reviewer` and the UI pass need `npm i -g agent-browser` (0.27.1 or later) and a dev route that serves the page. Without them each reviews from the code only, under a `DEGRADED` banner. Appium with the XCUITest driver is optional: when it is already installed, `ui-reviewer` adds Mobile Safari in the iOS Simulator; otherwise its device findings say "not verified on device".
- **Leftovers.** Files the package no longer ships, such as the old `agent-browser` references and templates, follow the orphan rule. `upgrade --dry-run` lists each removable one as `would remove`. The real run removes it (`removed`) when the manifest tracks it as `managed` and it still matches its manifest hash, with the folders it leaves empty. An edited one, or one whose `## Project Advisors` block holds entries, is never deleted, even with `--force`: it stays on disk as `orphan` ("left on disk") and leaves the manifest. One already gone is `orphan` ("missing on disk") and only leaves the manifest. Move any project fact out of a kept file, then delete it by hand; until then `brain doctor` lists it as `untracked`, without failing.
- **Agent memory.** `adversarial-verifier` and `review-classifier` now keep notes under `.claude/agent-memory/<agent>/` (Claude Code).

Unchanged: `FLOW.md` stays optional, a `CLAUDE.md` with its own content is never discarded, and your `## Project Advisors` entries never count as edits.

## Repo layout

```
brain-manager/
├── src/                  # the Effect-based CLI
│   ├── bin.ts            # entrypoint (provides NodeContext + Assets)
│   ├── Cli.ts            # command tree
│   ├── commands/         # onboard / install-skill / init / link / upgrade / doctor / scan / config
│   ├── core/             # pure logic: manifest, upgrade planner, advisor blocks, skill↔agent links, frontend and project-context detection, project config, router analysis, hashing
│   └── services/         # Assets service, fs helpers, linker, project config writer, context collector
├── assets/
│   ├── brain/            # the brain/ scaffold stamped into projects
│   ├── agents/           # the 5 shipped advisor subagents (→ .agents/agents)
│   └── skills/           # the 12 bundled suite skills
├── skills/init-brain/    # the orchestrator skill (drives the CLI)
├── specs/                # specs, plans and evidence for the package itself (not shipped)
└── test/                 # integration tests and EVAL.md, the release checklist
```

Built with [Effect](https://effect.website) (`@effect/cli`, `@effect/platform`). `npm run build`, `npm test`.

## Development & maintaining

This repo is the single source of truth. Releases are automatic: bump `version` in `package.json` in your PR, and when it merges to `main` the [Publish workflow](.github/workflows/publish.yml) verifies it and stages it on npm (trusted publishing, with provenance). A staged version goes live only once a maintainer approves it with 2FA, on npmjs.com or with `npm stage approve <stage-id>` (the id is in the run summary); merges that don't bump the version stage nothing. End users get everything through `npx` / `npm` — **a clone is never required** to use brain-manager. They install the skill with `brain install-skill` and pick up new versions via `npx`/`npm update` and `brain upgrade`.

If you're hacking on the CLI or the skill itself, install the skill as a **symlink** to your working copy so edits are picked up live (instead of `brain install-skill`, which copies):

```bash
git clone https://github.com/omardeangelis/brain-manager.git
cd brain-manager
./install.sh        # symlinks skills/init-brain into your skills dir + builds the CLI
```

The maintainer's live skill at `~/.agents/skills/init-brain` is symlinked here; the CLI is rebuilt by `install.sh` or `npm run build`. Run `npm run build` and `npm test` after edits.

## License

MIT
