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
| `brain init` | Scaffold `brain/` + install the 11 skills into the canonical `.agents/skills` and the 4 advisor subagents into `.agents/agents`, then wire the chosen AI providers (`--providers claude,codex,cursor`; auto-detects if omitted). Writes the project config `brain/brain.config.json` from what it detects plus flags (`--review-mode total\|plan\|none`; advanced: `--review-location`, `--tech-debt-dir`, `--personas`). **Additive**: existing files are never overwritten — pre-existing skills are *adopted* into the manifest instead, and an existing config only gains missing keys, and flags never change it (they are reported as ignored; use `brain config set`). Writes `brain/.brain-manifest.json`. |
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

`brain/brain.config.json` is project-owned (seed): `brain init` writes it from what it detects, `brain upgrade` only adds missing keys, `brain doctor` validates it, and `brain config get|set` reads and changes it. No file means every default, which is the 0.6.0 behavior.

```json
{
  "version": 1,
  "review": { "mode": "total", "location": "spec-folder" },
  "paths": { "techDebt": "brain/tech-debt", "reviews": "brain/review", "personas": null }
}
```

| Key | Values | Default | What it decides |
|---|---|---|---|
| `review.mode` | `total` \| `plan` \| `none` | `total` | which clean-context reviews the flows start on their own (below) |
| `review.location` | `spec-folder` \| `review-tree` | `spec-folder` | a spec's review lands inside the spec folder, or at `<reviews>/<domain>/<spec>/` |
| `paths.techDebt` | repo-relative dir | `brain/tech-debt` | the tech-debt store, one page per spec |
| `paths.reviews` | repo-relative dir | `brain/review` | standalone reviews (and spec reviews under `review-tree`) |
| `paths.personas` | repo-relative file, or `null` | `null` | the project's personas page, read by `ux-advisor`, `create-spec` and `prototype` |

**Review modes.** Explicit `/adversarial-review` (or asking for a verifier pass) works in every mode; the mode only decides what the flows start on their own.

| Gate | `total` | `plan` | `none` |
|---|---|---|---|
| `create-spec`: verifier on `SPEC.md` | runs | self-check only | — |
| `create-plan`: verifier on `PLAN.md` | runs | runs | offered |
| `implement-spec`: `adversarial-review` before the acceptance audit | runs | offered | offered |
| a `PLAN.md` task that lists review as a closing step | executed | offered | offered |

**Root router.** `AGENTS.md` is canonical. `brain link` promotes a lone `CLAUDE.md` (also when `AGENTS.md` is a symlink to it), links an identical one, and refuses to discard a differing one even with `--force`: init-brain merges its sections into `AGENTS.md` (you confirm the diff), then links it.

## The UX flow: prototype first, then a review with evidence

`ux-advisor` runs at one moment only: when you approve the winner of a `prototype` run.

```
prototype ──(you keep a winner)──▶ ux-advisor reviews it in the browser ──▶ create-spec
                                        │  verdict `iterate`  ▲
                                        ▼                      │ re-review (≤ 2 rounds)
                          prototype applies ≤ 3 small changes you accept
```

- **The review.** It covers UX only; layout, motion and visual accessibility stay with `design-engineer`. The agent reads the code behind the winner and lists every outcome the real operation can return, including the ones the prototype cannot show (uncertain saves, each error, limits). Then it drives `agent-browser` read-only: it walks each task with the mouse and with the keyboard (where focus goes, what is announced), forces the outcomes it can, tries leaving and interrupting mid-task (Escape, back, closing while it saves, reopening mid-transition), reads every label and message in every state, and walks 2–4 concrete persona situations from your personas page. It also reads the code around the surface.
- **What it returns.** A verdict (`proceed`, `proceed with decisions`, or `iterate` with at most 3 small prototype changes) and at most 6 ranked decisions, each with a recommended default, an acceptance criterion and the evidence it observed, plus one bundled list of keyboard and announcement fixes and at most 3 open questions. A finding with no observed evidence becomes a question. Without a browser it says so in a `DEGRADED` banner and reports only what the code shows.
- **What it turns into.** `create-spec` makes each decision an acceptance criterion and writes `FLOW.md` as a **map** that cites those criteria. `SPEC.md` is the only acceptance contract: the verifier checks every criterion and never treats a `FLOW.md` row as scope.
- **Calibration.** An optional, project-owned `brain/chore/ux-review.md` holds your stack's component traps, kept examples, and suppressed findings, so a rejected finding does not come back.

