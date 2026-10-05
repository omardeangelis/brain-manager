---
domain: compat
type: reference
links:
  - "[[specs/project-config-and-flow-modes/SPEC]]"
  - "[[specs/project-config-and-flow-modes/PLAN]]"
  - "[[specs/project-config-and-flow-modes/REFERENCE-sevedemo]]"
  - "[[assets/agents/ux-advisor.md]]"
created: 2026-10-05
updated: 2026-10-05
---

# Research: why `ux-advisor` underdelivers, and what works instead

The evidence behind SPEC §7. The maintainer's verdict, after four months of the agent's project twin (`ux-flow-strategist`) running on every user-facing spec of the reference project: its output did not make the product's UX or UI noticeably better. This page checks that verdict against the artifacts the agent produced (part A) and against what is known about LLM-driven UX evaluation (part B), then derives the design rules SPEC §7 adopts (part C) and the benchmark that decides whether the redesign is better (part D).

## A — Internal evidence: 31 `FLOW.md` in the reference project

Audit done on 2026-10-05 over `brain/specs/**/FLOW.md` of the reference project ([REFERENCE-sevedemo.md](REFERENCE-sevedemo.md)), cross-checked against each spec's `SPEC.md`, `IMPLEMENTATION-NOTES.md`, review `REPORT.md`, tech-debt page and the git history of later fixes. Seven specs were read in full; corpus-wide numbers come from greps.

### The output is specific, not generic, and still did not move the product

The agent does not fail by being vague. Later `FLOW.md` files read the code, cite components and propose exact copy. It fails because of **when** it runs, **what** it looks at and **what its output turns into**.

| Measure (31 files) | Value |
|---|---|
| Length | mean 262 lines (median 156). Files written before 2026-08-01 average 115 lines; after, 355 (×3.1) |
| Section balance | happy path ≈ 15% of lines; error, edge and friction sections dominate (one file: happy 53, error 187, edge 157) |
| Open questions | ≈ 196 (6.3 per file); only ≈ 27% carry a recommendation |
| Accessibility | 14/31 files have ≤ 2 lines on it; contrast appears in 4, reduced motion in 11, screen reader in 15 |
| Grounding in the rendered UI | 2–3 files measured anything on a running page; two state outright that no browser measurement was taken |
| Grounding in code | 11/31 cite a `src/` path; 25/31 name a component; **0/31** mention the headless component library the UI is built on |
| Staleness | 13/31 still carry struck-through or "voided/rewritten" content |
| Copies | `docs-maintenance` re-ingests each `FLOW.md` into domain pages (60 back-links): the same flow lives in SPEC, FLOW and the domain layer |

### Five failure patterns, by impact

1. **It runs after the decisions and is told not to reopen them, so it audits instead of designing.**
   - `create-spec` step 8 briefs it with the drafted `SPEC.md`. The files open by saying the owner's decisions are not up for discussion ("maps the paths, does not redesign").
   - Consequences seen in the history:
     - one file endorsed blur-autosave and proposed a ~2 s idle save; the owner reverted it after seeing it on screen, and the superseded review had 2 BLOCKER / 7 MAJOR in the save engine;
     - a mini-bar was mapped in four error/edge entries instead of being flagged as the third display of the same number; it was removed during execution;
     - a placement recommendation was reversed at the first on-page trial.
2. **It never observes the rendered UI or the real components.** The defects that shipped live in component behavior, which a text-only pass cannot see:
   - a hit area clipped by an accordion's `overflow: hidden`;
   - a list's keyboard delegate swallowing arrows/Home/End so the page cannot scroll;
   - a design-system checkbox that cannot forward `aria-*` and toggles twice;
   - a toast fallback that never rendered after a resize;
   - a centered dialog jumping ~110 px when async content lands;
   - focus leaking out of portalled modals;
   - an existing in-page «Back» control stranding users;
   - wrong data assumptions (24 of 25 real entries lacked the field the flow assumed).

   None of these classes appears in any of the 31 files.
