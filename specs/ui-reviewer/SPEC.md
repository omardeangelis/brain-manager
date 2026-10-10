---
domain: compat
type: spec
status: approved
links:
  - "[[specs/ui-reviewer/RESEARCH-ui-reviewer]]"
  - "[[specs/project-config-and-flow-modes/SPEC]]"
  - "[[specs/project-config-and-flow-modes/benchmark/ux-split]]"
  - "[[assets/agents/ux-advisor.md]]"
  - "[[assets/agents/design-engineer.md]]"
  - "[[assets/skills/prototype/SKILL.md]]"
  - "[[assets/skills/create-spec/references/flow-map.md]]"
  - "[[assets/skills/adversarial-review/references/verification-phase.md]]"
created: 2026-10-08
updated: 2026-10-08
---

# `ui-reviewer`: review of the rendered UI

Add a shipped agent, `ui-reviewer`, that reviews the **static UI of a rendered surface**:
- placement and geometry;
- responsive widths and wrapping;
- contrast;
- focus-indicator visibility;
- target size and hit area;
- accessible-name markup;
- browser- and device-specific rendering.

It measures in the browser with tested probes, shipped in a companion skill, `ui-review`. It returns a few ranked decisions that become acceptance criteria, as `ux-advisor` does for UX. It ships in 0.7.0, on the same branch as `project-config-and-flow-modes`.

Evidence: [RESEARCH-ui-reviewer.md](RESEARCH-ui-reviewer.md), with the full reports in [research/](research/).

## User input

> Varrebbe la pena definire uno ui/designer che si occupi di fare quella review specifica ?

> sì, imposta la spec con create-spec ma vorrei fare tutto in questo flusso. Da dove possiamo prendere spunto per un agente con questo compito ? Puoi fare una ricerca ?

On the review of this spec (2026-10-08):

> 2 Si aggiorniamola adesso, non deleghiamo in prossime release

> Per il beanchmark usiamone solo 1, gli errori segnalati prima non hanno valore di label affidabile e sono derivati da un agents che stiamo sostituendo.

> A, soglia ok, procedi con create-plan. Dammi un prototipo su cui darti feedback. Mi voglio limitare a UI & Motion, UX lo lasciamo all'advisor

Earlier, in `project-config-and-flow-modes` (SPEC Q10):

> Mi interessa solo la parte di UX review, la UI la lascio al design-engineer. Concentrati unicamente su questo

## Problem

Since Q10, `ux-advisor` reviews UX only and hands UI to `design-engineer`. That hand-off reaches nobody:
- `design-engineer` covers motion and interaction craft at build time. It has no browser and no shell. Its precedence line says that the project's own "frontend-design guidance covers layout and aesthetic direction", which most projects do not have.
- `ux-advisor` points visual accessibility to "axe in the review pipeline", but no skill in the package runs axe.
- The frozen benchmark lists 14 non-motion UI candidates in three specs. Their labels come from reviews by the agents this work replaces, so they show the kind of defect that ships, not a reliable measure (D5). Today nothing looks for them (RESEARCH part A).
- These defects are measurable: 11 of the 14 candidates can be shown with evidence in desktop Chromium with the `agent-browser` already in use, and the last `ux-advisor` run that still reviewed UI already ran commands that would have surfaced 7 more of them. **What is missing is a reviewer with the right bar, not a tool** (RESEARCH A).

## Goal

1. A UI reviewer that measures before it judges, names the engine behind every finding, and returns decisions the spec can adopt.
2. One owner for each concern, stated the same way in every agent, skill and doc.
3. The probes are deterministic and tested, so the review pipeline can reuse them on the implemented change.
4. Accepted on one prototype whose defects the maintainer labels, not on reading its prompt (RESEARCH part D).
5. The bundled `agent-browser` skill always matches the installed CLI (§7).

## Ownership

| Concern | Owner |
|---|---|
| UX: tasks, outcomes and states, leaving and interrupting, what the copy means, focus after an action, announcements | `ux-advisor` |
| Static UI of the rendered page: placement, widths and wrapping, contrast, focus-indicator visibility, target size and hit area, accessible-name markup, browser and device rendering, instant re-layouts with nothing animating | `ui-reviewer` (review); the `ui-review` skill (bar and probes) |
| Motion and interaction craft: anything that changes while an animation or transition runs on the surface, reduced motion, gestures | `design-engineer` / `design-engineering` |
| Aesthetic direction, typography and colour choices | the project's brand or frontend-design guidance; `prototype` explores directions |

