# New-review score — add-skills step («Modo selezione»)

Document: `scratchpad/review-as.md` (UX review of the add-skills prototype, winner «Modo selezione», round 1 of 2), scored as a whole. Ground truth: `gt-as.md` (AS-1…AS-14, N = 14).
Conventions, the same ones the baseline scorer used:
- Bundled GT defects count as a hit when the document covers most of the sub-failures, otherwise as a partial.
- A defect that the document names exactly but explicitly dismisses counts as a partial.
- Findings = decisions + mechanical fixes + already-broken items.
- A runtime claim counts as unsupported only when it cites no observation (trace step, screenshot, axe rule, matrix cell or measured value) and no code location.

Quotes are exact.

1.

| GT ID | verdict | quote + section |
|---|---|---|
| AS-1 | hit | «Clicks at (663,286), (990,286) and (800,272) do not toggle, yet the whole row highlights on hover … Make the whole row the label.» — Mechanical fixes, «Hit area smaller than the hover area». [The label measures 694–988 × 276–296, so it is about 20 px tall inside the row. Manual check 2 adds the coarse-pointer case.] |
| AS-2 | miss | — [Line `checkbox-row.tsx:45` is cited, but only for `scroll-mb-20` (the sticky bar hides focus), which is a different defect. The only ring finding is about «Esci dalla selezione». Nothing says that the checkbox ring surrounds only the 16 px box.] |
| AS-3 | hit | «Checkbox names read «Docker 58%» with nothing saying what the percentage is … Add the hidden text «delle ricerche».» — Mechanical fixes. [The fix is the one the GT names. The review reports a space where the GT says the name runs together, but the requirement still prevents the defect.] |
| AS-4 | miss | — [Nothing on the `<title>Selezionata</title>` in the tick SVG.] |
| AS-5 | hit | ««Aggiungi competenze al profilo» stays while any skill is missing and there is room» — Decisions, D1, recommended default. The evidence column adds «the confirmation *replaces* the button and `confirmed()` never resets». |
| AS-6 | hit | «After Aggiungi, focus stays on the bar, then moves to the status line» — Decisions, D2, recommended default. The evidence column adds «× gives BODY, and so does Aggiungi». |
| AS-7 | hit | «The mode stays open while saving: the bar shows «Aggiungo…» and rows are blocked» — Decisions, D3. The evidence adds «Aggiungi returns at once to the reading view … the entry button is live for the whole save». [3 of 4 sub-failures are covered: no visible saving state, immediate exit, live open button. Not covered: re-entry swallowing the success.] |
| AS-8 | hit | ««Da ripetere» keeps the ticks with the error under the bar, and Aggiungi retries» — Decisions, D3. The evidence adds «reading view plus «Riprova», with no retry control in reach». [3 of 4 sub-failures are covered: hidden selection, no retry in view, and lost focus (D2 «After Aggiungi, focus stays on the bar»). Not covered: a stale error after reopening.] |
| AS-9 | partial | «Every way of closing the card (Esc, scrim, ✕, and the shipped close on width change, S1) discards the selection» — Decisions, D5. [It names the forced close on width change, but only for the selection. Nothing covers a close during the save or where the outcome or toast surfaces.] |
| AS-10 | miss | — [The room line comes up only in the over-cap case (D3) and as a manual live-region check. Nothing says it shows when there is plenty of room.] |
| AS-11 | miss | — [The confirm button appears only for contrast, focus and aria-disabled-with-no-reason. Nothing asks the button to say what it adds or how many, or questions the separate «N selezionate» counter.] |
| AS-12 | partial | «Keep today's copy «Aggiungi le skill che hai davvero» on the button that opens the mode» — Decisions, D6. [It covers the same missing honesty cue but on a different element. It asks for the cue on the entry button, not for the lead line inside the mode.] |
| AS-13 | hit | ««Tetto cambiato» changes the room line to «Hai scelto 3 skill, c'è posto per 1: togline 2.»» — Decisions, D3. The acceptance criterion adds «In the over-cap case the room line and the error do not contradict each other». [It covers both the contradiction and the guidance to untick.] |
| AS-14 | partial | «Does the real save add all the skills or none, or can it partly succeed («2 su 3»)? The bench has no partial outcome.» — Open questions, 1. The state matrix's Save/offline cell adds «not reachable: the fake save reports success». [It notices that the outcome set is incomplete. It never names rate-limit, quota, rejected, timeout or already-present, and gives no requirement to design them.] |

2. strict recall = 7 / 14 = 0.50; lenient recall = (7 + 0.5 × 3) / 14 = 8.5 / 14 = 0.61

   Overall: 7 hits (AS-1, 3, 5, 6, 7, 8, 13), 3 partials (AS-9, 12, 14) and 4 misses (AS-2, 4, 10, 11). For comparison, the baseline scored strict 0.57 and lenient 0.68.

