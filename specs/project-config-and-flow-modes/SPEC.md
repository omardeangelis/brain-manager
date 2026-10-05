---
domain: compat
type: spec
status: draft
links:
  - "[[specs/project-config-and-flow-modes/PLAN]]"
  - "[[specs/project-config-and-flow-modes/REFERENCE-sevedemo]]"
  - "[[specs/project-config-and-flow-modes/RESEARCH-ux-advisor]]"
  - "[[assets/agents/ux-advisor.md]]"
  - "[[src/core/link-plan.ts]]"
  - "[[src/commands/scan.ts]]"
  - "[[src/commands/init.ts]]"
  - "[[skills/init-brain/SKILL.md]]"
created: 2026-10-05
updated: 2026-10-05
---

# Project-aware install: config, review modes, prototype-gated UX review, router detection

Make the suite fit a project that already has its own conventions **without editing the installed skills**. The installer detects what the project already has: personas, tech-debt store, review history, a root `AGENTS.md`. It records the result in one project-owned config file and lets the user choose how much adversarial review the flows enforce. The skills and agents read that config at runtime, so every project runs the same bundled files and `brain upgrade` stays conflict-free.

Evidence:
- [REFERENCE-sevedemo.md](REFERENCE-sevedemo.md): a real project that ran the brain workflow for four months and diverged from the package in exactly these places.
- [RESEARCH-ux-advisor.md](RESEARCH-ux-advisor.md): why the UX agent's output did not improve that project, and what the evidence says works instead.

## Problem

Today the only sanctioned way to fit the suite to a project is to edit the installed `SKILL.md` / agent files. Every edit turns into a `conflict` on `brain upgrade`, and the project and the package drift apart, as the reference shows:

- **Personas** are hardcoded inside a project agent. `ux-advisor` looks for them in `brain/domains/` and falls back to generic ones.
- **Tech-debt and review paths** are fixed strings in the skills. A project whose store lives elsewhere has to patch every skill, and `docs-maintenance` cannot ingest review reports at all (REFERENCE B3).
- **Review policy** is fixed. 0.6.0 makes `adversarial-review` mandatory in `implement-spec`; the reference project deliberately made it opt-in, and the only way to keep that is to fork three skills.
- **UX review** runs on every user-facing spec (`create-spec` step 8), plan (`create-plan` step 9) and task (`implement-spec`). That is heavy, and it critiques flows nobody has seen yet. The right moment is when there is a concrete, approved UI to critique: a prototype winner. And moving the trigger is not enough: in the reference project the agent's output, though specific, did not change the product (RESEARCH part A).
- **The root router** is half handled. `link` promotes a lone `CLAUDE.md` into `AGENTS.md`. When both exist with different content it only reports a conflict, and `--force` replaces `CLAUDE.md` with a symlink, discarding its content. Nothing evaluates whether an existing `AGENTS.md` actually carries what the flows need: gates, a pointer to `brain/`, a review policy.

## Goal

1. One project-owned config, `brain/brain.config.json`, written by `init`, migrated by `upgrade`, validated by `doctor`, and editable with `brain config`.
2. Every suite skill and shipped agent reads that config and the files it points to, instead of hardcoded values.
3. On a reference-like project, an install leaves every suite file byte-identical to the package (REFERENCE "What standardization means").
4. `ux-advisor` reviews the approved prototype in the browser and returns a few ranked decisions backed by evidence (§7). It beats the old agent on a replay of the reference project's own history (§7.7).

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

- **`ux-advisor`** reads `paths.personas` first. It takes the segments verbatim and derives concrete situations from them (§7.3, step 5). Generic axes are the fallback only when the path is `null`.
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
prototype ──(user approves a winner: `keep <variant>` / Phase 6)──▶ ux-advisor (prototype review) ──▶ create-spec
                                                                       │        ▲
                                                     verdict `iterate` │        │ re-review (≤ 2 rounds)
                                                                       ▼        │
                                                     prototype applies ≤ 3 small changes to the winner