The boundary with motion is one rule: **if it changes while an animation or transition runs on the surface, it is motion; an instant re-layout with nothing animating is UI.**
- **LS-6 is motion:** the header grows instantly while its frame animates.
- **SS-9 is UI:** a centered modal jumps when its content changes, and nothing animates.

**Target size has one owner.** Today the `design-engineering` references and the `design-engineer` baseline require 44 px tap targets. That moves to the `ui-review` bar and the project's own standard (§6). The motion references drop the tap-target size; their other pointer rules stay.

**The same defect seen by both reviewers becomes one criterion.** `ux-advisor` reports a UI problem that blocks a task by its consequence (for example, Save hidden under the keyboard). `create-spec` merges it with the UI finding on the same element: the UI review owns the cause and the fix, and the UX review owns the task consequence (§4.2).

## 1. Role and moments

`ui-reviewer` is a reviewer. It never changes the project's files, its server or its data. It never edits the prototype and never fixes what it finds. Its tools are `Read, Grep, Glob, Bash`. Bash drives `agent-browser`. The agent may change the live page's DOM, for example to inject worst-case content.

| Moment | Who calls it | What exists | Output goes to |
|---|---|---|---|
| **Prototype review** (primary) | `prototype` Phase 6, after the user picks a winner, in parallel with `ux-advisor` | the winner at its route; the Phase 1 scope; the winner's values; what the prototype fakes; the project's UI bar | `create-spec` in the same run; the verdict goes to the user |
| **Live-surface review** (explicit only) | the user, naming a running route | the route and its code | the user, with a suggestion to run `/prototype` or `create-spec` |
| **Anything else** (a spec draft, no rendered UI) | — | text only | one line naming the moment that fits; no review |

The third moment, the **UI pass** of `adversarial-review`, does not spawn the agent. It runs the `ui-review` skill's bar and probes inside the existing verifier pipeline (§4.3).

The verdict is one of `proceed`, `proceed with decisions` or `iterate`, with the same meaning as `ux-advisor`'s.

## 2. Method

Revised by D10 (2026-10-10): the method is lean and breadth-first. The bar and the probes live in the `ui-review` skill (§5); the agent uses the probes to measure what it reports, not as a pipeline it must run in full.
1. **Read the project.**
   - `brain/brain.config.json`;
   - the root `AGENTS.md`, for the stack and any design-system pointer;
   - `brain/chore/ui-review.md` when present (§6);
   - the code behind the surface.
2. **Cover every state and width.**
   - **States:** every screen, step, fixture, error, empty, loading and open-overlay state the surface can show.
     - On a prototype, reach them through its harness and fixtures.
     - On a live route, reach them through the interface itself and mocked responses (`network route`), never by changing the server or data.
   - **Widths:** from the project's minimum (default 280 px) to the widest breakpoint the CSS defines (default 1440 px): at least 280, 320, 375, 414, 768, 1024, 1280 and 1440, every CSS breakpoint ±1 px, a phone in landscape, and the narrow end again at 1.25× root font size.
   - **Content:** the longest realistic values, injected into the page.
   - **In each state, at each width:** an opened screenshot, and a check of every class of the bar (placement, widths and wrapping, contrast in each theme, focus by real Tab presses, target size and hit area, names from the full accessibility tree, rendering and instant re-layouts).
3. **Measure what you report.**
   - Each finding is backed by a number from the page or a screenshot that shows it; the skill's probes are the tested way for focus-ring clipping, hit area, composited contrast, width ranges and layout jumps.
   - **axe** when a source is available (§5); its violations are candidates, confirmed like any other finding.
   - A probe that disagrees with its fixture gives no number.
   - Every failure measured is reported, including one found on the way to something else.
4. **Device rendering.** Safari focus behaviour, the virtual keyboard and the iOS toolbars need a real engine.
   - **When it counts as installed:** `appium` is on `PATH`, and `appium driver list --installed` shows `xcuitest`.
   - **Then:** use Mobile Safari in the iOS Simulator (`agent-browser -p ios`).
   - **Otherwise:**
     - never run `-p ios`, because its launcher may download Appium;
     - mark each such finding "not verified on device";
     - give the code hypothesis, the rule and one fix;
     - list the manual check.
   - **Never install device tooling.**