3. **Bloat turns into scope.**
   - Implementation detail runs throughout (chart update modes, refetch flags, z-indexes), against the agent's own rule.
   - `adversarial-review` loads `FLOW.md` as part of the acceptance contract, so every edge case becomes something a verifier must check.
   - The extra reconciliation states one `FLOW.md` mandated are exactly where that spec's review BLOCKERs sit.
4. **Questions instead of choices on cheap UI calls.** About 27% of open questions carry a recommendation; one file has 0 of 9. A predicted truncation at 375 px was left either/or; the wrong branch shipped and was fixed after the walkthrough.
5. **Accessibility is declared, not reconciled.** It is absent in about half the files, and specs without it got reviews without it. Where present it sometimes contradicts the flow's own design (an `aria-live` region inside an inert modal: a review BLOCKER) or what the design-system component can do.

### What the agent did well (the redesign must keep it)

1. **Spotting where today's code is already broken:** a dead self-link, box-in-box layout, a save bar over the scrim, a PATCH that answers 200 and silently drops fields, a missing sync date. Highest-yield content; it went straight into the specs.
2. **Honesty and silent-data-loss reasoning:** "timeout ≠ failure", copy that stays conditional until success, invite attribution lost on an old link, "the quota is shared, not your fault".
3. **Concrete copy grounded in the user's situation** (a label that reads as a zoom rather than a filter, "remove from history" rather than "delete").
4. **Proposed acceptance-criteria text plus a "where the spec will be misread" table.** Adopted almost verbatim.
5. **Personas as concrete situations, not as the canonical segments.** The admin pasting a personal profile URL, the invited would-be freelancer, the owner judging a chart on staging: these changed decisions. The canonical four were decorative in most files (one segment appears in 18 files, 9 of them only to exclude it).

### Smaller defects

- The project twin declares `memory: project`; its 22 notes (~1,000 lines) are mostly component mechanics, against its own "don't save file paths" rule. Engineering knowledge, not UX knowledge. One memory path points at another clone of the repo.
- The shipped `ux-advisor` (0.6.0) shares every structural trait above: same trigger points, same `FLOW.md` template, no browser, `Write`/`Edit` tools to author the file itself.
- The contract mechanism behind pattern 3 is in the package too: `assets/agents/adversarial-verifier.md` treats every `FLOW.md` happy/error/edge path as part of the acceptance contract, and an unhandled one as at least MAJOR.

## B — External evidence