A user-facing spec with no prototype gets no `FLOW.md`; `create-spec` says no UX review ran and suggests `/prototype`.

## What ends up in a project

- **`brain/`** — `AGENTS.md` + `CLAUDE.md` (the Brain Schema), `index.md`, `log.md`, the `raw/ specs/ domains/ chore/ tech-debt/ review/` layout, `.brain-manifest.json`, and the project config **`brain.config.json`**. When the project's personas lived inside an agent or the router, init-brain extracts them verbatim to **`brain/personas.md`**.
- **A canonical `.agents/skills/`** holding the suite once, with each chosen provider symlinked into it (`.claude/skills → ../.agents/skills`, …) so every AI tool reads the same files.
- **A canonical `.agents/agents/`** holding the shipped advisor subagents once, symlinked into each agent-capable provider (`.claude/agents → ../.agents/agents`).
- **A root `AGENTS.md`** as the canonical instruction file (read natively by ~20 tools incl. Codex & Cursor), with `CLAUDE.md → AGENTS.md` for Claude. This is also where the project's own gates (build/test/lint) live, with a pointer to `brain/`.
- **Nine process skills**, generic and brain-wired: `create-spec`, `create-plan`, `grill-me`, `tdd`, `swarm-plan`, `implement-spec`, `docs-maintenance`, `adversarial-review`, and `prototype` (explicit invocation only — builds N divergent variants of one UI piece behind a visual picker; the winner feeds `create-spec`).
- **The `design-engineering` reference skill** — the motion-craft bar: when to animate and exact values (easing curves, durations, springs, origins), gestures, scroll, reduced motion, performance, plus the review rubric, audit/opportunities procedures, diagnosis loop, and motion-brief template. Loads on its own whenever motion is written, reviewed, or fixed; the `design-engineer` agent and `prototype` run on it. The agent is linked to it through its frontmatter `skills:` list — Claude Code preloads the skill into the agent, and the CLI always installs and updates the two together. Its code examples are React; on any other stack (Vue, Svelte, Angular, Solid, Astro, React Native, Flutter, SwiftUI, Compose, …) a researched **stack profile** in `brain/chore/motion-stack.md` maps every React API to the project's own, written at init or on first use.
- **Four advisor subagents**, spawned by the spec-driven skills to verify reasoning off the orchestrator's context: `ux-advisor` (reviews the approved `prototype` winner in the browser and returns ranked decisions with evidence — see above), `design-engineer` (motion / interaction-craft advisor routed through `design-engineering`: motion budget and exact values for `create-plan`, `implement-spec`, and the `adversarial-review` motion-craft pass; standalone review, audit, opportunities, diagnosis, and library-pick modes), `adversarial-verifier` (clean-context quality gate → SHIP / DO NOT SHIP), and `review-classifier` (routes the `adversarial-review` pipeline).
- **The `agent-browser` tool skill** (docs only; the CLI is a separate `npm i -g agent-browser`, which `ux-advisor` needs for its browser review). A pre-existing project-specific copy is detected and never clobbered.

## Release notes — 0.7.0