5. **Evidence and scope.** Every finding has:
   - its location: element or selector, state, width range;
   - the engine: Chromium, Mobile Safari (Simulator), or code;
   - what was measured or seen;
   - the rule: a WCAG criterion, a rule the project states, or a heuristic named in the skill;
   - one fix.

   - **Numbers.** Every number stated (pixels, ratio, width range, duration) is in a file or screenshot of the run folder; otherwise the defect is described without it. Code-grounded findings cite the code line instead.
   - **No evidence:** without evidence, a finding becomes an open question.
   - **Left out:** intentional regions (scroll areas, carousels, truncation by design), suppressed findings, and UX, motion or taste. Findings that share an element and a width range are merged.
6. **Degraded mode.** Without `agent-browser`, print a `DEGRADED` banner and report only code-grounded hypotheses, with no measured values.

## 3. Output contract

```
## Verdict: proceed | proceed with decisions | iterate — <one line>
## Engines         Chromium <version> · Mobile Safari (Simulator) | not available · axe <source> | not available · widths <min>–<max> · states forced
## Prototype changes    (only with iterate; ≤ 3, each: finding # → change → how to check it on screen)
## Decisions       (all of them, ranked) | # | P | Decision needed | Recommended default | Acceptance criterion | Evidence | Engine |
## Mechanical fixes     (bundled; one line each: location · rule · measured → required · fix)
## Not verified on device   (each: hypothesis from code · rule · fix · manual check with exact steps)
## Checked and clean     (the classes checked with no finding, one line each)
## Not tested      (the classes and states not tested, and why)
## Open questions  (≤ 3, each with a default)
```

No scores, no praise, no prose sections. Never drop a finding to keep the review short (D10).

Where this spec and RESEARCH part C differ, this spec wins.

## 4. What the review turns into

### 4.1 `prototype` Phase 6

- `prototype` spawns `ux-advisor` and `ui-reviewer` in parallel on the winner. Each uses its own `agent-browser` session.
- **When an agent can't run:**
  - if `ui-reviewer` is not installed, skip it and say so;
  - if the tool cannot spawn subagents, run its charter inline.

  `ux-advisor` already follows the same rule.
- The user sees one combined verdict, the stricter of the two.
- **The iterate loop is shared.**
  - At most 3 prototype changes per round, chosen by the user from both reviews, and at most 2 rounds.
  - After a round, the agent whose items changed re-reviews them.
  - **Both** agents run their regression pass, because a copy fix can re-wrap a row and a hit-area fix can move focus.
  - The UI regression pass re-runs the probes on the changed elements and on the classes it had checked clean.
- If the user stops after the reviews, the UI review is saved verbatim as `UI-REVIEW.md` next to `UX-REVIEW.md`. It is deleted with the prototype surface.

### 4.2 `create-spec`

`references/flow-map.md` gains the UI review. It comes from context, or from `UI-REVIEW.md` next to the surviving variant after an interrupted run.

| UI review section | Goes to |
|---|---|
| Verdict and Engines | one line in Context, next to the UX verdict |
| Decisions | one acceptance criterion each, as for UX |
| Mechanical fixes | one criterion that lists them, one line each with location |
| Not verified on device | Constraints ("verified manually on device: …") |
| Open questions | Open Questions, each with its default |
| Prototype changes | Decision Log, with exact values |
| Checked and clean, Not tested | not copied; the evidence stays in the review |

**Merge rule:** a UX finding and a UI finding on the same element become one criterion. The UI wording carries the cause and the fix; the UX wording carries the task consequence.

`FLOW.md` stays a flow map, and UI criteria need no `FLOW.md` row. A rejected UI finding is offered for `brain/chore/ui-review.md` → Suppressed findings. `create-spec` never spawns `ui-reviewer`.

### 4.3 `adversarial-review`

- **When the pass is chartered.** `review-classifier` charters a **UI pass** when the change set contains rendered-UI code. That covers:
  - component or template markup;
  - stylesheets, style props or utility classes;
  - colour, spacing, type or radius tokens;
  - ARIA, role or label attributes;
  - inline SVG icons.

  The motion-craft pass lists its signals the same way.
- **Who serves the route.** The `adversarial-review` orchestrator, not the verifier, which stays read-only.
  1. It starts or locates the dev server with the command the root `AGENTS.md` documents.
  2. It maps each changed surface to a route, using the spec's prototype route, the `PLAN.md` task, or the project's router.
  3. It passes the URLs in the verifier's brief.
  4. It stops the server after the pass, if it started it.
