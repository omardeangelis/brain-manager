# New-review score — add-skills step («Modo selezione»)

Document: `review-as.md` (UX review of the add-skills «Modo selezione» prototype, 62 lines). Ground truth: `gt-as.md` (AS-1…AS-14, N = 14).
Rubric: `scoring-rubric.md`, applied with the conventions the baseline scorer used (`score-baseline-as.md`):
- A bundled defect is a hit when most of its sub-failures are covered, otherwise a partial.
- A defect named exactly but explicitly dismissed is a partial.
- Findings = decisions + mechanical fixes + already-broken items.
- A runtime claim is unsupported only when it cites no observation (trace step, screenshot, axe rule, matrix cell) and no code location. Naming a code identifier counts as a citation, as in the baseline.

Quotes are exact.

1.

| GT ID | verdict | quote + section |
|---|---|---|
| AS-1 | hit | «clicks on its padding do nothing. Mouse at (664,254) and (740,240) did not toggle; only the 294×20 label and the 16×16 box do. Make the whole row the label.» — Mechanical fixes, «Row hit area». The fix entry also says «the row highlights on hover». Covered: only the label and box toggle, the padding is inert while the row highlights, and the label is 20 px tall. The 40 px claim appears only as a manual check: «Real phone (coarse pointer, 40 px rows)». Most sub-failures are covered. |
| AS-2 | partial | «Checkbox focus ring** (`checkbox-row.tsx:45`, same as `ui/checkbox.tsx:27`): computed ring is #9AC2FE on about #F6F6F6, roughly 1.7:1» — Mechanical fixes. This is the same element and the same line, but it reports ring contrast. It never says the ring wraps only the 16 px box and not the row. |
| AS-3 | partial | «checkbox 1 is read as «Docker, 58%, casella non selezionata»» — Manual checks still needed. The separated name appears only as an expectation in a manual check. The review never reports the run-together name, and Prototype change 1 quotes the snapshot name «Docker 58%» without comment. «delle ricerche» is missing. That is 1 of 2 sub-failures, with no requirement in the decisions or fixes. |
| AS-4 | miss | — Nothing on the tick SVG `<title>` or on an extra announcement. |
| AS-5 | hit | «Keep the entry button while gaps > 0 and places > 0» — Decisions #3. The Verdict adds «after one success there is no way to add more», and the AC reads «Tab reaches the entry button». |
| AS-6 | hit | «Confirm: the outcome line» and the evidence ««Aggiungi» → BODY» — Decisions #1. The AC reads «Focus is never on `<body>` after any of the three actions». |
| AS-7 | hit | «Keep the bar mounted until the outcome: «Aggiungo…» with `aria-busy`, boxes locked» — Decisions #2. Supporting evidence: «`06-1280-saving.png`: reading view plus the entry button, no progress». Prototype change 2 adds «Stop calling `setMode(false)` on click (lines 129–133)». Covered: no saving state, the mode exits at once, and the open button is live during the save (seen in 06 and removed by keeping the bar). Not covered: re-entry swallowing the success, since re-entry is reported only as showing «Aggiungo…». 3 of 4. |
| AS-8 | hit | «On failure, stay in the mode with the selection checked, put the error under the bar, and let «Aggiungi» retry.» — Decisions #2. Supporting evidence: «`09`: «…Riprova.» with nothing to retry». Lost focus is covered by the AC of Decision #1, which includes confirm. Not covered: a stale error after reopening. 3 of 4. |
| AS-9 | miss | — Nothing on a forced close (resize) during the save or on the toast. Decision #5 covers a user-initiated close while in the mode, not the outcome of a save in flight. |
| AS-10 | miss | — Decision #5 quotes the room line as evidence («Puoi aggiungerne ancora 16»), and Decisions #2 and #6 set its copy. Its presence when there is plenty of room is never questioned. |
| AS-11 | miss | — The confirm button «Aggiungi» appears only for contrast (Mechanical fixes) and as `aria-disabled` (State matrix). The copy rule in Decision #6 targets the entry button (`modo-selezione.tsx:112`). Nothing requires the confirm label to say what it adds or how many. |
| AS-12 | partial | «Keep the production copy «Aggiungi le skill che hai davvero» (`translations.json:1236`)» — Decisions #6. Same honesty prompt, but placed on the entry button, not as a lead line at the top of the mode column. |
| AS-13 | hit | «On over-cap, the room line reads «Ne hai scelte 3, ora c'è posto per 1: togline 2.»» — Decisions #2. Supporting evidence: ««Hai riempito i posti rimasti» next to «ora puoi aggiungerne 1»». The AC reads «With «Tetto cambiato», the line says how many to remove». |
| AS-14 | partial | «What the user sees during the save and after a failure» — Decisions #2. This is a generic failure rule, and it designs only «Da ripetere» and «Tetto cambiato». Rate-limit, quota, rejected, timeout and already-present are never named. The State matrix marks offline and no-permission as «not reachable». |

2. strict recall = 6 / 14 = 0.43; lenient recall = (6 + 0.5 × 4) / 14 = 8 / 14 = 0.57

   Breakdown: hits AS-1, 5, 6, 7, 8, 13. Partials AS-2, 3, 12, 14. Misses AS-4, 9, 10, 11.
   For comparison, the baseline FLOW.md scored 0.57 strict and 0.68 lenient.