```

**`ux-advisor` runs only here.** Its new primary mode, *prototype review*, is briefed self-contained with:

- the winning variant: path, and the URL of its dev route;
- the scope from Phase 1;
- `paths.personas`;
- the winner's motion line and values;
- the list of what the prototype fakes (endpoints, data, permissions), as Phase 6 already compiles it.

It reviews the winner **in the browser** and returns a UX review with three findings, as the user asked. Their method, evidence bar and output contract are in §7:

1. **Accessibility issues.** Keyboard and focus, semantics and names, contrast in every shipped theme, target sizes, announcements for async states, reduced motion (exact motion values stay with `design-engineering/references/accessibility.md`).
2. **Uncovered flows.** The user-observable states, entry points and exits the prototype faked or never showed.
3. **Persona dependencies.** Where the flow works differently for different persona situations, cross-persona conflicts, and dependencies on other flows, features or data.

`create-spec` turns the review into acceptance criteria and writes `FLOW.md` in its v2 shape: a map that cites acceptance-criterion ids (§7.5).

**Removed triggers.** `ux-advisor` is no longer spawned by:

- `create-spec` (step 8);
- `create-plan` (step 9);
- `implement-spec` (reactive friction);
- the `docs-maintenance` wording that it "supplies flow pages".

The agent stays directly invocable on explicit request.

**`create-spec` gains a prototype-handoff input.** When started from an approved prototype with a `ux-advisor` result:

- it turns each decision into an acceptance criterion, and the bundled mechanical fixes into one criterion;
- it carries the open questions, each with its recommended default, into the spec;
- it writes `FLOW.md` v2 into the spec folder it resolves (§7.5);
- it cites the prototype by path and route, as today.

**Specs without a prototype get no `FLOW.md`.** This is accepted. Every consumer already treats `FLOW.md` as optional. When a spec is user-facing and no prototype ran, `create-spec` says so in one line and suggests `/prototype`, never invoking it.

**Downstream.** `create-plan`, `implement-spec` and `docs-maintenance` keep consuming `FLOW.md` when present. They read the v2 sections and still accept v1 files, with the §6 parity fixes. The verifier changes its contract per §7.5: it judges the `SPEC.md` criteria and uses `FLOW.md` only to locate them.

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
   - the `lifecycle.md` reading order and acceptance-audit check, re-aimed at the `SPEC.md` criteria that `FLOW.md` v2 cites (§7.5), not at every FLOW row;
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
5. **Agent memory (B5).** The migration reference explains how to fold durable memories into brain pages:
   - personas → `brain/personas.md`;
   - risk surfaces and conventions → `AGENTS.md`;
   - motion → `brain/chore/motion.md`;
   - component traps and rejected UX findings → `brain/chore/ux-review.md` (§7.6).

   Which shipped agents keep a `memory:` of their own is Q5.

## 7. `ux-advisor` redesign: role, moment, method

Moving the trigger (§4) is not enough. The agent's twin ran for four months in the reference project and its output did not move the product. [RESEARCH-ux-advisor.md](RESEARCH-ux-advisor.md) shows why:

- **The moment was wrong.** It was briefed after the decisions and told not to reopen them.
- **It looked at nothing rendered.** It never saw the UI or the real components.
- **Its length turned into scope.** The verifier treats every `FLOW.md` row as part of the contract.
- **It asked questions instead of choosing.**

External studies agree: ungrounded LLM critique has low precision, and structured runtime evidence is what lifts it. This section redesigns the agent around those facts. RESEARCH part C maps each rule below to its evidence.

### 7.1 Role

> `ux-advisor` reviews an approved, rendered UI for the people who will use it, and returns the decisions the spec must make, each backed by evidence it observed.

It is a reviewer, not a flow author or a spec writer. It answers four questions:

1. **Can everyone operate it?** Accessibility.
2. **What did the prototype not show?** User-observable states, entry points and exits.
3. **Who does it fail?** Persona situations, cross-persona conflicts and dependencies.
4. **What is already broken around it?** The current code the winner will replace or sit next to. This kept the most value in the old output (RESEARCH A, keeper 1).

It does **not** own:

| Concern | Owner |
|---|---|
| Motion values | `design-engineer` / `design-engineering` |
| Visual language, brand | the project's design skill, if any |
| Engineering edge cases: concurrency, retries, caching, data consistency | `create-spec` (grill), `create-plan` (planner), the verifier |
| Writing `SPEC.md` / `FLOW.md` | the orchestrator (`create-spec`) |

### 7.2 Moment awareness

The agent opens by naming its moment from the brief, and behaves accordingly:

| Moment | Who calls it | What exists | What does not exist yet | Output goes to |
|---|---|---|---|---|
| **Prototype review** (primary) | `prototype` Phase 6, after the user picks a winner | the winner at its dev route; Phase 1 scope; motion line; what the prototype fakes; personas; domain docs | `SPEC.md`, backend contract, real data | `create-spec`, same run; the verdict goes to the user |
| **Live-surface review** (explicit only) | the user, naming a shipped route ("this flow is clunky") | the running route and its code | a winner, a spec | the user, with a suggestion to run `/prototype` or `create-spec` |
| **Anything else** (a spec draft, an idea, no rendered UI) | — | text only | — | one line naming the moment that fits; no review, no `FLOW.md` |

**The approval sets a direction, not a frozen decision.** The old agent was told not to reopen decisions, and doubled down on choices the owner later reverted on screen (RESEARCH A1). Now, when a finding is better fixed on the prototype than described in the spec, the agent says so and the prototype is iterated before the spec is written. This is the maintainer's decision (Q8, 2026-10-05): **small changes to the prototype, iterated on**.

Verdicts:
- `proceed`: nothing blocks the spec.
- `proceed with decisions`: the spec carries the decisions.
- `iterate`: the review lists **at most 3 small prototype changes**.

**What counts as a small change.** Each one:
- is tied to a P0/P1 finding;
- touches only the winner's surface;
- keeps its direction (same axis, same motion line unless motion is the finding);
- runs on the prototype's fake state machine;
- states how to check it on screen. Example: the × moves out of the accordion trigger and gets a 44×44 target.

**Anything bigger is not an `iterate`.** That covers a new direction, a new screen, or a change that needs the backend contract. It stays a P0 decision for the spec, and the user can still ask for a `riff` themselves.

**The loop.**
1. The `prototype` orchestrator shows the proposed changes; the user accepts all, some or none.
2. The orchestrator applies the accepted ones to the winner, under the prototype's Hard Rules (isolated surface, never production code).
3. `ux-advisor` re-reviews the changed items, plus a regression pass on the keyboard walk and the state matrix.
4. At most 2 rounds, then `create-spec` regardless. The changes it made carry into the spec as decisions already taken, with their exact values, like the winner's own.

The agent itself never edits the prototype. A reviewer that fixes its own findings loses the independence that makes its re-review worth anything, the same rule `adversarial-review` follows.

### 7.3 Method

1. **Orient,** briefly:
   - the config, then `<personas>`;
   - the touched domain's page;
   - the root router for accessibility and i18n conventions;
   - `brain/chore/ux-review.md` when present (§7.6);
   - the source of every component the winner uses, including the headless library's primitives (keyboard delegates, focus scopes, portals). That layer is where the reference project's shipped defects came from (RESEARCH A2).
2. **Mechanical pass with tools** (`agent-browser`):
   - **Screenshots:** a screenshot of every viewport, theme and forced state the review relies on. The agent opens them and looks: layout, truncation, contrast, hierarchy, jumps between states. The accessibility tree alone does not show what the user sees (Q3, 2026-10-05).
   - **Viewports:** 375 and 1280, plus 320 for reflow.
   - **Themes and motion:** every shipped theme, and reduced motion.
   - **axe:** `agent-browser a11y` when the CLI has it, else axe-core injected with `eval`. Violations become **one bundled list of mechanical fixes**, not prose. Its `incomplete` items go to manual checks.
3. **Keyboard walkthrough of each primary task:**
   - Tab and Shift+Tab, logging role, name and visible focus at each step.
   - Dialogs and menus checked against the WAI-ARIA APG patterns: focus moves in, Tab wraps, Escape closes, focus returns to the trigger.
   - Live regions update after async actions.
   - Screen-reader announcements are listed as **manual checks**, never claimed.
4. **State matrix, by forcing states:**
   - For each data-bound region, drive empty, loading, error, partial, long content, no permission and offline. Use `network route --body` / `--abort` and `set offline`.
   - Each cell reads present / missing / not reachable in the prototype.
   - A missing cell becomes a decision. Only user-observable states belong here.
5. **Persona situations:**
   - From `<personas>`, derive 2–4 concrete situations: segment × entry point × permissions × device × data volume × prior knowledge.
   - Walk the primary task in each, with the four cognitive-walkthrough questions, keeping the full path.
   - Report only where situations differ, plus hand-offs where one persona's action creates a state another must see.
   - No role-play: simulated users are too competent (RESEARCH B5).
6. **Around the surface.** What is already broken in the code the winner replaces or sits next to:
   - dead links;
   - silent data loss;
   - existing controls that strand users;
   - data assumptions the real records contradict.
7. **Evidence gate.**
   - Every finding carries:
     - a location: route plus accessibility-tree ref or selector, or `file:line`;
     - the observed evidence: trace step, screenshot, axe rule, matrix cell or code line;
     - repro steps.
   - No evidence → open question, never a finding.
8. **Decide, rank, cap.**
   - At most **6 product decisions**, P0–P2, each with a one-line reason (frequency × impact). Repeats merge into one with a list of locations.
   - Each decision reads: decision needed → recommended default → acceptance criterion → evidence.
   - At most **3 open questions**, only for facts it cannot observe (business, data, legal), each with a default.
   - "No blocking issues" is a valid result. No heuristic health scores.
9. **Degraded mode.** With no browser available (a tool without `agent-browser`, a route that does not serve), the review opens with a `DEGRADED` banner. It reports only code-grounded findings and questions, and never claims runtime behavior.

### 7.4 Output contract

The agent **returns** the review to its caller; it writes no files. About 120 lines at most:

```markdown
## Verdict: proceed | proceed with decisions | iterate — <one line>
## Prototype changes    (only with iterate; ≤ 3, each: finding # → change → how to check it on screen)
## Decisions            (≤ 6, ranked)  | # | P | Decision needed | Recommended default | Acceptance criterion | Evidence |
## Mechanical fixes     (axe + keyboard, bundled; one line each with location)
## State matrix         | Region | empty | loading | error | partial | long | no permission | offline |
## Persona situations   (only where they differ) + dependencies and hand-offs
## Already broken around the surface
## Where the spec will be misread   (≤ 5 rows)
## Manual checks still needed       (screen reader, real device, with exact steps)
## Open questions       (≤ 3, each with a default)
```

### 7.5 What the review turns into

- **`SPEC.md` is the only acceptance contract.** `create-spec` folds:
  - each decision into an acceptance criterion;
  - the mechanical fixes into one criterion;
  - the open questions into the spec's Open questions.
- **`FLOW.md` v2 is a map, not a second contract.** `create-spec` writes it from the review, in at most about 150 lines, using a template that moves from the agent to `create-spec/references/flow-map.md`. Sections:
  - Goal
  - Persona situations
  - Entry points
  - Happy path (≤ 10 steps)
  - States (the matrix, replacing v1's Error paths and Edge cases)
  - Accessibility
  - Persona dependencies

  Every requirement in it cites an AC id. A requirement stated only in `FLOW.md` is a defect.
- **Readers accept both versions.** `create-plan`, `implement-spec` and `docs-maintenance` accept v1 files (Error paths / Edge cases) and v2 files.
- **The verifier judges `SPEC.md` criteria and uses `FLOW.md` to locate them.**
  - `adversarial-verifier`'s "every `FLOW.md` happy/error/edge path must be handled, else MAJOR" becomes "every acceptance criterion must be met, else MAJOR".
  - A FLOW row with no AC is not a finding.
  - This is what stops review findings from silently becoming scope (RESEARCH A3).

### 7.6 Tools, model, memory, calibration

- **tools:** `Read, Grep, Glob, Bash`.
  - `Bash` only for `agent-browser` and read-only commands; never edits, never installs.
  - `Write` / `Edit` are removed: the orchestrator writes, the prototype included (§7.2, the loop).
- **model:** `inherit`.
- **memory:** none (Q5).
- **Calibration.**
  - The agent body carries one kept finding and one rejected finding as few-shot examples, both generic, with no project names (RESEARCH B2).
  - The project can add its own in **`brain/chore/ux-review.md`**: an optional, project-owned page beside `motion.md`, with three parts:
    - **Component traps** of its stack, for example a library primitive that swallows keys;
    - **Kept examples**;
    - **Suppressed findings**, rejected ones with the reason.
  - When the user rejects a finding, `create-spec` offers to append it there.
- **Where the method lives.** In the agent body, as `design-engineer`'s modes do, so a tool without a subagent runtime can follow it inline. It moves to a skill only if a second consumer (for example a verifier accessibility pass) needs it.

### 7.7 Acceptance of the redesign

The redesign is accepted on the replay benchmark in RESEARCH part D (PLAN T17), not on reading its prompt. It uses three reference-project prototypes still in git history, with the defects found after them as ground truth, and the old `FLOW.md` as the baseline.

## Non-goals

- Making the UX trigger configurable. The prototype-gated flow is the standard; the agent stays invocable by hand.
- Simulated-user role-play, synthetic usability scores or heuristic health scores. The evidence says they add noise, not findings (RESEARCH B5, B8).
- Screen-reader testing by the agent. It lists the manual checks; it never claims to have run one.
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
   - `create-spec` consumes the handoff (§4) and writes `FLOW.md` v2 from `references/flow-map.md`.
   - On `iterate`, `prototype` runs the loop of §7.2. The user accepts each change, there are at most 3 changes and 2 rounds, and the agent never edits the prototype.
10. **Review ingest and FLOW parity.** `docs-maintenance` ingests review reports per §6.1, and the FLOW parity items of §6.2 are present.
11. **Reference project, dry run.** On a throwaway worktree of the reference project (PLAN T16), init plus upgrade yield:
    - suite skills and shipped agents byte-identical to the package;
    - config `review.mode: none` (confirmed with the user), `review.location: review-tree`, `paths.techDebt: brain/tech-debt`, `paths.personas: brain/personas.md`;
    - `AGENTS.md` canonical with `CLAUDE.md` linked;
    - `brain doctor` exit 0.
12. **`ux-advisor` redesigned per §7.**
    - The agent states its role and the moment table (§7.1–7.2) and the three verdicts.
    - It follows the method of §7.3, including the evidence gate, the caps and degraded mode, and returns the output contract of §7.4.
    - Its tools are `Read, Grep, Glob, Bash`, with no `Write` / `Edit` and no `memory:`.
    - It carries one kept and one rejected calibration example, with no project names, and reads `brain/chore/ux-review.md` when present.
    - `adversarial-verifier` and `adversarial-review` take `SPEC.md` criteria as the contract and `FLOW.md` as a map (§7.5).
13. **Replay benchmark passes** (RESEARCH part D, PLAN T17). On the three reference prototypes the redesigned agent meets every pass threshold against the old `FLOW.md` baseline. The results table is recorded in the PLAN log.
14. **Release hygiene.** `npm run build` and `npm test` green. EVAL.md updated. Version bumped to `0.7.0`. README documents the config, the modes and the new UX flow.

## Open questions

- **Q1 — Where the `ux-advisor` result persists between `prototype` and `create-spec`** if the run is interrupted.
  - Recommendation: `create-spec` is entered in the same run (Phase 6 already does this), so the result is passed in context and `create-spec` writes `FLOW.md`.
  - If the user stops after the review, persist it as `UX-REVIEW.md` next to the surviving prototype variant. `create-spec` picks it up from the cited prototype path, and it is deleted with the surface.
- **Q2 — Single-file tech-debt stores.** Support them as-is (append a `## <domain>/<spec>` section), or always migrate to per-spec files?
  - Recommendation: migrate. Per-spec files are what `docs-maintenance` and `review-ingest` address.