- **Who runs it.** An `adversarial-verifier` run with the `ui-review` skill as its rubric and probes. Driving `agent-browser` against the served route is within the verifier's read-only contract.
- **What it checks.**
  - **Case A** (standalone review): the skill's bar, on the changed surface.
  - **Case B** (spec implementation review): the spec's UI acceptance criteria **and** the skill's bar on the changed surface, because the implementation adds defects the prototype did not have (D2).
- **Without a route** (no documented dev command, or it fails): the pass runs on the code only, labelled `DEGRADED`, and `REPORT.md` says why.
- **Without the skill** (`ui-review` not installed): no UI pass, and `REPORT.md` says so in one line.
- **No duplicate pass:** the motion-craft pass keeps motion and drops target size (§Ownership).
- **Review modes:** the Brain Schema's matrix gains a row: "UI verifier pass | whenever a review runs | same | same". As with motion, the pass runs only inside a review. Under `plan` and `none`, code review is offered, not run, so implementation-introduced UI defects are caught only on request (see Risks).

## 5. The `ui-review` skill

A companion skill linked from the agent's `skills:` frontmatter, the way `design-engineering` is linked to `design-engineer`. `install-skill ui-review` installs the agent with it. It holds:
- **The bar**, one section per class. Each section gives:
  - the rule and its source (the WCAG 2.2 criterion, or a named heuristic);
  - what the project can override in `brain/chore/ui-review.md`;
  - the evidence that proves it.
- **The probes**, as script files the agent runs through `agent-browser eval`. Each returns JSON. There are seven:
  - width sweep with row counts;
  - resize against a fresh load;
  - edge placement;
  - focus-ring clipping and enclosure;
  - hit-area grid;
  - composited contrast;
  - layout-shift capture.
- **A fixture page** that reproduces each probe's defect (the research probe page grown into a test fixture), with the expected result of each probe on it.
- **The traps** of the driver, each with its workaround (RESEARCH B3):
  - `focus` paints no ring; use `press Tab`;
  - `vitals` reloads the page;
  - screenshot paths must be absolute;
  - wrap each `eval` script in a function;
  - `get styles` is not an effective background;
  - `set device` gives no touch.
- **axe**, when available, as a second opinion and a source of "needs review" items, never the only check (D6).
  - **Source, in order:**
    1. `agent-browser a11y`, on 0.33.0 or later;
    2. the project's own `node_modules/axe-core`, injected with `eval --stdin`;
    3. none.
  - **Never** from a CDN, and never installed.
  - **Re-inject** after any navigation, reload or `vitals`.
  - **Without a source:** the contrast probe still runs, and Engines says "axe not available".
- **The device route:** how to tell whether the Simulator is usable, and what it adds.

## 6. Project knowledge: `brain/chore/ui-review.md`

A fixed path, like `brain/chore/ux-review.md` (SPEC Q9 of `project-config-and-flow-modes`). It has four sections:
- **Project bar:** minimum width, target-size standard, engines and devices the project supports, any design-system rule the review enforces.
- **Component traps.**
- **Kept examples.**
- **Suppressed findings.**

**Who writes it.** `ui-reviewer` cannot write, so it only reads the page, before every review. Without the page, it uses the defaults of §2.
- **`create-spec`** creates the page on the first suppressed finding.
- **init-brain** creates it when it routes UI-review knowledge from a project's own agents.
- **The user** writes the Project bar. `create-spec` and init-brain offer to start it, never to fill it in.

## 7. The bundled `agent-browser` skill

Today `assets/skills/agent-browser/` is a third-party copy: a 229-line `SKILL.md`, six references and three templates, 1,666 lines in all. It predates 0.27.1, and it ships without the Apache-2.0 license of its source. Upstream (`vercel-labs/agent-browser`, `skills/agent-browser/SKILL.md`) is now a short discovery stub. The CLI itself serves the usage guide for its own version through `agent-browser skills get core`, so the guide cannot drift from the installed binary. 0.27.1 already has `skills get` (D7). The stub's list of specialized skills can name some that an older CLI lacks; it points to `skills list` for the real set.
- **The bundled skill becomes the upstream stub,** taken from a recorded upstream commit (`021d9255`, 2026-08-24, when this spec was written), with upstream's Apache-2.0 license file next to it. The old references and templates leave `assets/`.
- **Two changes to the upstream text:**
  - **`hidden: true` is dropped.** It is an `agent-browser` CLI key that hides discovery stubs from `skills list`. A provider has no use for it and could read it as "do not surface".
  - **`Bash(npx agent-browser:*)` is dropped from `allowed-tools`,** because `npx` can download the CLI (Constraints).

  As Apache-2.0 §4(b) requires, a comment inside `SKILL.md` states both changes, the upstream commit and the date.