3.
- lines: 71
- findings: 17 = 6 decisions (D1–D6) + 10 mechanical-fix bullets + 1 already-broken item. If you split the bullet «Contrast 4.1:1 on «Fai spazio…» and «Vedi tutte…»» into two elements, the total is 18. The prototype changes (1–3) restate D1, D3 and D4 and are not counted again. Also not counted: the 5 rows of «Where the spec will be misread», the 3 manual checks, and the state-matrix cells.
- open questions: 3, all 3 with a recommended default (all or none; no extra per-save limit; treat D4 as P1).
- decisions with default and acceptance criterion: 6 / 6. Each of D1–D6 has a non-empty «Recommended default» cell and a non-empty «Acceptance criterion» cell.
- runtime claims without evidence: 0. Every behavioural statement cites at least one of these:
  - a trace step,
  - a screenshot (`NN-*.png`),
  - an axe run or rule,
  - measured coordinates or ratios,
  - a matrix cell,
  - a `file:line` reference.

  One borderline case is not counted: «Otherwise it behaves like desktop» (Persona situations, «Freelance at 390»). The sentence itself cites nothing, but its bullet cites `27-390-mode.png`, and the 390 runs appear in mechanical fix 1. The SkillsCta claim («users land on the profile and have to find the pencil») is code-cited and explicitly says it was not run, so it is not counted either.

4. Findings that are not in the ground truth but look like real, user-observable problems:
- **D4.** At 0 free places, the whole ✗ reading list disappears: `<Show when={!capped()} fallback={<NoRoom/>}>` at `modo-selezione.tsx:59` also wraps `ReadingView`. The heading still says «Non sul tuo profilo 4» above 0 rows. I confirmed this in the code.
- **D2, beyond AS-6.** Focus also drops to BODY when the mode is entered and on ×, because the focused button unmounts in the `Show` swap. The next Tab then skips every checkbox.
- **Sticky bar covers the focused row (WCAG 2.4.11).** The sticky confirm bar hides the focused checkbox row. `scroll-mb-20` is 80 px against an 89 px bar, measured at 390 and at 1280 with 18 missing.
- **D1, panel case.** On the panel, adding the last missing skill drops the success confirmation entirely, because `GapGroup`'s «Il tuo profilo le ha tutte.» fallback replaces the children (`shell.tsx:217-226`). I confirmed this in the code.
- **Contrast failures on design-system tokens.** The primary «Aggiungi» measures 4.1:1, the outline entry button 4.29:1 and the error text 3.59:1. These are axe-measured and affect every use of the tokens.
- Not listed above: D5 (stale ticks after closing and reopening the card). It is real, but the GT deliberately dropped it as «close/reopen losing mode already in prototype comment».

## Validity judgement (provisional, for the maintainer to confirm)

I checked each item read-only against `scratchpad/ux-bench-as` at 24aacc0d. The question for each is only whether it is a real, user-observable problem on this surface.

| Item | Judgement | Reason |
|---|---|---|
| D1: what stays after a successful save | valid | `confirmed()` (`modo-selezione.tsx:42-43`) swaps the entry button for the confirmation and never resets, so the remaining gaps cannot be added (GT AS-5). On the panel, the «le ha tutte» fallback (`shell.tsx:217-226`) also hides the confirmation. |
| D2: focus on opening and closing the mode | valid | The entry button, «Aggiungi» and × all live in `Show` branches that swap on `mode()` (`:86-156`), so focus falls to `<body>` on enter, on × and on submit. GT AS-6 confirms the submit case. |
| D3: the save and failure states | valid | `setMode(false)` at `:132` leaves the mode on submit, and «Aggiungo…» renders only inside the mode. On «retry» the ticks are hidden behind the reading view. On over-cap, `RoomLine` (left = 0) says «Hai riempito…» while the error says «ora puoi aggiungerne 1». GT AS-7, AS-8 and AS-13 confirm this. |
| D4: the list disappears at 0 free places | valid | The `NoRoom` fallback at `:59` replaces the read-only ✗ list too, not just the checkboxes. The heading keeps the count above an empty list. This contradicts the file's own «a riposo la colonna è il confronto». It is not in the GT. |
| D5: ticks after closing the card mid-selection | valid | The `mode` signal is local (`:30`) and the selection lives in `createCardState` (`shell.tsx:73`), so the ticks silently reappear after reopening. It is real but minor and already known: the prototype comment at `:23-27` flags it, and the GT dropped it for that reason. |
| D6: the honesty cue on the action | valid | The prototype's entry button drops today's «Aggiungi le skill che hai davvero» (`translations.json:1236`), and `LeadLine` is defined but never rendered, so no honesty cue appears anywhere in the flow (GT AS-12). Where the cue goes, button or lead line, is a design choice. |
| Already broken: `SkillsCta` goes to a bare `/profile` | doubtful | The extra step is real: the CTA is skills-only, `?edit=competence` is whitelisted, and `edit-param.ts` exists to avoid «go find a pencil». But bare `/profile` is a deliberate, documented choice (the comment was added on 09-18, after the whitelist existed on 09-13). It is shipped code outside the prototype, and the reviewer did not run it. |

Validity counts: 6 valid, 1 doubtful, 0 invalid. The decisions are 6 valid out of 6; the already-broken item is 1 doubtful.