- **Q3 — Live accessibility checks. Resolved 2026-10-05: yes.** `ux-advisor` gets `Bash` to drive `agent-browser` against the prototype route, read-only. The maintainer adds that it must also **see the screens**: screenshots of every viewport and state it relies on, opened and inspected (§7.3, step 2).
  - Rendered evidence is the single biggest lever: the old agent never saw the UI, and every shipped defect class lived there (RESEARCH A2, B3).
  - `Write` / `Edit` are dropped at the same time (§7.6).
- **Q4 — `link --force` with a differing `CLAUDE.md`.** Refuse outright (recommended), or back it up somewhere first and then link?
- **Q5 — Agent memory.** Should shipped agents declare `memory: project` (Claude Code only)?
  - **Revised recommendation (2026-10-05): decide per agent.** The first recommendation was "no" for all of them. The reference project's numbers change it:
    - its `adversarial-verifier` holds 211 memory files: 112 feedback, 83 project, 13 reference;
    - the feedback notes are verification lessons (an assertion that compares a constant with itself, a test that asserts on a rebuilt node), not project facts;
    - folding them into brain pages would be either lossy or a large job, and without `memory:` the verifier stops reading them.
  - The proposal, agent by agent:
    - **`adversarial-verifier`, `review-classifier`:** `memory: project`. Their lessons are about how to check, and they keep accruing. The migration renames the legacy `review-classifier-router` folder to `review-classifier`.
    - **`ux-advisor`:** no memory. Its calibration lives in `brain/chore/ux-review.md`, a page the user reviews (Q9). The legacy twin's notes are offered for that page.
    - **`design-engineer`:** no memory. Its project knowledge lives in `brain/chore/motion.md` (already done in the reference project).
  - The trade-off: agent-written memory is unreviewed and Claude Code-only. Other tools ignore the key, and lose nothing they have today.
