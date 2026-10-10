# New-review score — suggested-skills

Document: `review-ss.md`, the UX review of `/prototypes/competenze-suggerite` (winner «Bozza» + «Pulsanti»). Ground truth: `gt-ss.md`, defects SS-1 to SS-14, so N = 14.

This score uses the same conventions as `score-baseline-ss.md`:
- **Bundled defects:** a hit only when most sub-failures are covered. One of two sub-failures covered gives a partial.
- **Dismissed defects:** a defect named exactly but explicitly dismissed is a partial.
- **Findings:** decisions plus mechanical fixes plus already-broken items.
- **Unsupported runtime claims:** a claim counts only when it cites no observation (trace step, screenshot, axe rule, matrix cell or measured value) and no code location.

Quotes are exact.

## 1. Ground-truth table

| GT ID | verdict | quote + section |
|---|---|---|
| SS-1 | partial | «the preview always holds 2 rows with no horizontal scroll (using the fixture names)» (State matrix, «Width sweep»). Decision #4's acceptance criterion also has «The card preview shows at least 1 chip». [The review measured the right property at the right width: the 270 px card at ≥1024. It reports a pass using fixture names. Nothing says «+N» wraps to a 3rd row at 270–343 px with real names. This is the same area with the failure not found. Borderline partial vs. miss.] |
| SS-2 | hit | «skills-section.tsx:326-343 should return it to the control that opened the dialog» (Mechanical fixes, «Focus return»). The review also reports «focus lands on `<body>` (seen 3 times)». |
| SS-3 | hit | «Text left in the field is committed on Salva and on blur, as `TagInput` does today, and counted in the summary» (Decisions, #3). (b) adds «With a dirty draft the backdrop is inert, and Escape or × ask». [This covers all three sub-failures. Salva is covered directly. Typed text counted in the summary makes the draft dirty, which guards Esc and outside clicks. The evidence reproduces the defect.] |
| SS-4 | partial | «On any failure the dialog stays open, keeps the unsaved decisions marked» (Decisions, #1). [This is the same partial-save state. The only close question in the review is the generic «Scarti 2 aggiunte e 2 rifiutate?» from #3. Nothing says what the close question must say after a partial save, such as what is already saved. The uncertain or timeout outcome is not defined. #2 mentions only «15 s write ceiling».] |
| SS-5 | partial | «Escape, backdrop and × are inert while saving» (Decisions, #2). #3 adds a guard for the backdrop, Escape and ×. [Dismissal mid-save and with a dirty draft is covered for in-dialog gestures only. There is no back-button or route-change guard.] |
| SS-6 | partial | «reuse the `mapProfileSkillWriteError` kinds, not the modal's sentences» (Decisions, #1). [This is the same save-error surface, and it steers away from today's sentences. Their generic and validation branches show the raw backend `error.message`, and the quota branch interpolates the seconds. But it does not name raw English text, «86400 secondi» or «Riprova più tardi» next to an immediate Riprova. No sub-failure is required explicitly.] |
| SS-7 | partial | «Pressing Enter 8 times decides them all and focus moves to Salva» (Persona situations). #5 adds «The keyboard flow stays as it is». [Focus after a decision is tracked on the keyboard path only. Nothing covers pointer clicks in Safari or macOS Firefox, where buttons do not take focus. Borderline partial vs. miss, same call as the baseline.] |
| SS-8 | partial | «does the input's autofocus open the keyboard over Salva?» (Manual checks still needed). [The exact failure is named, but as an open, untested question: «none of this was tested on a real touch device». There is no requirement, and the "after last ✕" trigger is absent.] |
| SS-9 | partial | «rejecting one suggestion moves the dialog's top from 123 to 100 px and Salva from 617 to 639 px at 1280×800» (Mechanical fixes, «Dialog re-centers»). [The jump on height change is covered with a measurement. It was measured on desktop, but the centered-dialog mechanism is the same. «Salva under the iOS toolbar» is not covered. #6 shows «Rimuovine 1 per salvare» below the 390×844 viewport but fixes only the counter. One of two sub-failures, so partial. Borderline hit.] |
| SS-10 | partial | «its accessible name is «Dismiss», in English (Kobalte default)» (Mechanical fixes, «Dialog close button»). [The English name is covered exactly, with the fix «Chiudi». The ✕ being reached last in Tab order is not mentioned. One of two sub-failures, so partial. Borderline hit.] |
| SS-11 | partial | «it is named «Mostra altre N competenze» but opens the edit dialog (chips.tsx:113)» (Mechanical fixes, ««+N» label»). [Same element and code line, different failure: the name is wrong for the action. The proposed «Modifica competenze (altre N)» still does not contain the visible «+28», so label-in-name still fails.] |
| SS-12 | hit | ««30/30» in amber-600, 3.2:1 (chips.tsx:213)» (Mechanical fixes, «axe color-contrast (serious, 12 px text)»). |
| SS-13 | hit | «Make the summary line (skills-section.tsx:220) `role="status"` so accept, reject, restore, remove and the over-limit warning (:188-201) are announced» (Mechanical fixes, «No live region in the dialog»). Open questions #2 adds the default «add «Dopo il salvataggio non te le riproporremo» under «Non ti interessano»». [Both halves are covered. The live region sits on the summary, not on the buttons, so it announces any accept, including a typed one. The permanent-rejection cue is the default for OQ2. Borderline: the typed path is not named. Scoring it partial gives 0.29 / 0.64.] |
| SS-14 | hit | «A rejects-only save never says «Competenze aggiornate»» (Decisions, #1, acceptance criterion). The default adds «a rejects-only save says «Suggerimenti nascosti: 2»». |

## 2. Recall

strict recall = 5 / 14 = 0.36; lenient recall = (5 + 0.5 × 9) / 14 = 9.5 / 14 = 0.68

There are 5 hits (SS-2, SS-3, SS-12, SS-13, SS-14), 9 partials and 0 misses. The baseline was 0.21 strict and 0.54 lenient.

Borderline calls and how they move the numbers:
- **SS-13 as partial:** 0.29 strict, 0.64 lenient.
- **SS-9 and SS-10 as hits:** 0.50 strict, 0.75 lenient.

## 3. Counts

- **lines:** 70
- **findings:** 21, made of:
  - 6 decisions (#1–#6)
  - 10 mechanical fixes: Focus return, No live region, Unlabeled field, Dialog close button, «+N» label, Counter, Reject button, axe color-contrast, Dialog re-centers, Reduced motion
  - 5 already-broken items: TagInput silent drop, CompetenceModal >30, Unnamed buttons, Dangling label, Focus return in production

  Not counted:
  - the 3 «Prototype changes», which restate decisions #2–#4
  - state-matrix cells
  - persona notes
  - 5 «misread» phrases
  - 2 manual checks
  - 3 open questions

  «Focus return» appears twice on purpose: once for the prototype and once for production.
- **open questions:** 3, all 3 with a recommended **Default**. The 6 decision rows are also framed as «Decision needed», each with a recommended default. Counting them too gives 9 of 9.
- **decisions with default and acceptance criterion:** 6 / 6. Every row has a non-empty «Recommended default» and a non-empty «Acceptance criterion».
- **runtime claims without evidence:** 4.
  1. Persona «16 skills, keyboard»: «Entering from «Rivedi», focus lands on the first «Aggiungi»». No screenshot or trace is cited. `focus-rivedi.png` exists in `shots-ss/` but is not referenced.
  2. Persona «Historic 38 skills»: «Saving rejections alone works.»
  3. Persona «Historic 38 skills»: «Removing one skill turns the summary into «1 tolta · 1 rifiutata» and Salva into «Rimuovine 7 per salvare»». This matches the logic at skills-section.tsx:131-133, but the document cites neither code nor a shot.
  4. Manual checks: «The polite region exists.»

  Excluded as borderline:
  - «The 8 under the line are arbitrary: `/me` returns skills in no order» is a backend-order claim, not observed rendered behavior.
  - «At 29/30, accepting both pushes one over the limit» (OQ3) is arithmetic from the cap.

  Excluded as cited: everything in the Decisions evidence column, all mechanical fixes (code line, axe rule or measured value), the state matrix and width sweep, persona #2 (refers to #6), and all already-broken items (code lines).

## 4. Findings not in the ground truth that look real and user-observable

- **#2:** Escape mid-save closes the dialog while the save keeps running. The first save's `onSaved` (`setFocus(null)`) later closes a dialog the user reopened, which drops the newly accepted «html». The trace has timestamps, plus `reopen-2nd-closed.png`.
- **#4:** terms over 80 characters are accepted in the prototype (`normalizeSkillInput` has no bound). A 102-char chip overflows at 375: dialog scrollWidth 730 vs. 373.
- **#5:** the suggestion list reflows under the pointer, so a double-click on «Aggiungi react» accepts react and html.
- **Already broken, CompetenceModal on profiles over 30:** Save is disabled from the first render by Zod `max(30)`, and no reason is shown until a field changes.
- **Already broken, unnamed buttons:** TagInput's remove buttons and GeneralInfoCard's edit buttons are icon-only with no accessible name (axe `button-name`).

## 5. Validity judgement, provisional, for the maintainer to confirm

Judged on whether each item is a real, user-observable problem on this surface. Code was checked read-only in `ux-bench-ss/` at 442aeea4.

### Decisions

| # | judgement | reason |
|---|---|---|
| 1 | valid | `save()` (skills-section.tsx:153-163) discards `ConfirmResult` and has no try/catch, so «Competenze aggiornate» always fires. That includes rejects-only saves, which is reachable today, and a thrown PATCH would leave «Salvataggio…» stuck. The failure states are unspecified for a real network, 409 or 429. |
| 2 | valid | `onOpenChange` closes the dialog regardless of `saving()`, and the orphaned `save()` still calls `onSaved` → `setFocus(null)`. That closes whichever dialog is open, matching the traced loss of «html». |
| 3 | valid | `dirty()` ignores the input value (skills-section.tsx:128-129), and `SkillField` has no blur commit (chips.tsx:299-315). Production TagInput does commit on blur, so this is a regression. Backdrop dismiss has no guard. Same defect as GT SS-3. |
| 4 | valid | `normalizeSkillInput` has no length bound (fake-profile.ts:85-89), while production enforces `MAX_SKILL_TERM_LENGTH=80`. Measured overflow at 375. It is an edge case, and P1 is arguably high. |
| 5 | valid | Deciding a chip removes it and the next one slides under the cursor, so an accidental double-click decides a second suggestion (measured). Impact is low and recoverable before Salva via ✕ or ↺. |
| 6 | doubtful | The counter does scroll out of view (measured), but `29-390-over.png` still shows four over-limit cues: the red meter edge, the «Oltre il limite di 30» line, «Rimuovi 1 competenza per fare entrare html» and the box note «Sei a 31/30…». The × being out of view is normal for a scrolled dialog. The claimed loss of orientation is weak. |

### Already broken

| item | judgement | reason |
|---|---|---|
| TagInput silent drop | valid | tag-input.tsx:59-71 filters out terms over 80 characters and slices at the cap, then clears the input. There is no message. |
| CompetenceModal >30 | valid | `isSubmittable` comes from `skillTermsSchema.max(30)` (CompetenceModal.tsx:135-150), so Save is disabled on open. `FieldInfo` shows only field-meta errors, which appear on change. Historic >30 profiles see a dead Save with no reason. |
| Unnamed buttons | valid | The icon-only `Button`s at tag-input.tsx:92-100 and GeneralInfoCard.tsx:280-290 have no `aria-label`. |
| Dangling label | valid | `FieldContainerLabel for="skills"`, and no element has `id="skills"`. TagInput's `<Input>` has no id, so the field is named only by its placeholder. Low impact. |
| Focus return (production) | valid | Kobalte's modal `onCloseAutoFocus` focuses `context.triggerRef()`, which is undefined because no `Dialog.Trigger` is mounted. `closeModal` (GeneralInfoModalContext.tsx:62-66) restores focus only for URL-opened modals. Derived from code, not run, as the review itself states. |

Totals: 10 valid, 1 doubtful, 0 invalid (decisions: 5 valid, 1 doubtful; already broken: 5 valid).