3.
- lines: 62
- findings: 12, made up of:
  - 6 decisions;
  - 3 actionable mechanical fixes: error-line contrast, checkbox focus ring, row hit area;
  - 3 already-broken items.

  The figure is 14 if you count every Mechanical-fixes bullet. Two of them raise an issue but ask for no work: the primary-button contrast is «Already recorded as token debt… nothing new to do here», and the harness violations are «out of scope». Not counted: the 3 prototype changes (they map onto Decisions #1–#4), the 5 rows of «Where the spec will be misread», the persona notes and the manual checks.
- open questions: 2, both with a recommended default.
- decisions with default and acceptance criterion: 6 / 6. Every row of the Decisions table has a non-empty «Recommended default» and a non-empty «Acceptance criterion».
- runtime claims without evidence: 2
  - L32: «Reduced motion was checked: under `prefers-reduced-motion` the bar's animation is `none`.» It asserts an observation but cites no trace step, screenshot, axe rule or code location.
  - L36, persona at 375 with 18 gaps and 3 places: «works. The bar sticks at the bottom and the room line stays readable.» The (#5) reference covers only the ✕ sentence. Matrix cells (15) and (16) cover the 3-place and 18-gap states but say nothing about the bar position. The manual checks (L56) even leave «the sticky bar does not cover «Vue.js»» unconfirmed.

  Considered but not counted:
  - L32 «No dark theme ships (no color-mode provider)»: a fact about the codebase, not about rendered behavior.
  - L23 primary-button contrast 4.1:1: it cites the tech-debt record.
  - L50 «up to 18 checkboxes plus two buttons»: backed by the matrix «long» cell (16) and the Decision #1 walk.
  - L51 accessible name of `GroupHeading`: it names the component, which counts as a citation under the identifier convention.
  - L2 verdict: a summary of Decisions #1–#3, each of which is evidenced.

4. Findings not in the ground truth that look like real, user-observable problems:
- Decision #1: entering and leaving the mode also drop focus to `<body>`, and the first Tab skips all 13 checkboxes to «Aggiungi». GT AS-6 covers only the confirm step.
- Decision #4: with 0 places, the gap list is replaced. The heading «Non sul tuo profilo 13» sits above zero rows (`modo-selezione.tsx:59`), so a full-profile user loses the comparison.
- Decision #3: the success line has no `role="status"`, so it is not announced. When an add fills the last places, the confirmation is replaced by the full-profile line (`20`).
- Mechanical: the error line `p.text-destructive.text-xs` is at 3.59:1 (axe `color-contrast`), below 4.5:1.
- Mechanical: the checkbox focus ring is about 1.7:1 against its background, below the 3:1 WCAG 1.4.11 requires. This is distinct from AS-2's placement defect.

5. Provisional validity (for the maintainer to confirm; it judges only whether each item is a real, user-observable problem on this surface)

| Item | Validity | Reason |
|---|---|---|
| Decision #1: focus on mode enter, exit and confirm | valid | The 1280 walk shows `<body>` after all three actions and the Tab order skipping the 13 checkboxes. Keyboard and screen-reader users lose their place. |
| Decision #2: saving state, failure, over-cap copy | valid | Screenshots 06, 09 and 11 show no progress, a «Riprova» with nothing to retry, and contradictory counts. This matches GT AS-7, AS-8 and AS-13. |
| Decision #3: confirmation and next step after success | valid | 07 and 08 show the action gone until reload, and the `<p>` has no role. This matches GT AS-5, and the missing announcement is a real additional gap. |
| Decision #4: full profile hides the comparison | valid | 19 shows a heading counting 13 above zero rows, which is visibly inconsistent and removes the card's purpose for users at the cap. |
| Decision #5: close while in the mode, and two identical ✕ | doubtful | Keeping the selection after a close or reopen is arguably intended (it preserves work), and the GT drops the related close/reopen item. The duplicate ✕ glyph with different effects is only a minor ambiguity. |
| Decision #6: entry copy and one noun | valid | «30 competenze» and «skill aggiunte» sit in the same component, and the entry drops the «che hai davvero» prompt (the concern behind GT AS-12). It is low severity, and the review's own Decision #4 default still says «competenze». |
| Already broken: `route.tsx:89` `isSuccess` guard | valid | This is recorded tech debt (EN-S4), verified in jsdom, and every add triggers the re-read. A failed `/me` re-read wipes the verdicts and the mode. It only happens on that failure. |
| Already broken: raw first-search spelling written to the profile | valid | The dedupe keeps the first chip's label (`search-match.ts:144-148`), and REQUIREMENTS §3.5 documents unnormalised strings, so «react.js» lands on the public profile. It depends on the data. |
| Already broken: `SkillsCta` goes to bare `/profile` | valid | `?edit=competence` exists but is unused, so users must find the editor themselves. The friction is minor, and the mode may supersede this CTA. |

Validity counts: 8 valid, 1 doubtful, 0 invalid. Decisions: 5 valid and 1 doubtful. Already broken: 3 valid.

Notes for the maintainer:
- The review contradicts itself. Decision #6 requires «skill» everywhere, including the full-profile line, but the Decision #4 default keeps «Il tuo profilo ha già 30 competenze» and «Fai spazio nelle competenze».
- AS-3 was nearly a hit. The reviewer's own check states the separated name, but Prototype change 1 quotes the snapshot name «Docker 58%» without flagging the run-together accessible name.