- **Q6 — `plan` mode and `create-spec`.** Should `plan` also keep the spec gate (verifier on `SPEC.md`)?
  - The user's definition moves review "only to the plan", so this spec says no; confirm before implementing.
- **Q7 — `FLOW.md` as a map. Resolved 2026-10-05: yes.** `SPEC.md` criteria are the only acceptance contract (§7.5). This changes `adversarial-verifier`, `adversarial-review` and the §6.2 parity port.
- **Q8 — Can the review reopen the approved prototype? Resolved 2026-10-05: yes, through small changes on the prototype, iterated on.**
  - The verdict is `iterate`, not a new divergent round: at most 3 small changes per round and at most 2 rounds.
  - The `prototype` orchestrator applies them and `ux-advisor` re-reviews (§7.2).
- **Q9 — The calibration page. Resolved 2026-10-05: fixed path.** `brain/chore/ux-review.md` is a convention, as `motion.md` is, with no `paths.*` key. No project has this page yet, so there is no existing location to honor.

## Risks

- **The iterate loop drags on, or grows into a redesign.** Mitigation: at most 3 changes per round and 2 rounds. Each change is tied to a P0/P1 finding and must keep the winner's direction. The user accepts each change, and anything bigger becomes a spec decision.

- **No browser in some tools.** Codex or Cursor installs without `agent-browser`, or a dev route that does not serve. Mitigation: degraded mode (§7.3.9) is explicit, short and honest, and it is still better grounded than the old text-only pass because it reads the components.
- **A slower prototype hand-off.** The browser pass adds minutes. Mitigation: it runs once per spec, at the one moment a rendered UI exists, and it replaces three automatic text-only passes.
- **A weak benchmark.** Three cases and one judge. Mitigation: the ground truth is compiled before the run, from defects that actually shipped. The thresholds are fixed in advance and failures iterate the agent, never the targets.

- **Instruction sprawl.** Mode conditions at every gate make the skills longer. Mitigation: one shared phrasing ("**Gate — `review.mode`: total**") and the matrix lives once in the Brain Schema; skills reference it.
- **Detection false positives.** A doc that merely mentions "persona" or "tech debt". Mitigation: the CLI only reports candidates; the LLM decides with the user. Nothing is moved without confirmation.
- **Behavior change for existing users.** The UX trigger moves for every project. Mitigation: called out in the README and the release notes; `FLOW.md` stays optional everywhere, so nothing breaks; the agent remains invocable.
- **Config drift.** A user edits the JSON by hand into an invalid state. Mitigation: `doctor` validates it; `brain config set` is the documented path.
