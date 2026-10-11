# New-review score — suggested-skills

Document: `review-ss.md` (UX review of the prototype at http://localhost:3102/prototypes/competenze-suggerite, winner «Bozza» + «Pulsanti»). Ground truth: `gt-ss.md` (SS-1…SS-14, N = 14).
Conventions (same as the baseline scorer): a bundled defect is a hit when most of its sub-failures are covered, otherwise a partial. A defect named exactly but explicitly dismissed is a partial. Findings = decisions + mechanical fixes + already-broken items. A runtime claim is unsupported only when it cites no observation (trace step, screenshot, axe rule, matrix cell) and no code location. A claim that cross-references an evidenced item (#N) also counts as cited. Quotes are exact.

1.

| GT ID | verdict | quote + section |
|---|---|---|
| SS-1 | partial | «present (38 → 4–6 chips + «+34/+32», 2 rows at 320/375/1280)» — State matrix, Card · skills preview / long. [This cell checks the same element and property: the preview's row count with «+N» at narrow widths. But it reports 2 rows and no wrap, and states no requirement. Borderline partial vs. miss.] |
| SS-2 | hit | «After any close, `document.activeElement` is the opener.» — Decisions #1 (also Prototype changes 1, «focus returns to the opener») |
| SS-3 | partial | «What happens to an unsaved draft on Escape, overlay or ×.» — Decisions #6. [It covers accept/reject decisions only, and the acceptance criterion is accept/reject. Nothing covers text typed in the input but not confirmed being dropped by Esc, an outside click or Salva. Decision #5 keeps over-80 text in the input, but only on Enter.] |
| SS-4 | partial | «missing (PATCH succeeds but a confirm fails; create-spec owns the sequence)» — State matrix, Save / partial. [It names the partial-save state as missing and defers it. Nothing covers the uncertain (timeout) outcome, and there is no close question: Decision #6 says «No confirm step».] |
| SS-5 | partial | «Keep the draft for the life of the page and restore it on reopen» — Decisions #6. [The same discard area, but there is no back or route-change guard, and nothing covers navigation mid-save.] |
| SS-6 | partial | «an inline `role="alert"` under Save uses the existing `mapProfileSkillWriteError` kinds» — Decisions #3. [The same save-error notice, but nothing covers raw English errors, «86400 secondi», or «Riprova più tardi» next to an immediate Riprova.] |
| SS-7 | miss | — [The only nearby text is incidental evidence in Decisions #2, «Focus moves straight to «Aggiungi html»», offered for another point. Nothing covers pointer clicks in Safari or macOS Firefox, or focus after a chip ✕.] |
| SS-8 | miss | — [Persona's «On touch, + and × are 24×24 and 2 px apart» is a different failure (target size). Nothing covers autofocus into the input, or the virtual keyboard covering the suggestions and Salva.] |
| SS-9 | miss | — |
| SS-10 | partial | «The dialog close button is named «Dismiss», in English» — Mechanical fixes. [It covers 1 of 2 sub-failures. The English name is covered, with the fix `aria-label="Chiudi"`. Being reached last in the Tab order is not.] |
| SS-11 | hit | «does not contain the visible «+N»» — Mechanical fixes (fix: «+N competenze, apri l'elenco») |
| SS-12 | miss | — [The color-contrast fixes list «Rivedi», the red over-cap text, the `fresh` chip and the subtitle. The counter (amber at 30/30, `chips.tsx:213`) is not among them. It appears only as «not live» in Decisions #2. Borderline miss vs. partial.] |
| SS-13 | hit | «How draft changes are announced (accept, reject, restore, manual add, over the cap, duplicate)» + «After each action the region's text changes to that sentence» — Decisions #2. The permanence cue: «Dopo il salvataggio non te le riproporremo» — Open questions 3 (also the misread table, «permanent after it»). Both sub-failures are covered. |
| SS-14 | hit | «A rejection-only save never says «Competenze aggiornate»» — Decisions #3 (observed in `card-38-after-reject-save-375.png`) |

2. strict recall = 4 / 14 = 0.29; lenient recall = (4 + 0.5 × 6) / 14 = 7 / 14 = 0.50

3.
- lines: 71 (`wc -l` gives 70 because the last line has no trailing newline)
- findings: 19 (6 decisions + 7 mechanical-fix bullets + 6 already-broken items). Not counted: the 3 prototype changes (they implement Decisions #1, #2 and #4), the state-matrix «missing» cells, the persona/hand-off bullets (including «the new pencil must keep» `data-edit-trigger`), the 5 misread-table rows and the 4 manual checks. The red over-cap contrast bullet bundles 4 elements but counts as 1.
- open questions: 3, all 3 with a recommended default
- decisions with default and acceptance criterion: 6 / 6 (every row has a non-empty «Recommended default» and «Acceptance criterion»)
- runtime claims without evidence: 4. All four are in «Persona situations», and none cites an observation, a code location or a #N:
  - «The card still invites «8 skill compatibili»» (`?s=38` card). Borderline: `MAX_VISIBLE_SUGGESTED` in the misread table could back the 8.
  - «every accept moves Save further out of reach («Rimuovine 9»). Only rejections can be saved.»
  - «On touch, + and × are 24×24 and 2 px apart»
  - «both are reversible until Save». Borderline: the Decisions #2 walk shows the restore button appearing.

  Strict 4, lenient 2. Excluded as cited: the verdict line (#1), every decision row (walk steps, screenshots, `file:line`), the mechanical fixes (axe rule + `file:line`), the state-matrix cells (a matrix is itself the observation), «Accepting gives no feedback (#2) … top of the document (#1)», and the already-broken items (code-read, two of them flagged «read in the code, not run»). Also excluded, as claims about data or users rather than about rendered UI: «about 6% of profiles, up to 68 skills» and «Those users will remove the skills shown in red».

4. Findings not in the ground truth that look like real, user-observable problems:
- Decisions #4: on a profile over the cap (`?s=38`), the last 8 skills in fixture order are toned `over` (red). Tone is set by index (`toneFor: i >= MAX_SKILLS`), so users are invited to delete arbitrary pre-existing skills.
- Decisions #3 (failure half): `save()` has no try/catch, so on any rejected call Save stays «Salvataggio…» and disabled. The success toast is unconditional. This cannot be reached with the in-memory fake.
- Decisions #5: typed terms over 80 characters become chips, because `normalizeSkillInput` has no length bound and the server limit is 80. A typed duplicate clears the input with no feedback.
- Mechanical fixes: color-contrast failures on «Rivedi» (3.74:1), the red over-cap text and divider (3.76:1), and the `fresh` chip (3.77:1).
- Mechanical fixes: the modal's input is named only by its placeholder. There is no `aria-label` or `aria-labelledby` (`chips.tsx` SkillField input).

## Validity judgements (provisional, for the maintainer to confirm)

Basis: the document's own evidence, cross-checked read-only against the bench checkout at 442aeea4 (`ux-bench-ss/src`).

| Item | Validity | Reason |
|---|---|---|
| Decision #1: focus lands on `<body>` on close | valid | The walk observes `BODY`, and the code agrees. Kobalte's `onCloseAutoFocus` focuses `triggerRef()` (PLLNVYER.jsx:144-148), and the openers are plain buttons, not `Dialog.Trigger`. This matches SS-2. |
| Decision #2: draft changes are not announced | valid | The prototype has no `aria-live`/`role=status` (grep), and the counter and over-cap warning are silent. «No feedback that anything changed» is overstated for button accepts, where focus moves on to the next suggestion's button. |
| Decision #3: save failure and success copy | valid | Code: no try/catch and an unconditional «Competenze aggiornate» toast (`skills-section.tsx:153-163`). The rejection-only toast was observed, and it matches SS-14. The failure half cannot be reached on the fake, but it is real for the shipped flow. |
| Decision #4: «oltre il limite» tone on an over-cap profile | valid | Code sets `over` by index (`i >= MAX_SKILLS`) and the screenshot shows the last 8 in red. Real order is unsorted, so arbitrary pre-existing skills are marked as the excess. |
| Decision #5: limits on manual input | valid | `normalizeSkillInput` has no length bound, while the real limit is `MAX_SKILL_TERM_LENGTH = 80`. `draft-editor.add` drops duplicates, and `commit()` clears the input with no message. |
| Decision #6: unsaved draft lost on Escape, overlay or × | valid | `ModalBody` sits under `<Show when={focus()}>` and unmounts on close, with no guard, so all decisions are lost. Whether to persist the draft or ask a question is a design choice, but the loss is real. |
| Already broken: `tag-input.tsx:55-71` silent drop at 30 or over 80 characters | valid | `addTags` filters by `maxTagLength` and slices to `available`, then always calls `setInputValue("")`. No message. |
| Already broken: `tag-input.tsx:92-100` unnamed remove buttons | valid | An icon-only `Button` with `<IoClose />` and no `aria-label`. |
| Already broken: `tag-input.tsx:191-196` onboarding suggestions are `<div onClick>` | valid | `Badge` renders a `<div>` (`ui/badge.tsx:59-79`), with no tabindex or key handler, so a keyboard cannot reach it. |
| Already broken: `CompetenceModal.tsx` opens over the cap with Save disabled and no message | valid | Save is disabled when `safeParse` fails, and `skillTermsSchema` has max 30. The validator runs `onChange` only, so the modal opens with no reason shown. «Stranded» is overstated: the first removal triggers validation and shows the error. |
| Already broken: `GeneralInfoModalContext.tsx:65` focus restored only for URL-opened modals | valid | `if (!openedFromUrl) return;`, and the card's edit buttons are plain `Button`s calling `openModal`, so the same Kobalte path leaves focus on `<body>`. This was read in code, not run in the real app. |
| Already broken: `GeneralInfoCard.tsx:117-126,280-289` unnamed edit buttons | valid | Icon-only `Button`s (`BiSolidEdit`) with no `aria-label`. axe flagged `button-name` on the shell that mirrors them. |

Validity counts: 12 valid, 0 doubtful, 0 invalid. That is 6/6 decisions and 6/6 already-broken items. Caveats on overstated wording: Decision #2 («no feedback» on button accepts) and broken item 4 («stranded»).