Research pass done on 2026-10-05. Sources are paraphrased. Several are 2025–26 arXiv preprints with small samples, so read the direction, not the decimals. The two load-bearing ones were opened and confirmed (Flow-A11y, CHI'24); the rest are as reported by the research pass.

### Findings

1. **Free-form LLM critique has low precision and repeats itself.**
   - GPT-4 on Figma mockups (CHI'24, [arXiv 2403.13139](https://arxiv.org/abs/2403.13139)):
     - precision about 0.60, against 0.83 for a human evaluator;
     - designers flagged over-application of guidelines, repetition and vagueness.
   - GPT-4o on screenshots ([arXiv 2506.16345](https://arxiv.org/abs/2506.16345)):
     - 111 issues, of which 43 duplicates and 27 false positives;
     - recovered 14 of the experts' 66 issues;
     - the false positives were guesses about interactions it never triggered.
   - A 2026 study on 12 UIs ([SBC 2026](https://cbsoft.sbc.org.br/2026/data/papers/sast/An%20Exploratory%20Study%20on%20Prompting%20Strategies%20for%20LLM-Assisted%20Heuristic%20Evaluation%20of%20Web%20User%20Interfaces.pdf)):
     - precision 0.35–0.40 under every prompting strategy, slight agreement with experts;
     - chain-of-thought raised recall and false positives together.
2. **Few-shot examples at the right evidence bar are the strongest prompt lever. Zero-shot output is generic and long.**
   - UICrit (UIST'24, [arXiv 2407.08850](https://arxiv.org/abs/2407.08850)): zero-shot critiques were general, assumption-laden and about twice as long. Few-shot examples matched to the task improved quality by 55%, still well below humans.
   - A validation-and-refinement step closed part of the remaining gap ([arXiv 2412.16829](https://arxiv.org/abs/2412.16829)).
3. **Evidence from interacting with the UI beats static views, but only when the browser work is structured.**
   - Flow-A11y ([arXiv 2607.03100](https://arxiv.org/abs/2607.03100)):
     - a generic "explore and audit" browser agent agreed with the oracle on about 3% of checks and found none of the known failures;
     - scenario-driven traces with per-criterion evidence reached over ten times that agreement;
     - the evidence gate alone raised fail precision from 23.5% to 41.4%.
   - UXBench ([arXiv 2606.16262](https://arxiv.org/abs/2606.16262)):
     - counts a finding only if it links to an observed interaction event;
     - measures actionability by how much a fixing agent improves the UI from the report.
4. **Automated accessibility tools catch the common issues, not most of WCAG.**
   - axe-core finds about 57% of issues by volume ([Deque](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/), vendor study). Measured by planted barriers it finds about 30% ([GDS audit](https://alphagov.github.io/accessibility-tool-audit/)).
   - Deque's own agent guidance lists what static analysis cannot see: focus order, keyboard traps, focus visibility, correct name/role/state in context, modal focus handling.
   - Task-driven, screen-reader-aware agents found far more interaction-only errors than checkers ([TaskAudit, arXiv 2510.12972](https://arxiv.org/abs/2510.12972); [ScreenAudit, arXiv 2504.02110](https://arxiv.org/abs/2504.02110)).
5. **Simulated users are too competent, so persona role-play finds too little.**
   - Synthetic cognitive walkthroughs: LLMs completed nearly every task and found 3 failure points against the humans' 10. Agreement became moderate only with the full navigation history ([arXiv 2512.03568](https://arxiv.org/abs/2512.03568)).
   - UXAgent's simulated users were rated moderately realistic and unrealistically thorough ([arXiv 2502.12561](https://arxiv.org/abs/2502.12561)).
   - Generic personas helped barely more than none ([arXiv 2606.05697](https://arxiv.org/abs/2606.05697)), and LLMs flatten identity groups ([Nature MI 2025](https://www.nature.com/articles/s42256-025-00986-z)).
6. **LLM feedback degrades on designs that were already improved** (CHI'24: accuracy and helpfulness fell across iterations). An approved prototype winner is exactly that case.
7. **Where LLMs help and where they don't.**
   - Relatively good at copy, grouping and subtle errors.
   - Weak at user control and freedom, error prevention and efficiency: the flow-level heuristics.
8. **Severity from a single rater is unreliable.** One evaluator finds about a third of problems; [NN/g](https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/) averages 3–5 raters.
9. **Practitioner agents and skills publish no evaluation of their reviews.** Popularity is not evidence. Patterns worth copying:
   - **[pbakaus/impeccable](https://github.com/pbakaus/impeccable), critique mode:**
     - browser inspection is mandatory when the target renders;
     - a deterministic detector runs separately so it does not anchor the model;
     - 3–5 priority issues, each with severity, what, why and fix;
     - persona red flags must name the exact element;
     - an ignore list stops known false positives from returning;
     - a "degraded" banner appears when a step was skipped.
   - **[Vercel web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines):** short pass/fail rules, `file:line` output, no preamble.
   - **[wshobson/agents](https://github.com/wshobson/agents):** "assume the goal is not met until visual evidence proves it".
   - **[Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design):** test your output for genericness.
   - **The checklist trap** ([VoltAgent collection](https://github.com/VoltAgent/awesome-claude-code-subagents)): agents that promise screen-reader testing they cannot run, and examples with invented metrics.

### Tooling already in the package

The bundled `agent-browser` skill covers the runtime work:
- `snapshot -i`: the accessibility tree with refs;
- `press`: keyboard walks;
- `set viewport` / `set device`;
- `set media dark|light reduced-motion`;
- `set offline`;
- `network route <url> --body|--abort`: forcing states with mocked responses;
- `eval`: injecting axe-core.

The upstream CLI also ships an `a11y` command with axe built in; the bundled skill text predates it.

## C — Design rules adopted by SPEC §7

Each rule cites the evidence that forces it (A = internal pattern, B = external finding).

| # | Rule | Evidence |
|---|---|---|
| 1 | Run on a **rendered, approved** UI, never on a spec draft. Without a browser, print a DEGRADED banner and report only code-grounded findings and questions | A2, B1, B3, B9 |
| 2 | Know the moment: what exists, what does not, who reads the output next. The approval sets a direction, not a frozen decision: the agent may return `iterate` with at most 3 small prototype changes, which the orchestrator applies before the spec is written (maintainer decision, Q8) | A1, B6 |
| 3 | Tools do the mechanical part (screenshots it then inspects, axe, viewport, themes, reduced motion, offline, mocked states). Their results go in one bundled fix list, not prose. The model spends its effort on what tools cannot see | B4, B9 |
| 4 | A scripted keyboard walkthrough of each primary task, with dialogs and menus checked against the WAI-ARIA APG patterns; read the source of the components the winner uses, headless primitives included | A2, A5, B4 |
| 5 | Force each user-observable state instead of imagining it; a state matrix (present / missing / not reachable). Engineering edge cases (concurrency, retries, caching) are out of scope | A3, B3 |
| 6 | Personas as constraint sets turned into concrete situations, walked with the four cognitive-walkthrough questions and full path history; report only where situations differ, plus hand-offs between personas. No role-play | A keeper 5, B5 |
| 7 | Evidence gate: every finding has a location, observed evidence and repro steps. No evidence → open question, never a finding | B1, B3 |
| 8 | Cap and rank: at most 6 product decisions, P0–P2 with a one-line reason; merge repeats; "no blocking issues" is valid. No health scores | A3, B1, B8 |
| 9 | Decisions, not prose: decision needed → recommended default → acceptance criterion → evidence. At most 3 open questions, each with a default | A4, A keeper 4 |
| 10 | Keep what worked: what is already broken around the surface, silent-data-loss and honesty reasoning, concrete copy, the "where the spec will be misread" table | A keepers 1–4 |
| 11 | Calibrate with examples (one kept, one rejected finding) and a project suppression list | B2, B9 |
| 12 | The acceptance contract lives in `SPEC.md` only. `FLOW.md` becomes a map that cites AC ids, so review findings cannot silently become scope | A3 |

## D — How "better" is measured

Opinion is what got the current agent shipped, so the redesign is accepted on a replay benchmark (PLAN T17), not on reading its prompt.

- **Cases.** Three specs of the reference project whose prototype surface is still in git history (check each prototype-to-spec mapping before starting):

  | Spec | Prototype commit | Surface |
  |---|---|---|
  | `company/linkedin-sync` | `3adcff19` | `src/prototypes/linkedin-sync/` |
  | `freelance/suggested-skills` | `442aeea4` | `src/prototypes/competenze-suggerite/` |
  | `freelance/dashboard-feedback` (add-skills step) | `24aacc0d` | `src/prototypes/add-skills/` |

  The reserve case is `company/company-onboarding-redesign`, at `e2442d09`, `src/prototypes/company-onboarding/`.
- **Ground truth, compiled before running anything.** From each spec's review `REPORT.md`, tech-debt page and later fix commits:
  - keep the defects observable on the prototype (UX, accessibility, missing states, wrong placement);
  - drop backend-only and implementation-only ones.
- **Run.**
  1. Check the prototype commit out in a throwaway worktree and serve it.
  2. Brief the redesigned agent exactly as `prototype` Phase 6 would.
  3. The baseline is the `FLOW.md` the old agent wrote for the same spec.
- **Metrics:**
  - recall on the known defects;
  - share of findings the maintainer judges valid and worth acting on;
  - decisions the maintainer would have put in the spec;
  - share of decisions with a default and an AC;
  - length;
  - open questions;
  - runtime claims made without trace evidence.
- **Pass:**
  - recall at least twice the baseline's, and at least 40% of the known observable defects;
  - at least two thirds of findings valid;
  - at least one adopted P0/P1 decision per case;
  - every decision carries a default and an AC;
  - at most about 120 lines and at most 3 open questions;
  - zero runtime claims without evidence.
- **On failure,** iterate the agent (calibration examples first), never the targets, and log each iteration in the plan.

n = 3 and a single judge make this a floor check, not proof. It still beats the status quo, where nothing measured whether `FLOW.md` changed the product.