- **Who loads the guide.** Everything that drives `agent-browser` runs `agent-browser skills get core` before its first command:
  - `ux-advisor`;
  - `ui-reviewer` and the `ui-review` skill;
  - `prototype`;
  - `implement-spec`, for `browser` and `mixed` validation;
  - the verifier's UI pass.

  Each keeps only its own task commands, and the `ui-review` skill keeps the traps (§5). `create-plan` only assigns the skill, so it needs no change.
- **Upgrade.**
  - `upgrade` replaces an unmodified bundled copy with the stub.
  - **A project-owned copy** (its entries have role `seed`) is never touched, as today. New files under it (the license) are not installed either. Today `planUpgrade` would install them (`src/core/plan.ts`).
  - **Files the package no longer ships** (orphans), for every skill, not only this one:
    - **Removed** when the manifest tracks the file as `managed` and its content still matches the manifest hash. A file whose Project Advisors block holds content counts as modified, because the hash normalizes those blocks away.
    - **Never deleted when modified,** even with `--force`. It stays on disk, leaves the manifest, and is reported in that run, as today.
    - **Missing on disk:** the entry is dropped, nothing is deleted, and the report says "missing" rather than "left on disk".
    - **Directories** that the removal leaves empty are removed.
    - **A scoped `--skill` run** applies the rule only to the paths in its scope.
    - **`--dry-run`** lists every file it would remove.
- **Docs.**
  - The README's tool-skill line and init-brain describe the stub and the version-matched guide.
  - init-brain's verify step reports `agent-browser` as needed for the review, with its installed version. It reports Appium with the XCUITest driver as optional, adding Mobile Safari for the device classes.

## Non-goals

- Aesthetic critique, taste, health or 0–100 scores (RESEARCH B2).
- UX and motion findings. They have owners.
- Screen-reader testing by the agent. It lists the manual checks and says that Chromium's computed name may differ from VoiceOver's.
- Visual regression baselines across releases.
- Installing Appium, the XCUITest driver, or any other device tooling.
- Native mobile apps. The scope is the web.
- Fixing defects. The agent reviews; fixes go through the spec flow.

## Acceptance criteria

1. **The agent.** `assets/agents/ui-reviewer.md`:
   - states the ownership table, the motion boundary rule, the moment table (§1) and the three verdicts;
   - has tools `Read, Grep, Glob, Bash`, with no `Write`, `Edit` or `memory:`;
   - lists `ui-review` under `skills:`;
   - carries kept and rejected calibration examples with no project names, including a rejected UX finding and a rejected motion finding.
2. **The method.** The agent requires every step of §2:
   - the project read;
   - every state at every width of §2.2, with opened screenshots and every class checked;
   - the probes for what it reports, and axe when a source exists (§5), its violations confirmed like any other finding;
   - every measured failure reported;
   - the device route, with the §2.4 installed-check and no `-p ios` without it;
   - the evidence and scope rules of §2.5;
   - the degraded mode.

   It also requires:
   - screenshots written to an absolute temporary path, never inside the project tree;
   - nothing downloaded or installed during a review.
3. **The output.** The agent returns the §3 contract:
   - the §3 sections in order, with Prototype changes only under `iterate`;
   - every decision found, ranked, each with a default, an acceptance criterion, evidence and an engine (no cap, D10);
   - at most 3 open questions, each with a default.
4. **The skill.** `assets/skills/ui-review/` holds:
   - the bar, one section per class, each with its rule source and what the project can override;
   - the seven probes as files;
   - the fixture page, with each probe's expected result;
   - the driver traps;
   - the axe notes and the device notes (§5).
5. **The probes are tested.**
   - **Expected results:** run with `agent-browser` 0.27.1 on the fixture page, each probe returns its expected result.
   - **Automated suite:** runs this check when `agent-browser` is installed, and skips it with a note otherwise.
   - **Manual eval:** a manual eval row covers it.
