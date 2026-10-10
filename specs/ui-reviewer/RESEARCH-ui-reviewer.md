---
domain: compat
type: reference
links:
  - "[[specs/ui-reviewer/SPEC]]"
  - "[[specs/project-config-and-flow-modes/RESEARCH-ux-advisor]]"
  - "[[specs/project-config-and-flow-modes/benchmark/ux-split]]"
  - "[[assets/agents/ux-advisor.md]]"
  - "[[assets/agents/design-engineer.md]]"
created: 2026-10-08
updated: 2026-10-08
---

# Research: who reviews the rendered UI, and how

The evidence behind [SPEC.md](SPEC.md). Since SPEC Q10 of `project-config-and-flow-modes` (2026-10-06), `ux-advisor` reviews UX only and hands UI to `design-engineer`. But:
- `design-engineer` is built around motion and interaction craft, and it has no browser and no shell;
- its precedence line leaves layout to the project's own frontend-design guidance, which most projects do not have.

So nobody reviews the static UI of a rendered page.

This page:
- shows that gap on the UI candidates of the frozen benchmark (part A);
- collects what is known about detecting these defects (part B);
- derives the design rules the spec adopts (part C);
- defines how the new agent is accepted (part D).

The full reports are in [research/](research/), compiled on 2026-10-06 by three read-only research passes:
- [practitioners.md](research/practitioners.md): 25 agents, skills and tools;
- [evidence.md](research/evidence.md): papers, standards and vendor data;
- [mapping.md](research/mapping.md): each UI defect against standards and `agent-browser` commands, with a probe page.

They paraphrase their sources; this page cites them by section.

## A — Internal evidence: the 16 UI candidates of the frozen benchmark

`benchmark/ux-split.md` classifies 16 of the 43 ground-truth defects as UI.

**These are candidates, not labels** (maintainer, 2026-10-08). They come from reviews by the agents this work replaces, so they show what kind of UI defect ships, but they carry those agents' blind spots and errors. They shaped the probes and the fixture. They do not accept the agent (part D).
- **Motion (2):** LS-5 and LS-6. They stay with `design-engineer`.
- **The other 14:**

