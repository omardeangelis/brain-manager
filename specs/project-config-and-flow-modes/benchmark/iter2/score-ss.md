# Review-2 score — suggested-skills

Document: `review2-ss.md`, the second-format UX review of `/prototypes/competenze-suggerite` (winner «Bozza» + «Pulsanti»). Ground truth: `gt-ss.md`, defects SS-1 to SS-14, so N = 14.

This score uses the same conventions as `score-baseline-ss.md` and `score-new-ss.md`:
- **Bundled defects:** a hit only when most sub-failures are covered. Fewer than that gives a partial.
- **Dismissed defects:** a defect named exactly but explicitly dismissed is a partial.
- **Findings:** decisions plus the items under «Task accessibility fixes» (this format's name for the mechanical-fix list) plus already-broken items.
- **Unsupported runtime claims:** a claim counts only when it cites no observation (trace step, screenshot, snapshot, outcome row or matrix cell, measured value) and no code location. A cross-reference to a cited row or decision counts as cited.

Every ground-truth defect is scored, including the layout and visual ones. Quotes are exact.

## 1. Ground-truth table

| GT ID | verdict | quote + section |
|---|---|---|
| SS-1 | miss | — [The review has no width sweep and never mentions the card's «+N» chip or how many rows the compact preview takes. The only card rows are «Card callout» and «PATCH ok … card updated with new chips first» (Outcomes and states).] |
| SS-2 | hit | «Return focus to the control that opened the modal.» (Task accessibility fixes, bullet 1). The same bullet reports «Focus after closing (Escape, ×) and after saving lands on `<body>`» with a trace, and names a fallback if the opener is gone. |
| SS-3 | hit | «Pending text counts as a change and is committed on blur and on Save.» (Decisions, #4, default). The problem cell says «Text without Enter is lost on Save». #2 adds «Keep the draft in the section until a successful save or leaving the page.» [Salva is covered directly, with an acceptance criterion and a reproducing trace. Because pending text counts as a change and #2 keeps the draft through Escape and outside clicks, the Esc and outside sub-failures are also covered. Same reasoning as the earlier review-ss score.] |
| SS-4 | hit (borderline) | «Save has no failure, partial or uncertain outcome.» (Decisions, #1). The default specifies both states: «After `PATCH` succeeds: a confirm or reject failure (404, 500) is not an error to the person.» and «reread `/me`. If the draft is there, it is a success.» #2 adds «Reopening from any trigger restores it, with no confirm dialog.», and #3 adds «While saving, Escape, × and outside do nothing». [This is the same partial and uncertain state, and the review defines both, which the earlier review-ss did not. It does not specify a close question. Instead its design removes the question: closing keeps the draft, and closing is blocked until the outcome is shown. A spec written from this would not produce a wrong close question. On a stricter reading that requires the close-question element itself, this is a partial.] |
| SS-5 | partial | «Keep the draft in the section until a successful save or leaving the page.» (Decisions, #2, default). The acceptance criterion adds «A reload discards the draft.» [Leaving the page is named, and losing the draft on leaving is explicitly accepted. There is no back-button or route-change guard. #3 guards mid-save dismissal only for Escape, × and outside. Named and dismissed, so partial.] |
| SS-6 | partial | «a line under Save shows the `mapProfileSkillWriteError` kind with the existing `errors.profile_skills.*` copy» (Decisions, #1, default). The Outcomes and states table adds «message with no «riprova» for 400 and quota». [This is the same save-error surface. Using the kind's copy rather than the backend message steers away from raw English, and «no «riprova» for … quota» touches the seconds text. But the review endorses the existing copy (`translations.json` ~4871-4877), which includes «Riprova tra circa {{seconds}} secondi» and, for generic and rate-limited errors, «Riprova più tardi», while Save stays the immediate retry for 5xx and network errors. No sub-failure is required away explicitly.] |
| SS-7 | miss | — [Focus is discussed only after close and during save. Nothing covers focus after a chip ✕ or suggestion button is clicked with a pointer, and nothing mentions Safari or macOS Firefox button focus. «VoiceOver + Safari» in Manual checks is about screen-reader output.] |
| SS-8 | miss | — [There is no mention of touch devices, autofocus into the input or the virtual keyboard. The only narrow-width item is «trace at 375», about the cap.] |
| SS-9 | miss | — [Nothing covers the centered modal jumping on height change or Salva sitting under the iOS toolbar.] |
| SS-10 | miss | — [The ✕'s English name appears only as a trace label: «Same with click-outside (3 additions lost) and Dismiss.» (Decisions, #2, Evidence). It is not flagged, and its Tab order is not mentioned.] |
| SS-11 | miss | — [The card «+N» accessible name is not mentioned.] |
| SS-12 | miss | — [There is no contrast check and no mention of the «30/30» amber counter.] |
| SS-13 | hit (borderline) | «Accept, reject, restore, remove and the cap warning are silent.» and «Make the summary line plus the cap warning (`skills-section.tsx:188-201, 220`) a polite status» (Task accessibility fixes, bullet 3). #5 adds the sub-line «Quelle che scarti non te le riproporremo; puoi sempre aggiungerle a mano.» [Both halves are covered. The live region sits on the summary, so a typed accept, which also changes the summary, is announced. The permanent-rejection cue is a required copy change. The typed path is not named, which is the same borderline call as the earlier review-ss score.] |
| SS-14 | hit | «Rejects-only save → «4 suggerimenti scartati».» (Decisions, #5, acceptance criterion). The problem cell says ««Competenze aggiornate» appears when only suggestions were rejected and the count stayed 20/30», with `after-rejects-only.png`. |

## 2. Recall

strict recall = 5 / 14 = 0.36; lenient recall = (5 + 0.5 × 2) / 14 = 6 / 14 = 0.43

There are 5 hits (SS-2, SS-3, SS-4, SS-13, SS-14), 2 partials (SS-5, SS-6) and 7 misses (SS-1, SS-7, SS-8, SS-9, SS-10, SS-11, SS-12).

For comparison, the baseline FLOW.md scored 0.21 strict and 0.54 lenient, and the first-format review (`review-ss.md`) scored 0.36 strict and 0.68 lenient. Review 2 matches the first review on strict recall. It loses on lenient recall because every layout, visual-contrast and pointer/touch-focus defect is a clean miss. The first review had partials or hits there from its width sweep, axe run and close-button check.

Borderline calls and how they move the numbers:
- **SS-4 as partial:** 0.29 strict, 0.39 lenient.
- **SS-4 and SS-13 both as partial:** 0.21 strict, 0.36 lenient.

## 3. Counts

- **lines:** 69
- **findings:** 11, made of:
  - 6 decisions (#1–#6)
  - 3 «Task accessibility fixes»: focus return after close and save, focus kept on Salva while saving, and the polite status for summary and cap warning
  - 2 already-broken items: TagInput silent drop, and CompetenceModal on profiles over 30

  Not counted: 11 outcome rows, 3 «Leaving and interrupting» rows, the persona notes and hand-offs, 4 «misread» phrases, 4 manual checks and 1 open question.
- **open questions:** 1, with a recommended default («**Default: yes.**»). The 6 decision rows are also framed as «Decision needed», each with a recommended default. Counting them too gives 7 of 7.
- **decisions with default and acceptance criterion:** 6 / 6. Every row has a non-empty «Recommended default» and a non-empty «Acceptance criterion».
- **runtime claims without evidence:** 2.
  1. Task accessibility fixes, bullet 1: «the callout disappears after the last suggestion». No trace, screenshot or code line is cited. The code supports it (`skills-section.tsx:302`, `<Show when={profile.suggestions().length > 0}>`).
  2. Persona «Freelance, over the cap (38 skills)»: «Arrives from «8 oltre il limite di 30. Modifica»». The code location in the same sentence (`add-skills.tsx:711`) covers only the dashboard entry, and `38-card.png` exists in `shots2-ss/` but is not referenced. This one is borderline. The code supports it (`skills-section.tsx:287-301`).

  Excluded as borderline:
  - Manual checks: «(today expect only «Aggiungi html»)». This is a hedged expectation inside a list of checks still to run, not a stated observation.

  Excluded as cited:
  - every Decisions problem cell, each backed by its Evidence column
  - Fix 2 (trace)
  - Fix 3 (snapshot selector `section[aria-live=polite]` plus code lines)
  - all outcome and leaving rows
  - persona claims that point to a cited row, decision or fix: «blocks even the rejections already made», «the summary grows», «focus drops to body after every close and save (fixes above)»
  - the hand-off and already-broken items (code lines)

## 4. Findings not in the ground truth that look real and user-observable

- **#3:** Escape mid-save closes the modal while the save keeps running. A reopened modal shows pre-save state (16/30 against the card's 18/30), and the first save's `onSaved` then closes it and drops what was being typed (`reopen-typing.png`, `reopen-closed-by-save.png`).
- **#2:** Escape, × or an outside click discards every accept, reject and typed chip with no question, and reopening shows «Nessuna modifica» (`16-decided.png` → `16-after-escape.png`). The ground truth covers only unconfirmed typed text (SS-3) and route change (SS-5).
- **#6:** on profiles already over 30, 8 specific existing skills are painted red below the «Oltre il limite di 30» line. Which 8 depends on `/me` order, which is unordered.
- **#4:** a duplicate («Git») silently clears the field, and terms over 80 characters are accepted by the prototype although production enforces 80.
- **Fix 2:** while saving, focus drops to `<body>` when the focused Salva becomes `disabled` (trace: Enter on Salva → `BODY`).

## 5. Validity judgement, provisional, for the maintainer to confirm

Judged only on whether each item is a real, user-observable problem on this surface. Code was checked read-only in `ux-bench-ss/` at 442aeea4.

### Decisions

| # | judgement | reason |
|---|---|---|
| 1 | valid | `save()` (`skills-section.tsx:153-163`) has no try/catch, ignores the `ConfirmResult` and always toasts. A thrown PATCH would leave «Salvataggio…» stuck. No failure is reachable in the fake backend, but the gap is real for the shipped surface, and GT SS-4 and SS-6 confirm it surfaced later. |
| 2 | valid | `ModalBody` lives inside `<Show when={focus()}>` (`:348`), so any close unmounts it and discards accepted, rejected and draft. Reopening re-snapshots from the profile, and no confirm runs on a dirty close, which the earlier FLOW (OQ3) required. |
| 3 | valid | `onOpenChange` is unguarded (`:326-329`). The orphaned `save()` still calls `onSaved` → `setFocus(null)` (`:256`), which closes whichever modal is open. `ModalBody` snapshots `initial` and the suggestions with `untrack` (`:72-73`), so a mid-save reopen shows stale state. |
| 4 | valid | `dirty()` ignores the input value (`:128-129`), and `SkillField` commits only on Enter (`chips.tsx:309-314`). `draft-editor.ts:19-23` drops duplicates silently while `commit` clears the field (`chips.tsx:259-263`). `normalizeSkillInput` (`fake-profile.ts:85-89`) has no 80-character bound, against `MAX_SKILL_TERM_LENGTH = 80`. The duplicate behavior mirrors today's TagInput but is still silent loss. |
| 5 | valid | The toast at `:162` is unconditional, and a rejects-only save is reachable through `onlyRejects` (`:131-132`) plus the `sameSet` PATCH skip. The verb trio is confirmed: aria-label «Rifiuta», title «Non mi interessa» (`chips.tsx:192-193`) and «Non ti interessano:» (`suggestions-box.tsx:105`). The box sub-line (`suggestions-box.tsx:71-74`) never says a rejection is final. Copy-level, low severity. |
| 6 | valid | `toneFor` paints index ≥ 30 as «over» (`:184-186`), and the line is placed by index (`chips.tsx:281-287`), so a 38-skill profile shows 8 existing skills in red. `skill-addition.md:128` confirms `/me` reads them without ordering, so the set is arbitrary. The prototype's header calls this intended, and «people may delete the skills they care about» is a predicted consequence, not an observed one. |

### Already broken

| item | judgement | reason |
|---|---|---|
| TagInput silent drop | valid | `tag-input.tsx:59-71` filters duplicates and terms over `maxTagLength`, slices at the cap, then clears the input with no message. It is used at onboarding `Skills.tsx:182` and `auth/onboarding/.../ProfessionalModal.tsx:179`, as stated. |
| CompetenceModal over 30 | valid | `isSubmittable` is `competenceFormSchema.safeParse(...)` over `skillTermsSchema.max(30)` (`CompetenceModal.tsx:36-38`, `:135-136`), which disables Save from the first render (`:145-150`). The validator is `onChange` only (`:109`), so `FieldInfo` gives no reason until a change. Derived from code, not run, as the review states. |

Totals: 8 valid, 0 doubtful, 0 invalid (decisions: 6 valid; already broken: 2 valid).