6. **Prototype Phase 6.**
   - **Spawn:** both reviewers in parallel, on separate `agent-browser` sessions, with the §4.1 rule for a missing agent or no subagents.
   - **Verdict:** one combined verdict, the stricter of the two.
   - **Iterate loop:** at most 3 changes per round, chosen from both reviews, and at most 2 rounds. The affected agent re-reviews, and both run their regression pass.
   - **On stop:** `UI-REVIEW.md` is saved when the user stops after the reviews.
7. **`create-spec`.**
   - Reads the UI review from context or from `UI-REVIEW.md`.
   - Maps every section per the §4.2 table.
   - Merges a UX finding and a UI finding on the same element into one criterion.
   - Offers rejected findings for suppression, creating `brain/chore/ui-review.md` on first use.
   - Never spawns `ui-reviewer`.
8. **`adversarial-review`.**
   - **Trigger:** `review-classifier` charters the UI pass on the §4.3 signals.
   - **Route:** the orchestrator starts or locates the dev server, maps changed surfaces to routes, passes the URLs in the brief, and stops the server only if it started it.
   - **Runner:** `adversarial-verifier` runs the pass with the `ui-review` skill. `references/verification-phase.md` has a "UI pass only" paragraph, like the motion-craft one. It states that driving `agent-browser` against the served route is within the verifier's read-only contract, including DOM injection and `network route` mocks, and that no file, server or data changes.
   - **Checks:**
     - Case A: the bar on the changed surface;
     - Case B: the spec's UI criteria and the bar on the changed surface.
   - **Without a route:** `DEGRADED`, with the reason in `REPORT.md`.
   - **Without the skill:** no pass, with one line in `REPORT.md`.
   - **Brain Schema:** the review-mode matrix has the UI verifier pass row.
9. **One owner per concern.** These files state the §Ownership table consistently:
   - **`ux-advisor`:** its description (line 3), its owner table including "content that jumps", and its rejected UI example name `ui-reviewer`. No reference to axe in the review pipeline remains.
   - **`design-engineer`:** its description and precedence read "motion and interaction craft", and static UI review goes to `ui-reviewer`.
   - **The `design-engineering` skill:** `SKILL.md` (its routing row), `references/review.md`, `audit.md`, `accessibility.md`, `gestures.md`, and the `design-engineer` baseline no longer set a tap-target size. They defer to the `ui-review` bar and the project's standard; their other pointer rules stay.
   - **`create-plan` and `implement-spec`:**
     - the advisor triggers route "motion and interaction craft" to `design-engineer`;
     - the spec's UI criteria become plan tasks;
     - static UI is verified by the UI pass.
   - **`prototype`, the Brain Schema and the README.**

   No file in `assets/`, `skills/` or the README says that static UI review or target size belongs to `design-engineer`.
10. **Device rendering.**
    - `-p ios` runs only after the §2.4 installed-check passes.
    - Otherwise each device finding is labelled "not verified on device", with the code hypothesis and a manual check.
    - init-brain's verify step reports `agent-browser` as needed, with its installed version, and Appium with the XCUITest driver as optional (§7).
11. **Project page.**
    - `ui-reviewer` reads `brain/chore/ui-review.md` when present, and uses the §2 defaults without it.
    - `create-spec` and init-brain create the page as §6 says, and leave the Project bar for the user.
    - init-brain's advisor detection treats a project's own UI-review agents as legacy twins and routes their knowledge to the page.
12. **Packaging.**
    - `init` installs 12 skills and 5 agents.
    - `upgrade` adds `ui-review` and `ui-reviewer` to an older install.
    - `doctor` reports both as tracked.
    - `install-skill ui-review` and `upgrade --skill ui-review` install the skill with `ui-reviewer`.
    - Every count and every list of shipped advisors in the README, `test/EVAL.md` and `skills/init-brain/` (`SKILL.md`, `references/advisor-detection.md`, `references/verify.md`) includes `ui-review` and `ui-reviewer`. Their tests assert the counts.