- **Project config.** New `brain/brain.config.json` (review mode, review location, tech-debt / reviews / personas paths), written by `init`, completed by `upgrade`, validated by `doctor`, edited with the new `brain config`. Every suite skill and agent reads it; paths in the skills are now tokens (`<techDebt>`, `<reviews>`, `<personas>`).
- **Review modes** `total` (default, the 0.6.0 behavior) · `plan` · `none` decide which reviews the flows start on their own.
- **The UX trigger moved.** `ux-advisor` no longer runs from `create-spec`, `create-plan` or `implement-spec`; it runs only after you approve a `prototype` winner (or when you ask, on a live route). The agent was redesigned: it reviews the UX of the rendered UI in the browser and in the code behind it, with evidence and caps, leaves layout, motion and visual accessibility to `design-engineer`, and never writes files.
- **Measured, not just rewritten.** The redesign was accepted on a replay of three shipped specs. From each approved prototype it found 17 of the 27 UX defects that later surfaced in review or in fixes, against 14 for the old agent's `FLOW.md`. Each review ran about 70–90 lines, against 350–735 for the old `FLOW.md`, and every decision came with a default and an acceptance criterion.
- **Verifier contract.** `adversarial-verifier` and `adversarial-review` judge the `SPEC.md` acceptance criteria only; `FLOW.md` is a map that locates them. `FLOW.md` files in the older format (Error paths / Edge cases) are still read everywhere, but only the rows a numbered criterion covers are verified.
- **Review ingest.** `docs-maintenance` now ingests `REPORT.md` files: durable findings go to the tech-debt store, the report is backlinked and marked ingested.
- **Router.** An identical `CLAUDE.md` is linked without `--force`; a differing one is never discarded. `scan` reports the router's state and what it carries.
- **Agent memory.** `adversarial-verifier` and `review-classifier` declare `memory: project` (Claude Code); `ux-advisor` and `design-engineer` keep none.
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

`upgrade` syncs the skills and agents you never edited, updates the Brain Schema, and writes `brain/brain.config.json` from what it detects. With `review.mode: total` and the default paths, every review gate fires as in 0.6. The one behavior change you get either way is the UX trigger. What still needs you (the playbook asks about each):

- **Review mode.** `upgrade` writes `total` even when your router says review is opt-in. Set yours with `brain config set review.mode plan` (or `none`), and let the playbook replace the router's hand-written review step with a pointer to the config.
- **Personas.** `paths.personas` starts at `null`, so `ux-advisor` describes users generically. Point it at your personas page with `brain config set paths.personas <file>`, or let the playbook extract personas that live inside an agent or the router into `brain/personas.md`.
- **The old UX wiring.** An older init-brain may have wired your UX or design agent into the `## Project Advisors` blocks of `create-spec`, `create-plan` and `implement-spec`. Those blocks are yours, so `upgrade` keeps them, and the old UX trigger keeps firing until the entries are removed. Project agents that duplicate a shipped one are replaced. Their notes move to `brain/personas.md`, `brain/chore/ux-review.md`, `brain/chore/motion.md` or the root `AGENTS.md`.
- **Conflicts that mix versions.** A file you edited is skipped. Three groups only work together:
  - the Brain Schema: the skills point at its new "Project configuration" section;
  - `prototype`, `create-spec`, `create-plan`, `implement-spec` and `ux-advisor`: the new UX flow;
  - `adversarial-review` and `adversarial-verifier`: `SPEC.md` as the only contract.

  Move your project facts into the config or `brain/`, then run `brain upgrade --force`.
- **Specs in flight.** `FLOW.md` files in the older format are still read, but only numbered `SPEC.md` acceptance criteria are verified. Lift the rows you want enforced into criteria before implementing.
- **Old review reports** never reached the tech-debt store. Run `docs-maintenance` on each `REPORT.md` to ingest it.
- **The browser.** The new `ux-advisor` needs `npm i -g agent-browser` and a dev route that serves the prototype. Without them it reviews from the code only, under a `DEGRADED` banner.
- **Leftovers.** `brain doctor` lists files inside the bundled skills that the package no longer ships as `untracked`. Move any project fact out of them, then delete them.
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
│   ├── agents/           # the 4 shipped advisor subagents (→ .agents/agents)
│   └── skills/           # the 11 bundled suite skills
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
