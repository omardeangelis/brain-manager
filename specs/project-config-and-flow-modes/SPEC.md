---
domain: compat
type: spec
status: draft
links:
  - "[[specs/project-config-and-flow-modes/PLAN]]"
  - "[[specs/project-config-and-flow-modes/REFERENCE-sevedemo]]"
  - "[[src/core/link-plan.ts]]"
  - "[[src/commands/scan.ts]]"
  - "[[src/commands/init.ts]]"
  - "[[skills/init-brain/SKILL.md]]"
created: 2026-10-05
updated: 2026-10-05
---

# Project-aware install: config, review modes, prototype-gated UX, router detection

Make the suite fit a project that already has its own conventions **without editing the installed skills**. The installer detects what the project already has: personas, tech-debt store, review history, a root `AGENTS.md`. It records the result in one project-owned config file and lets the user choose how much adversarial review the flows enforce. The skills and agents read that config at runtime, so every project runs the same bundled files and `brain upgrade` stays conflict-free.

Evidence: [REFERENCE-sevedemo.md](REFERENCE-sevedemo.md), a real project that ran the brain workflow for four months and diverged from the package in exactly these places.

## Problem

Today the only sanctioned way to fit the suite to a project is to edit the installed `SKILL.md` / agent files. Every edit turns into a `conflict` on `brain upgrade`, and the project and the package drift apart, as the reference shows:

- **Personas** are hardcoded inside a project agent. `ux-advisor` looks for them in `brain/domains/` and falls back to generic ones.
- **Tech-debt and review paths** are fixed strings in the skills. A project whose store lives elsewhere has to patch every skill, and `docs-maintenance` cannot ingest review reports at all (REFERENCE B3).
- **Review policy** is fixed. 0.6.0 makes `adversarial-review` mandatory in `implement-spec`; the reference project deliberately made it opt-in, and the only way to keep that is to fork three skills.
- **UX review** runs on every user-facing spec (`create-spec` step 8), plan (`create-plan` step 9) and task (`implement-spec`). That is heavy, and it critiques flows nobody has seen yet. The right moment is when there is a concrete, approved UI to critique: a prototype winner.
- **The root router** is half handled. `link` promotes a lone `CLAUDE.md` into `AGENTS.md`. When both exist with different content it only reports a conflict, and `--force` replaces `CLAUDE.md` with a symlink, discarding its content. Nothing evaluates whether an existing `AGENTS.md` actually carries what the flows need: gates, a pointer to `brain/`, a review policy.

## Goal

1. One project-owned config, `brain/brain.config.json`, written by `init`, migrated by `upgrade`, validated by `doctor`, and editable with `brain config`.
2. Every suite skill and shipped agent reads that config and the files it points to, instead of hardcoded values.
3. On a reference-like project, an install leaves every suite file byte-identical to the package (REFERENCE "What standardization means").

## Principle: one copy, project facts outside it

The pattern `design-engineering` already established becomes the rule for the whole suite:

| Kind | Owned by | Examples | Upgrade behavior |
|---|---|---|---|
| Bundled skills and agents | package (`managed`) | `create-spec/SKILL.md`, `ux-advisor.md` | updated; never hand-edited |
| Brain Schema | package (`managed`) | `brain/AGENTS.md`, `brain/CLAUDE.md` | updated; documents the config keys |
| Project config | project (`seed`) | `brain/brain.config.json` | never overwritten; only missing keys are added |
| Project knowledge the suite reads | project (`seed` / unmanaged) | `brain/personas.md`, root `AGENTS.md`, `brain/chore/motion*.md` | never touched |

A skill that needs a project fact reads it from the config or from a file the config points to. It never asks the project to edit the skill.

## The config file

`brain/brain.config.json`. It is JSON so the CLI validates it with Effect Schema and an LLM reads it without parsing rules. It is recorded in the manifest as `seed`.

```json
{
  "version": 1,
  "review": {
    "mode": "total",
    "location": "spec-folder"
  },
  "paths": {
    "techDebt": "brain/tech-debt",
    "reviews": "brain/review",
    "personas": null
  }
}
```