13. **The benchmark passes** the bar of RESEARCH part D, on one case: `company/company-onboarding-redesign` at `e2442d09`. After a failure, part D's path applies: a fresh case labelled the same way, or the maintainer's explicit acceptance.
    - **Labels:** the maintainer's judgments of a pooled candidate list. No list compiled by an agent is a label, and no artifact of that spec dated after `e2442d09` is a label source.
    - **Before any run:**
      - the maintainer's notes are written and sealed (outside the tree, with only their SHA-256 in the PLAN log);
      - the commit of the agent and the skill is in the PLAN log.
    - **Isolation until scoring.** No session that writes the agent or the skill reads any of these:
      - the notes;
      - the control output;
      - the pool or the judgments;
      - any artifact of that spec dated after `e2442d09`.

      Each run writes its output, probe JSON and screenshots outside the tree, and returns only the path. Nothing in the agent or the skill changes between the run and the scoring.
    - **Scoring:**
      - the case is scored once, with the RESEARCH D definitions of a finding, of "found" and of validity;
      - the results table (`ui-reviewer` and the control) is in the PLAN log;
      - the judged pool is committed to `specs/ui-reviewer/benchmark/` after scoring.
    - **The earlier candidates.** The frozen candidates of the three earlier specs are development material only, never an acceptance target. The fixture reproduces the ones a probe targets.
14. **Release hygiene.**
    - Build and tests green.
    - `test/EVAL.md` has rows for the agent, the probes, the shared iterate loop, the UI pass, the benchmark and the `agent-browser` stub.
    - The README's 0.7.0 release notes describe the agent, the split and the `agent-browser` refresh.
    - No reference-project names in `assets/`.
    - The Brain Schema twins are identical.
15. **The `agent-browser` stub** (§7).
    - `assets/skills/agent-browser/` holds only the upstream stub and its Apache-2.0 license file.
      - `hidden: true` and `Bash(npx agent-browser:*)` are dropped.
      - A comment in `SKILL.md` names the upstream commit and both changes.
    - These run `agent-browser skills get core` before their first browser command:
      - `ux-advisor`;
      - `ui-reviewer` and the `ui-review` skill;
      - `prototype`;
      - `implement-spec`;
      - the verifier's UI pass.
    - **`upgrade` on a 0.6 install:**
      - it replaces the unmodified copy;
      - it removes the old references and templates that still match their manifest hash, and the directories left empty;
      - it keeps and reports a modified one, even with `--force`;
      - it leaves a `seed` copy alone and does not add the license to it.
    - **The orphan rule** of §7 holds for every managed file:
      - `managed` only;
      - an advisor block with content counts as modified;
      - a file missing on disk is dropped from the manifest;
      - scoped `--skill` runs act on their scope only;
      - `--dry-run` lists the files.

      Tests cover each case.
    - The README and init-brain describe the stub, and no shipped file points to the removed references.

## Constraints

- Ships in 0.7.0, on `feat/project-config-and-flow-modes` (maintainer, 2026-10-08).
- Works with `agent-browser` 0.27.1 or later. Newer commands (`a11y` from 0.33.0) are used when present, never required.
- Nothing is downloaded at review time: no CDN scripts, no package installs.
- Screenshots go to an absolute temporary path, never into the project tree.
- The package is public: calibration examples and fixtures are generic.
- The package stays MIT. The `agent-browser` stub keeps its Apache-2.0 license file next to it (§7).

## Decisions

Resolved by the maintainer.
- **D1 — A dedicated UI reviewer.** Resolved 2026-10-08.
  - **Decision:** the static UI review goes to a new agent, `ui-reviewer`. `design-engineer` keeps motion and interaction craft.
  - **Supersedes:** "UI goes to `design-engineer`" in Q10 of `project-config-and-flow-modes`, for the review of static UI and for target size.
  - **Why:** the design-engineer charter is built around motion and craft guidance, and it cannot see the page. Adding the UI scope to it would rebuild the mixed agent that Q10 split.
- **D2 — Moments.** Resolved 2026-10-08: prototype review, live-surface review, and a UI pass in `adversarial-review`.
  - **Why:** the implementation introduces defects the prototype does not have. The frozen benchmark deliberately excluded those, so only a pass on the change can catch them.
  - **How the pass runs:** inside the verifier pipeline, on the shared skill, instead of a second agent. This keeps one charter per pass and one findings format.