| Class | Defects |
|---|---|
| Placement and geometry | LS-1 (card opens pressed against the viewport bottom), SS-9 (centered modal jumps on every height change; Salva can sit under the iOS toolbar) |
| Responsive widths and wrapping | LS-2 (open card keeps its opening width after resize or rotation), SS-1 (chip row wraps to a 3rd line only at card widths 270–343 px) |
| Contrast | SS-12 (12 px counter at about 3:1) |
| Focus visibility | LS-7 (ring clipped by `overflow: hidden`), AS-2 (ring around the 16 px box, not the row) |
| Target size and hit area | AS-1 (only the label toggles; the row's padding is inert; about 20 px against the 40 px claimed) |
| Accessible-name markup | SS-10 (✕ named in English, reached last), SS-11 (name does not contain the visible «+28»), AS-3 (name runs together, no context for the percentage), AS-4 (decorative tick SVG announced) |
| Browser and device rendering | SS-7 (Safari and macOS Firefox do not focus a clicked button), SS-8 (the virtual keyboard covers Save) |

**Who caught what** (mapping.md §2):
- **Old `FLOW.md`: 1 of 16.** SS-8, from reasoning with no browser.
- **`ux-advisor` iteration 1: 4 of 16.** This was the only run that still reviewed UI.
  - LS-2: resize, then measure the card.
  - SS-12: axe in the forced 30/30 state.
  - AS-1: coordinate clicks plus element boxes.
  - AS-3: the accessibility tree.

**The bottleneck is the instructions, not the tooling** (mapping.md §5). Iteration 1 already ran commands that could have shown at least 7 more defects:
- LS-1: it had the screenshot of the card 16 px from the bottom and judged it fine.
- LS-7: it measured the clipped ring on the wrong element.
- SS-1: it swept widths with short fixture names.
- SS-10, SS-11, AS-2, AS-4: it read the tree but had no bar that turned these into findings.

**Ceiling for the 14** (mapping.md §5):

| Where | How many | Which |
|---|---|---|
| Desktop Chromium, installed `agent-browser` 0.27.1, nothing new installed | 11 | all except SS-7, SS-8, SS-9 |
| Desktop Chromium, half | +1 | SS-9: the jump shows, the toolbar does not |
| Mobile Safari in the iOS Simulator | +1, maybe +2 | SS-9's toolbar, possibly SS-7 |
| Only from the code | 1–2 | SS-8, which needs a native tap to raise the keyboard; SS-7 on desktop Safari and Firefox |

## B — External evidence

Read the direction, not the decimals. Most 2025–26 items are preprints with small samples, and several numbers are vendor claims (evidence.md marks how each source was read).

### B1. What detects each class, and how well

1. **Measure geometry in the DOM. Use screenshots to confirm, not to find.**
   - General vision models are near chance on boundary defects: text overflow F1 22%, container overlap 34%. The best models average about 65% (UI-Lens, CVPR 2026; evidence B2).
   - Adding screenshots lowered two frontier models' F1 on rendering defects, from about 0.85 to 0.73–0.78 (WebCompat preprint, evidence A5).
2. **DOM geometry over-reports.** ReDeCheck (ISSTA 2017) reported collisions and protrusions with no false positives, but also 83 overlaps nobody could see, because of transparent padding or `overflow: hidden`. Hiding the element and diffing a cropped screenshot matched human judgement 86–92% of the time (VERVE; evidence A1–A2).
3. **Sweep widths; don't use device presets.**
   - The preset widths of five responsive-testing tools revealed only 66–81% of real layout failures (ReDeCheck).
   - Its recipe: 60 px steps plus every CSS breakpoint, then a binary search where the layout changes.
   - For a defect that lives between 270 and 343 px, a finer step below about 480 px is needed (evidence A7).
   - Report width ranges, not widths: 328 reports came down to 137 ranges and 33 real failures.
4. **Stale geometry after resize has no literature.** No tool or paper compares a resized layout with a fresh load at the same width (evidence A7, practitioners coverage table). LS-2 is that defect.
5. **axe is precise but sees little of this scope.**
   - Precision 0.90 and recall 0.36 against expert audits (agentic auditing preprint, evidence C6).
   - Deque's own data: 83% of contrast (1.4.3) issues automated, but 0% of focus-visible (2.4.7) and of non-text contrast (1.4.11) (vendor claim, evidence C3).
   - `target-size` is off by default and passes a 16 px box that has spacing around it.
   - `label-content-name-mismatch` is experimental and ignores punctuation, so it passes «+28» inside "…28…".
   - No axe rule tests focus indicators (mapping.md §4).
   - On our 14 defects, a default run catches 1 (SS-12).
6. **Focus visibility is the largest gap and the agent's best chance to add value.**
   - In the 2018 GDS audit of 13 tools, none caught "focus not visible" (evidence C3).
   - The only published automated method compares crops of the same element focused and unfocused. Its vendor claims about 95% precision (evidence C5).
   - 2.4.13 is defined as a change of contrast between those two states, so it is inherently a two-screenshot measurement (evidence C4).
7. **Contrast must be computed, never estimated.**
   - No evidence shows that vision models judge near-threshold ratios; they invent colour codes (evidence B8).
   - An element's own computed background is often transparent. The effective background needs the alpha-composited ancestor stack, in each state (practitioners §16, mapping.md §3.3).
8. **Accessible names: tools for presence, a reader for meaning.**
   - axe found 16 of 17 name/role/value cases in one study.
   - Redundant or glued names need a reader of the accessibility tree. An LLM reading screen-reader output caught redundant labels at about 0.7 precision and recall (ScreenAudit, CHI 2025; evidence C6).
   - Chromium's computed name depends on CSS: flex children read «Docker 58%», inline spans read «Docker58%». So Chromium does not prove what VoiceOver reads (mapping.md §3.3).
9. **Desktop Chromium cannot reproduce device rendering** (evidence D1–D3, mapping.md §4):
   - it has no software keyboard and no collapsing Safari toolbar;
   - `set device` sets viewport, pixel ratio and user agent, but no touch;
   - WebKit does not focus buttons on click.

   Mobile Safari in the iOS Simulator adds the toolbars. The keyboard probably still needs a native tap, which `agent-browser` does not send.
10. **Agentic auditing trades precision for recall** (evidence C6).
    - Per-criterion agents reached recall 0.86 at precision 0.56.
    - Listing the criteria in the prompt raised recall and false positives together.
    - Precision needs a measured value with every finding, and a check of intentional regions before flagging: carousels, scroll areas, ads (evidence B2, E).
11. **A practical precision floor.** Google's Tricorder puts an analyzer on probation once 10% of its results are marked not useful. Effort tracks distinct (element, width range) groups, not raw reports (evidence E).

### B2. Practitioner agents and skills

None of the 25 sources publishes the precision or recall of its reviews (practitioners Overview). Stars measure adoption, not quality. What to copy:

- **[pbakaus/impeccable](https://github.com/pbakaus/impeccable)** (77k stars):
  - every report names the engine and device the evidence came from, and what stayed untested;
  - its finish reviewer validates screenshots before judging and asks to recapture bad ones;
  - its verdict is derived from the findings.
  - Avoid its health score.
- **[openai/skills `playwright-interactive`](https://github.com/openai/skills/blob/main/skills/.curated/playwright-interactive/SKILL.md)** (28k):
  - check each claim in the state where it is seen, on the densest state and at the minimum width;
  - visible clipping in a screenshot overrules metrics;
  - sign off only with real input;
  - end with the defect classes checked and not found.
- **[plugin87/ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills)** (1.5k):
  - never state a ratio you did not measure;
  - contrast is computed against composited ancestors, in default, hover and focus;
  - narrow widths are rerun at 1.25× font size;
  - a missing browser fails loudly;
  - a requirement that keeps failing becomes a deterministic check.
- **[ibelick/ui-skills `improve-ui`](https://github.com/ibelick/ui-skills)** (9.4k):
  - a finding needs a cited rule, evidence that it reaches the screen, and exactly one correction;
  - a falsification pass runs before reporting;
  - "no supported findings" is a valid result.
- **[vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines)**: the most compact rule set for this scope, covering unobscured focus, 24/44 px targets, no dead zones, safe areas, and `min-w-0`. It is code-only.
- **[OneRedOak/claude-code-workflows `design-review`](https://github.com/OneRedOak/claude-code-workflows)** (3.9k): the most copied phase-and-triage template, and "live environment first". Avoid its fixed 1440/768/375 widths, the write tools on a reviewer, its mandatory praise and its unbounded output.
- **Avoid everywhere:**
  - health or 0–100 scores;
  - promised checks the agent cannot run (screen readers, Chromatic, Percy);
  - naive probes:
    - contrast read from the element's own background;
    - `outline !== none` taken as proof of a visible ring;
    - counts with no locations.

### B3. The driver: `agent-browser` facts and traps

Verified on 0.27.1 with the probe page (mapping.md §3–4).

**Useful:**
- `get box`;
- `set viewport <w> <h> <dpr>`;
- `press Tab`;
- `mouse move/down/up` with `is checked`;
- a full `snapshot -s <scope>`, which shows decorative images that `-i` hides;
- `diff screenshot`;
- `eval` for `getBoundingClientRect`, `elementFromPoint` and a layout-shift observer.

**Traps:**
- `focus <sel>` does not trigger `:focus-visible`, so a screenshot after it shows no ring.
- `vitals` reloads the page, wiping injected scripts and opened state, and its CLS ignores shifts caused by input.
- Relative screenshot paths resolve against the daemon's directory.
- `eval` keeps top-level `const` between calls, so every script must be wrapped in a function.
- `get styles` returns about 400 properties and the element's own background.
- `set device` gives no touch.

**Versions:**
- `a11y`, with axe built in, arrives in 0.33.0; the latest is 0.38.2. It is not available on iOS sessions.
- The iOS provider (`-p ios`) drives real Mobile Safari but needs Appium with the XCUITest driver. Appium is launched through `npx`, so a first run may download it.
- The bundled `assets/skills/agent-browser/` copy is older than 0.27.1. It documents none of the above.
- **The CLI serves its own guide.** `agent-browser skills get core` (and `--full`, about 2,400 lines) prints the usage guide for the installed version; 0.27.1 has it. Upstream's `skills/agent-browser/SKILL.md` is now a short stub that points there (Apache-2.0, last changed in commit `021d9255`, 2026-08-24; checked 2026-10-08). The bundled copy is a third-party version of the older long skill and carries no license file.

## C — Design rules adopted by the spec

Each rule cites what forces it (A = internal, B = external).

| # | Rule | Evidence |
|---|---|---|
| 1 | Review a **rendered** surface only: the prototype winner, a running route, or the route of a change under review. Without a browser, print a DEGRADED banner and report only code-grounded hypotheses with no measured values | A, B1.1, B2 (plugin87) |
| 2 | **Two evidence layers.** Shipped, tested probes measure; the model judges what they return, inspects the screenshots, and covers what probes cannot (intent, which text is "the label", exceptions) | B1.1–2, B1.5, B2 (impeccable, plugin87) |
| 3 | **Geometry from the DOM, confirmed on screen.** An overlap or protrusion is reported only after a cropped screenshot shows it. Visible clipping in a screenshot is reported even when metrics look fine | B1.1–2, B2 (playwright-interactive) |
| 4 | **Width sweep**, not presets: from the project's minimum width (default 280 px), fine steps below 480 px, every CSS breakpoint ±1 px, binary search on change, repeated at 1.25× root font, with the longest realistic content injected. Report width ranges and the container's own width | A (SS-1), B1.3, B2 (plugin87) |
| 5 | **State × width × resize.** Every forced state at the densest content; open at a wide width, resize to a narrow one, and compare with a fresh load there; place the trigger at the top, middle and bottom of the viewport | A (LS-1, LS-2), B1.4, B2 (playwright-interactive) |
| 6 | **Focus pass with real Tab presses** on every focusable control in every forced state. Compare the focused crop with the unfocused one, test the ring against clipping ancestors and fixed overlays, and require it to enclose the hit area | A (LS-7, AS-2), B1.6, B3 |
| 7 | **Hit area equals what looks clickable.** Probe a grid with `elementFromPoint` and real clicks. Measure targets against the project's standard (24 px by default; 44 or 48 when the project says touch-first) | A (AS-1), B1.5 |
| 8 | **Contrast is computed**, against the composited ancestor background, in each state and theme the project has. axe, when available, is a second opinion and a source of "needs review" items, never the only check | A (SS-12), B1.5, B1.7 |
| 9 | **Read names from the full tree**: the name starts with the visible label; words are not glued; the language matches the page; decorative graphics are hidden; nothing is announced twice. State that Chromium's name may differ from VoiceOver's | A (SS-10/11, AS-3/4), B1.8 |
| 10 | **Name the engine.** Every finding says where its evidence came from: Chromium, Mobile Safari (Simulator), or code. Device classes go to the Simulator when it is present; otherwise they are "not verified on device", with the code hypothesis and a manual check | A (SS-7, SS-8, SS-9), B1.9, B2 (impeccable) |
| 11 | **Evidence gate and falsification.** Every finding has location (selector, state, width range), the measured value or the screenshot, expected against actual, the rule (WCAG criterion, project rule, or a named heuristic), one fix. Before reporting, rule out intentional regions and re-check each finding. No measurement → no number | B1.10, B2 (ibelick, plugin87) |
| 12 | **Bounded, decision-shaped output.** At most 6 decisions, each with a default and an acceptance criterion, plus a bundled list of mechanical fixes. Group by (element, width range). End with the classes checked and clean, and the classes not tested and why. No scores, no praise | B1.11, B2 |
| 13 | **Stay in the lane.** No UX (task, outcomes, copy meaning), no motion (anything that changes while an animation or transition runs on the surface), no aesthetic taste. Token or design-system conformance only when the project states the rule | Q10 split, B2 (ibelick) |
| 14 | **Calibrate and suppress.** Generic kept and rejected examples in the agent, and a project page (`brain/chore/ui-review.md`) for the project's bar, component traps and suppressed findings | RESEARCH-ux-advisor B2, B9 |

## D — How "better" is measured

Opinion is what shipped the old UX agent, so `ui-reviewer` is accepted on a run against labelled defects, not on reading its prompt. Maintainer decision (2026-10-08): **one case**, labelled by the maintainer, because the frozen candidates of part A are not reliable labels.

- **The case.** `company/company-onboarding-redesign` at `e2442d09`, `src/prototypes/company-onboarding/`. It is the reserve case of RESEARCH-ux-advisor part D.
  - None of the probes or recipes of part C came from it.
  - Before anything runs, confirm that the prototype is still in history and serves.
- **What is never a label source.** A list compiled by an agent, and any artifact of that spec dated after `e2442d09`: its spec, its review `REPORT.md`, its tech-debt pages, its later fix commits. PLAN T17 of `project-config-and-flow-modes` built its labels from exactly those, so its step 1 does not apply here.
- **The labels: a judged pool.**
  1. **The maintainer's notes** (required, before any run):
     - the maintainer looks at the prototype from 280 to 1440 px, in every state the harness can force, for about 20–30 minutes, and notes the UI and motion defects they see. UX is left to `ux-advisor`. Motion notes are judged out of scope here;
     - the notes are the one source no agent shaped;
     - they are written outside the repository, and only their SHA-256 goes into the PLAN log.

     Without the notes, recall is not tested, and acceptance needs the maintainer's explicit decision.
  2. **The `ui-reviewer` run.** It runs first.
  3. **A control run.**
     - **Setup:** the same brief, the same model and effort, and the same `agent-browser` version, run by a clean-context general-purpose agent. It may load `agent-browser skills get core`.
     - **Prompt:** asked to review the static UI, with the ownership table, but without the `ui-reviewer` charter and without the `ui-review` skill.
     - **Purpose:** it measures what the charter and the probes add, and it widens the pool.
  4. **Pooling.** A clean-context pooler:
     - checks the notes against their SHA-256;
     - merges duplicates across the sources (the same failure on the same element or state, as the rubric defines a hit);
     - rewrites every candidate in one uniform format, so that no layout reveals its source, and shuffles the order;
     - keeps the source of each candidate in a sealed map for scoring.
  5. **Judgment.** The maintainer judges each candidate as one of:
     - a real UI defect;
     - not a defect;
     - out of scope: UX or motion, by the split rule of `benchmark/ux-split.md`;
     - can't tell.

     Defects the maintainer notices while judging join the pool, as found by the judge. After scoring, the judged pool is committed to `specs/ui-reviewer/benchmark/` for the record.
- **Isolation until scoring.**
  - **What no writing session reads.** No session that writes the agent or the skill reads any of these:
    - the notes;
    - the control output;
    - the pool or the judgments;
    - any artifact of that spec dated after `e2442d09`.
  - **Freeze.** The commit of the agent and the skill goes into the PLAN log before any run, and nothing in them changes until scoring.
  - **Run output.** Each run writes its review, probe JSON and screenshots outside the tree, and returns only the path.
- **Setup.** As in PLAN T17 of `project-config-and-flow-modes`, steps 2–4:
  1. a throwaway worktree at the prototype commit;
  2. the dev server and the stand-in API;
  3. the brief that `prototype` Phase 6 would send;
  4. clean-context runs, each on its own `agent-browser` session, with git forbidden.
- **Definitions.**
  - **A finding** is one Decision row, one Mechanical-fix line, or one "Not verified on device" hypothesis. Open questions are not findings.
  - **Found:** a real defect counts as found by a review when the scorer, applying the frozen rubric (`benchmark/scoring-rubric.md`), marks it a strict hit. A code-grounded hypothesis labelled "not verified on device" is scored by the same rubric.
  - **The independent set:** the real defects that the notes, the control or the judge found. The pool also holds the agent's own findings, so recall against the whole pool would test nothing.
  - **Recall:** the share of the independent set that `ui-reviewer` found.
  - **Validity:** valid findings ÷ all findings. A finding is valid when every pool item it maps to (sealed source map) is judged real. "Can't tell" and out-of-scope count as not valid.
- **Pass bar** (approved by the maintainer, 2026-10-08):
  - the independent set holds at least 4 real non-motion UI defects. With fewer, the maintainer decides before scoring whether the case stands or a second prototype from history is added the same way;
  - recall of at least 50%;
  - more real defects found than the control run, counted over all real defects;
  - validity of at least two thirds;
  - no measured value (pixels, ratio, width range) that the run's kept probe JSON or screenshots do not contain;
  - every finding carries location, engine, rule and one fix;
  - at most 1 finding judged out of scope (UX or motion). It also counts against validity. Zero would let one borderline call use up the only case;
  - at most 120 lines, and at most 3 open questions.
- **On failure:**
  - iterate the agent and the skill on the fixture page and the development material of part A, never on the case or its labels;
  - log each iteration in the plan;
  - the case is scored **once**. A new version needs a fresh case labelled the same way, or the maintainer's explicit acceptance.
- **Device classes.** On a machine with Appium and the XCUITest driver, the run also records what the Simulator adds. Without them, the device hypotheses are judged like any candidate. The bar does not depend on it.

One case and one judge make this a floor check, not proof.