| Key | Values | Default | Set by |
|---|---|---|---|
| `review.mode` | `total` \| `plan` \| `none` | `total` (today's behavior) | init choice (§3); suggested by router analysis (§5) |
| `review.location` | `spec-folder` (case B inside the spec folder) \| `review-tree` (`<paths.reviews>/<domain>/<spec>/`) | `spec-folder`; `review-tree` when existing reports live there | detection (§6) |
| `paths.techDebt` | repo-relative dir | `brain/tech-debt` | detection (§2) |
| `paths.reviews` | repo-relative dir for case-A reviews, and case-B reviews when `review-tree` | `brain/review` | detection (§6) |
| `paths.personas` | repo-relative file, or `null` | `null` | detection / extraction (§1) |

- **No config file** (an older install, or `install-skill` outside brain) means all defaults. That reproduces 0.6.0 behavior exactly, so the change is backward compatible.
- **Reading convention.** The Brain Schema gains a `## Project configuration` section. Every suite skill's first Quick-start step and every shipped agent's "read the project" step say: read `brain/brain.config.json` (see `brain/AGENTS.md` → Project configuration); when it is absent, use the defaults.

## 1. Personas: use the project's own

**Detection** (`brain scan`, mechanical). Report `persona-source` candidates:

- a file whose name matches `/personas?/i` anywhere under `brain/` or the legacy stores;
- a page with frontmatter `type: personas`;
- a **heading** matching `/persona/i` inside:
  - an agent definition (`.claude/agents`, `.agents/agents`);
  - the root `AGENTS.md` / `CLAUDE.md`;
  - `brain/specs/CONSTITUTION.md`-style files.

Each line carries the path, the matched heading and `kind: file | section`.

**Decision** (init-brain, LLM; a new reference, `project-context.md`):

| Finding | Action |
|---|---|
| One dedicated persona file | `paths.personas` = that file, verbatim. Do not move or rewrite it. |
| Personas only as a section inside an agent, router or constitution | Extract them verbatim into `brain/personas.md` (`domain: _root`, `type: personas`, one `##` per persona) after showing the user the extraction. Set `paths.personas`, link the page from `brain/index.md`, and log it. The original section stays until the user retires the agent that held it. |
| Several conflicting sources | Ask which one is canonical. |
| None | `null`. Tell the user that `ux-advisor` will characterize personas generically and record them as an open question, and offer to create `brain/personas.md`. |

**Consumers:**

- **`ux-advisor`** reads `paths.personas` first and uses those personas verbatim. Generic axes are the fallback only when the path is `null`.
- **`create-spec`** names the target persona(s) from the same source.
- **`prototype`** Phase 1 scopes "for whom" from it.
- The **Brain Schema** documents `type: personas`.

## 2. Tech-debt paths: use the project's own

**Detection.** Report `tech-debt-store` lines for `brain/tech-debt/`, `tech-debt/`, `docs/tech-debt/` and `**/TECH-DEBT*.md`, with a file count and a layout guess: `per-spec` (`<domain>/<spec>.md`) or `single-file`.

**Decision:**

| Finding | Action |
|---|---|
| One directory store | `paths.techDebt` = it, even when it is not `brain/tech-debt`. |
| A single file | Ask: migrate it into `<paths.techDebt>/<domain>/<spec>.md` (the existing migration path), or keep it (open question Q2). |
| None | `brain/tech-debt`. |

**Consumers.** Every literal `tech-debt/<domain>/<spec>.md` and `brain/tech-debt/` in skills, agents, the Brain Schema, init-brain, `scan.ts` and `doctor.ts` becomes `<paths.techDebt>/<domain>/<spec>.md`. `doctor` checks the configured directory instead of the hardcoded one. The inventory of touch points is in PLAN T9.

## 3. Review modes: `total` | `plan` | `none`

How much clean-context review the flows enforce. Explicit invocation (`/adversarial-review`, or asking for a verifier pass) works in **every** mode. The mode only governs what the flows start on their own.

| Gate | `total` | `plan` | `none` |
|---|---|---|---|
| `create-spec`: `adversarial-verifier` on `SPEC.md` against the quality bar | runs; BLOCKERs fixed before save | not run (self-check against the quality bar only) | not run |
| `create-plan`: `adversarial-verifier` on `PLAN.md` | runs; BLOCKERs folded in before stop | **runs** | not run; offered in one line |
| `implement-spec`: `adversarial-review` (case B) before the acceptance audit | runs; BLOCKERs resolved before finalizing | not run; offered in one line | not run; offered in one line |
| A `PLAN.md` task that lists review as a closing step | executed | offered, not run | offered, not run |
| Motion-craft verifier pass | whenever a review runs | same | same |

- **`total`** is 0.6.0 behavior and the default for fresh installs.
- **`plan`** moves all mandatory review onto the plan: decisions are checked before code exists; the code is reviewed only on request.
- **`none`** makes every gate opt-in. This is the reference project's current rule (REFERENCE B1).
- **Init** asks for the mode alongside mode, providers and stack (init-brain Step 1), recommending the value suggested by the router analysis (§5) when the router states a review policy.
- **`brain init --review-mode <m>`** sets it non-interactively. `brain config set review.mode <m>` changes it later.
- **`adversarial-review`'s Contract → Trigger** line states the mode-dependent trigger. The skill itself is unchanged: modes decide *who starts it*, not what it does.

## 4. UX review only after a prototype is approved

The flow becomes:

```
prototype  ──(user approves a winner: `keep <variant>` / Phase 6)──▶  ux-advisor (prototype review)  ──▶  create-spec
```

**`ux-advisor` runs only here.** Its new primary mode, *prototype review*, is briefed self-contained with:

- the winning variant (path and route);
- the scope from Phase 1;
- `paths.personas`;
- the winner's motion line and values.

It returns three findings and a `FLOW.md` draft:

1. **Accessibility issues** of the winner, ranked by severity:
   - keyboard and focus order;
   - semantics, roles and labels;
   - contrast in every theme the project ships;
   - target sizes;
   - announcements for async states;
   - reduced-motion behavior, deferring exact motion values to `design-engineering/references/accessibility.md`.
2. **Uncovered flows.** What the prototype faked or never showed: error paths, empty and partial data, permissions, latency and async failure, deep links, concurrency.
3. **Persona dependencies.** Which personas the flow serves, what each needs, cross-persona conflicts, and dependencies on other flows, features or data.

`FLOW.md` gains two sections, `## Accessibility` and `## Persona dependencies`. The existing sections and their order are unchanged, so current consumers keep working.

**Removed triggers.** `ux-advisor` is no longer spawned by:

- `create-spec` (step 8);
- `create-plan` (step 9);
- `implement-spec` (reactive friction);
- the `docs-maintenance` wording that it "supplies flow pages".

The agent stays directly invocable on explicit request.

**`create-spec` gains a prototype-handoff input.** When started from an approved prototype with a `ux-advisor` result:

- it writes `FLOW.md` into the spec folder it resolves;
- it turns accessibility findings into acceptance criteria or open questions;
- it records persona dependencies in the spec;
- it cites the prototype by path and route, as today.

**Specs without a prototype get no `FLOW.md`.** This is accepted. Every consumer already treats `FLOW.md` as optional. When a spec is user-facing and no prototype ran, `create-spec` says so in one line and suggests `/prototype`, never invoking it.

**Unchanged downstream.** `create-plan`, `implement-spec`, the verifier and `docs-maintenance` keep consuming `FLOW.md` when present (with the §6 parity fixes).

`design-engineer` keeps deferring persona and journey questions. When no `ux-advisor` output exists, it flags them as an open question instead of routing to an agent that will not run.

## 5. Root router: prefer `AGENTS.md`, reconcile `CLAUDE.md`, judge pertinence

**State analysis** (`core/router.ts`, pure; surfaced by `scan`, used by `link`):

| State | `link` action |
|---|---|
| neither file | create the `AGENTS.md` stub (today) |
| only `CLAUDE.md` (real) | promote it to `AGENTS.md`, then link `CLAUDE.md → AGENTS.md` (today) |
| only `AGENTS.md` | keep it; link `CLAUDE.md → AGENTS.md` (today) |
| both, `CLAUDE.md` already a symlink to `AGENTS.md` | up to date |
| both real, **identical content** | **new:** replace `CLAUDE.md` with the symlink, no `--force` needed (nothing is lost) |
| both real, **different content** | conflict with a structured reason: the headings present only in `CLAUDE.md` and a similarity ratio. **`--force` no longer discards a differing `CLAUDE.md`**: it refuses until the content is reconciled (identical) — see Q4. |

**Pertinence signals** (mechanical, in `scan --json`). For each router file, report whether it contains:

- **gates:** a code block or list naming build/test/lint/typecheck commands, cross-checked against `package.json` scripts when present;
- a **brain pointer** (`brain/`);
- a **workflow section** (headings like "workflow", "Step N");
- a **review policy** (review + optional / only on request / mandatory);
- a **skill routing table**;
- a **personas section**;
- **tech-debt / review paths**;
- **stub-ness:** whether the file equals `ROUTER_STUB` or is under a size threshold.

**Judgment** (init-brain, LLM; a new reference, `router.md`). Classify the canonical candidate:

| Class | Meaning | What init-brain does |
|---|---|---|
| `stub` | empty, or our own stub | fill the gates from the project, asking when unknown |
| `foreign` | written for another tool or purpose; no gates, no workflow | keep it; add a brain section and the gates; merge `CLAUDE.md` content in |
| `partial` | has gates or conventions but no brain pointer, or has a hand-written process that overlaps the brain flows | add the brain pointer. Flag overlapping process sections and propose replacing each with a pointer to the skill or config that now owns it. |
| `complete` | gates + brain pointer + no conflicting process | nothing to do |

**Rules:**

- **`AGENTS.md` is canonical whenever it exists.** Reconciling means merging the sections that exist only in `CLAUDE.md` into `AGENTS.md`, keeping `AGENTS.md` wording where both cover the same ground. The user sees the merge diff and confirms it. Only then is `CLAUDE.md` linked.
- **The analysis seeds the config.** A stated review policy suggests `review.mode`. Stated tech-debt or review paths corroborate §2 / §6. A personas section feeds §1.
- **Agents fall back to `CLAUDE.md`.** Every shipped agent reads "the root `AGENTS.md` (fallback: `CLAUDE.md` when no `AGENTS.md` exists)". That way a project mid-migration, or an `install-skill` copy outside brain, still gives the agents the project's gates (REFERENCE B7).

## 6. Compatibility fixes from the reference

These come from the reference report; the user asked for full standardization. Each one keeps a working project feature that 0.6.0 lacks, or removes a trap.

1. **Review ingest (bug, REFERENCE B3).**
   - Port the reference project's `docs-maintenance/references/review-ingest.md`, the `## Secondary: Review Ingest` section, the Step 2 sibling-`REPORT.md` read and the log line.
   - Generalize it to `paths.techDebt` and `review.location`.
   - Without this, no report reaches tech-debt on 0.6.0.
2. **`FLOW.md` parity (B4).** Port:
   - `planner-phase.md` "Spec-folder inputs";
   - the `lifecycle.md` reading order and acceptance-audit check;
   - the FLOW slice in `parallel-worker-brief.md`;
   - `docs-maintenance` Step 2/3 using `FLOW.md` as the primary flow source.
3. **Review location (B2).**
   - `adversarial-review` resolves case B to the spec folder (`spec-folder`) or to `<paths.reviews>/<domain>/<spec>/` (`review-tree`). The REPORT/RUBRIC wikilinks, index rows and log entries follow the location.
   - Detection: existing `REPORT.md` files under `<reviews>/<domain>/<spec>/` select `review-tree`.
4. **Legacy agent aliases (B8).** init-brain advisor detection recognizes legacy twins of shipped agents by an alias table (`review-classifier-router → review-classifier`, `ux-flow-strategist → ux-advisor`), confirmed by description similarity. For each twin it:
   - does **not** wire the twin as an "additional advisor";
   - offers to replace it with the shipped agent;
   - lists the docs that mention the old name, for the user to update;
   - routes its project-specific content (personas, risk surfaces) to §1 and §5 first.
5. **Agent memory (B5).** The migration reference explains how to fold durable memories into brain pages: personas → `brain/personas.md`, risk surfaces and conventions → `AGENTS.md`, motion → `brain/chore/motion.md`. Whether shipped agents should declare `memory:` is Q5.

## Non-goals

- Making the UX trigger configurable. The prototype-gated flow is the standard; the agent stays invocable by hand.
- Supporting per-skill overrides or templating the skill bodies. The config holds facts and one policy knob, not skill text.
- Rewriting project content during detection. Extraction is verbatim, and only with confirmation.
- Native non-Claude agent formats (`specs/multi-provider-agents/`).

## Acceptance criteria

1. **`brain init`** writes `brain/brain.config.json` (seed) with detected values plus flags (`--review-mode`). A second run keeps it unchanged.
2. **`brain upgrade`** on an install without a config writes one with detected values and reports it. On an older config version it adds only the missing keys; existing values are never changed.
3. **`brain doctor`** fails on an invalid config, an unknown `review.mode`, or a configured path that does not exist.
4. **`brain config get|set <key> [value]`** reads and validates keys. An invalid value is rejected with the allowed set.
5. **`brain scan`** reports `persona-source`, `tech-debt-store`, `review-store` and `router` lines (state + pertinence signals) in text and `--json`.
6. **Router handling.**
   - Identical `CLAUDE.md` / `AGENTS.md` link without `--force`.
   - A differing `CLAUDE.md` is never discarded: `link --force` reports the reconcile requirement instead.
   - All existing link-plan tests still pass.
7. **No hardcoded paths remain.** No suite skill, shipped agent or Brain Schema file hardcodes `brain/tech-debt`, a review location, or personas. All read the config; asset grep shows no literal outside the Brain Schema's defaults table.
8. **Review gates follow the §3 matrix in each mode.** `create-spec`, `create-plan`, `implement-spec` and `adversarial-review` state the mode condition at every gate. Verified by the manual eval rows for the three modes.
9. **UX runs only from `prototype`.**
   - `ux-advisor` is referenced as a trigger only by `prototype` (Phase 6 / `keep`).
   - The agent has the prototype-review mode with the three findings.
   - `FLOW.md` carries `## Accessibility` and `## Persona dependencies`.
   - `create-spec` consumes the handoff.
10. **Review ingest and FLOW parity.** `docs-maintenance` ingests review reports per §6.1, and the FLOW parity items of §6.2 are present.
11. **Reference project, dry run.** On a throwaway worktree of the reference project (PLAN T16), init plus upgrade yield:
    - suite skills and shipped agents byte-identical to the package;
    - config `review.mode: none` (confirmed with the user), `review.location: review-tree`, `paths.techDebt: brain/tech-debt`, `paths.personas: brain/personas.md`;
    - `AGENTS.md` canonical with `CLAUDE.md` linked;
    - `brain doctor` exit 0.
12. **Release hygiene.** `npm run build` and `npm test` green. EVAL.md updated. Version bumped to `0.7.0`. README documents the config, the modes and the new UX flow.

## Open questions

- **Q1 — Where the `ux-advisor` result persists between `prototype` and `create-spec`** if the run is interrupted.
  - Recommendation: `create-spec` is entered in the same run (Phase 6 already does this), so the result is passed in context and `create-spec` writes `FLOW.md`.
  - If the user stops after the review, persist it as `UX-REVIEW.md` next to the surviving prototype variant. `create-spec` picks it up from the cited prototype path, and it is deleted with the surface.
- **Q2 — Single-file tech-debt stores.** Support them as-is (append a `## <domain>/<spec>` section), or always migrate to per-spec files?
  - Recommendation: migrate. Per-spec files are what `docs-maintenance` and `review-ingest` address.
- **Q3 — Live accessibility checks.** Should `ux-advisor` get `Bash` to drive `agent-browser` against the prototype route?
  - Recommendation: no, keep it read-only. The `prototype` orchestrator already verifies in the browser (Phase 5) and passes observations in the brief.
- **Q4 — `link --force` with a differing `CLAUDE.md`.** Refuse outright (recommended), or back it up somewhere first and then link?
- **Q5 — Agent memory.** Should shipped agents declare `memory: project` (Claude Code only)?
  - Recommendation: no. Durable project knowledge belongs in `brain/` (provider-agnostic, reviewable); the migration reference folds it there.
- **Q6 — `plan` mode and `create-spec`.** Should `plan` also keep the spec gate (verifier on `SPEC.md`)?
  - The user's definition moves review "only to the plan", so this spec says no; confirm before implementing.

## Risks

- **Instruction sprawl.** Mode conditions at every gate make the skills longer. Mitigation: one shared phrasing ("**Gate — `review.mode`: total**") and the matrix lives once in the Brain Schema; skills reference it.
- **Detection false positives.** A doc that merely mentions "persona" or "tech debt". Mitigation: the CLI only reports candidates; the LLM decides with the user. Nothing is moved without confirmation.
- **Behavior change for existing users.** The UX trigger moves for every project. Mitigation: called out in the README and the release notes; `FLOW.md` stays optional everywhere, so nothing breaks; the agent remains invocable.
- **Config drift.** A user edits the JSON by hand into an invalid state. Mitigation: `doctor` validates it; `brain config set` is the documented path.