- **D3 — Device rendering.** Resolved 2026-10-08: the Simulator when it is already installed; otherwise "not verified on device", with the code hypothesis and a manual check. Never install device tooling.
- **D4 — Probes in a companion skill.** Resolved 2026-10-08: tested script files in `ui-review`, reused by the verifier's UI pass, instead of scripts written into the prompt.
- **D5 — Benchmark on one case, labelled by the maintainer.** Resolved 2026-10-08, revising the first answer ("three seen cases plus one held out").
  - **Case:** `company/company-onboarding-redesign` at `e2442d09`.
  - **Why:** the candidates of the three earlier specs come from reviews by the agents this work replaces, so they are not reliable labels. They stay as development material.
  - **Labels:** the maintainer's judgments of a pooled candidate list, seeded by the maintainer's own notes written before any run.
  - **Notes:** the maintainer writes them (option A, 2026-10-08). They cover UI and motion; UX stays with `ux-advisor`. Motion notes are judged out of scope for this benchmark and kept for `design-engineer`.
  - **Scoring:** once.
  - **Bar:** RESEARCH part D, approved by the maintainer on 2026-10-08.
- **D6 — axe source.** Resolved 2026-10-08: `agent-browser a11y` on 0.33.0 or later, then the project's `node_modules/axe-core`, then none. Never from a CDN (§5).
- **D7 — Refresh the bundled `agent-browser` skill in this release.** Resolved 2026-10-08: the upstream discovery stub, with the version-matched guide served by the CLI (§7). Not deferred.
- **D8 — No UX replay re-run.** Resolved 2026-10-08: `ux-advisor`'s method does not change, only the owner names. Recorded in the PLAN log.
- **D9 — Winner only.** Resolved 2026-10-08: `ui-reviewer` reviews the winning variant, as `ux-advisor` does. Variants compete on direction, not polish.
- **D10 — A lean charter, accepted without re-scoring.** Resolved 2026-10-10, after the benchmark failed (PLAN T14; `benchmark/scoring.md`).
  - **What failed:** recall 40.5% against 50%; fewer real defects than the control run (25 against 38); four numbers not in the kept output; device hypotheses without rule or fix. The control, a general-purpose agent with only the ownership table, went through more states and widths and reported every defect it measured.
  - **Decision:** the maintainer chose a leaner agent, accepted as is, with no further iteration on the benchmark: breadth first (every state at every width, every class checked), the probes used to measure what is reported instead of a full pipeline in every state, every measured failure reported (no cap on decisions, no line cap), every number in a kept file, rule and fix on device hypotheses too. A missing `ui-review` skill no longer stops the review; it runs without the probes.
  - **Unchanged:** the ownership split, the moments, the verdicts and the loop, the §3 section names (`create-spec` maps them), the device route, the degraded mode, and the `ui-review` skill used by the UI pass.

## Open questions

None. The four questions of the first draft are D6–D9.

## Risks

| Risk | Mitigation |
|---|---|
| The probes were shaped on the earlier candidates and may miss other kinds of defect | The benchmark case is a different spec. The control run and the maintainer's own notes add candidates that no probe targets (RESEARCH D) |
| The pool contains the agent's own findings, so recall against it would test nothing | Recall is measured only on the real defects that another source found: the maintainer's required notes, the control, or the judgment. One case and one judge make the result a floor check, not proof |
| A failed case cannot be reused: its misses are then known | Scored once. After a failure, a fresh case is labelled the same way, or the maintainer accepts explicitly (RESEARCH D) |
| The stub's guide changes with each CLI release | That is its purpose. The `ui-review` traps are re-checked against the fixture by the probe tests (AC5) |
| An upgrade deletes a file a project relied on | Only files the manifest tracks as `managed`, unchanged since, and no longer shipped. Modified files, and files whose advisor block holds content, are kept and reported, even with `--force`. `--dry-run` shows the list first |
| Probes over-report invisible geometry | Opened screenshots confirm what a script or probe finds (§2.2) |
| Two reviewers double the time after `keep` | They run in parallel, and the iterate loop is shared and capped |
| A fix for one reviewer breaks the other's concern | Both agents run their regression pass after every round (§4.1) |
| Under review mode `plan` or `none`, defects introduced by the implementation are caught only when a review is requested | Stated in the Brain Schema matrix. The spec's UI criteria still reach the plan as tasks. The project chooses its mode |
| The UI pass runs `DEGRADED` because no route serves | The orchestrator serves the route from the root `AGENTS.md` dev command; `REPORT.md` names the reason when it cannot |
| Chromium hides device defects | Engine named on every finding; Simulator when present; manual checks listed |
| The agent drifts into UX, motion or taste | Ownership table, rejected calibration examples, and "no UX or motion findings" in the pass bar |
