## Moment: prototype review — http://localhost:3102/prototypes/competenze-suggerite (winner «Bozza» + «Pulsanti»)
## Verdict: iterate — three small behavior fixes on the fake first, so the spec copies the right reference. The save-failure states stay a P0 decision for the spec.

## Prototype changes
1. Decision #2: while «Salvataggio…» runs, ignore Escape and backdrop clicks and hide the × (`hideCloseButton`, dialog.tsx:25). **Check:** accept 1, press Salva, then press Escape right away. The dialog stays open until the toast, and the screenshot during saving shows no ×.
2. Decision #3: commit text left in the field on Salva and on blur, and make the backdrop inert while the draft is dirty. **Check:** type «svelte» without Enter. The summary reads «1 aggiunta», Salva is enabled, and the card shows 17/30 including svelte. With 2 decisions made, click the backdrop: the dialog stays.
3. Decision #4: refuse terms over 80 characters at Enter with an inline line, and let chips wrap. **Check:** at 375, enter the 102-char term. No chip is added, a line appears under the field, and the dialog's `scrollWidth == clientWidth`.

## Decisions
| # | P | Decision needed | Recommended default | Acceptance criterion | Evidence |
|---|---|---|---|---|---|
| 1 | P0 | What the user sees when the save fails or only partly succeeds (PATCH ok, then a confirm returns 409/404/network/429/401) | Show the success toast only after every write has resolved. Word it by what changed: «Competenze aggiornate: 3 aggiunte»; a rejects-only save says «Suggerimenti nascosti: 2». On any failure the dialog stays open, keeps the unsaved decisions marked, and shows one inline line by Salva (reuse the `mapProfileSkillWriteError` kinds, not the modal's sentences). A 404 removes the chip silently (BE-PR2 §4). Fire `confirm_suggested_skill` / `reject_suggested_skill` (BE R7) only after a confirmed write; failures go to `fail_profile_skill_update` | Force a 500 on the first confirm: no success toast, the dialog stays open, the unconfirmed skills are flagged. A rejects-only save never says «Competenze aggiornate» | skills-section.tsx:155-162: confirm/reject results are thrown away and `toast.success("Competenze aggiornate")` always runs. State matrix: Salva error and partial are `missing` |
| 2 | P1 | Can the dialog be dismissed during «Salvataggio…»? | No: Escape, backdrop and × are inert while saving. The skill-addition concept's existing 15 s write ceiling keeps this from trapping the user | Press Escape during saving: the dialog stays until the outcome. No second dialog can open on stale data | Scripted trace, 16 skills: accept react → Salva → Escape → the dialog closed at t=878 ms while still saving. Reopening «Rivedi» at t=1231 showed 16/30 with react offered again, while the card read 17/30. I accepted html («1 aggiunta»). At t=2785 the first save's `onSaved` (skills-section.tsx:256 `setFocus(null)`) closed that second dialog: card 17/30, html gone, toast «Competenze aggiornate» (`reopen-2nd-closed.png`) |
| 3 | P1 | What happens to unconfirmed input and decisions on exit | (a) Text left in the field is committed on Salva and on blur, as `TagInput` does today, and counted in the summary. (b) With a dirty draft the backdrop is inert, and Escape or × ask inline «Scarti 2 aggiunte e 2 rifiutate?» with [Scarta] [Continua a modificare] | «svelte» typed without Enter is saved. A dirty draft is not lost to one backdrop click | With «svelte» typed: Salva disabled and «Nessuna modifica» (`typed-unconfirmed.png`). With react accepted plus «svelte» typed, Salva saved 17 skills without svelte. Production commits on blur (tag-input.tsx:121-128). From «2 aggiunte · 2 rifiutate», one click on the backdrop at (1200,700) closed the dialog, and reopening showed «Nessuna modifica» |
| 4 | P1 | Entry rules: long and duplicate terms | Refuse >80 chars at Enter with «Massimo 80 caratteri: accorcia «…»» (an explicit refusal, never a truncation; skill-addition concept, EC-FB34). For a duplicate, say «git c'è già» and point to the existing chip. Chips wrap inside the field and the card (max-width 100%) | At 375 the 102-char term is refused. Dialog and page `scrollWidth == clientWidth`. The card preview shows at least 1 chip | At 375, two 102-char terms were accepted and Salva was enabled. Each chip was 664 px; dialog scrollWidth 730 vs 373 (`long-375-dialog.png`). After saving, the card showed only «+18» and the document scrollWidth was 685 (`long-375-card.png`). Cause: no length bound in fake-profile.ts:85-89, against `MAX_SKILL_TERM_LENGTH=80` |
| 5 | P2 | The suggestion list reflows under the pointer | A decided chip keeps its slot (same width, inert, «aggiunta»/«rifiutata») until the pointer leaves the box. The keyboard flow stays as it is | Two clicks at the same point within 500 ms decide only one suggestion | Two mouse clicks at (400,511) on «Aggiungi react» gave «2 aggiunte»: react and html (`double-accept-coords.png`). The + and × buttons are 24×24 with 2 px between them |
| 6 | P2 | On phones, opening from «Rivedi» scrolls the counter and the × out of view | Make the «Le tue competenze n/30» row and its bar sticky at the top of the dialog's scroll area | At 390×844 and 29 skills, after accepting 2, «31/30» is visible | Dialog top 42, scrollTop 115, counter at y 26–42 (above the visible area). «Rimuovine 1 per salvare» at y 843–879, below the viewport (`29-390-over.png`) |

## Mechanical fixes
- **Focus return:** after Escape, a backdrop click or Salva, focus lands on `<body>` (seen 3 times). skills-section.tsx:326-343 should return it to the control that opened the dialog («Rivedi», «Modifica competenze», «+N», or the «oltre il limite» link), as GeneralInfoModalContext does with `data-edit-trigger`.
- **No live region in the dialog:** 0 `aria-live` or `role=status` nodes. Make the summary line (skills-section.tsx:220) `role="status"` so accept, reject, restore, remove and the over-limit warning (:188-201) are announced.
- **Unlabeled field:** the input is named only by its placeholder (chips.tsx:299-315). Add the label «Aggiungi una competenza».
- **Dialog close button:** its accessible name is «Dismiss», in English (Kobalte default), and it is 16×16, below 24×24 (dialog.tsx:55). Use aria-label «Chiudi» and a 24 px target.
- **«+N» label:** it is named «Mostra altre N competenze» but opens the edit dialog (chips.tsx:113). Rename it «Modifica competenze (altre N)».
- **Counter:** «16/30» has no context for screen readers (chips.tsx:206-219). Add visually hidden text «competenze su».
- **Reject button:** the title «Non mi interessa» and the name «Rifiuta X» disagree (chips.tsx:192-193). Use one wording.
- **axe color-contrast (serious, 12 px text):** text-destructive #ef4444 on white, 3.76:1: the over-limit counter, «Oltre il limite» (chips.tsx:282), the warning (skills-section.tsx:189), the card link (:291); over-limit chip 3.29:1 (chips.tsx:130); fresh chip #1e77eb on #e9f1fd, 3.77:1 (chips.tsx:28,129); «30/30» in amber-600, 3.2:1 (chips.tsx:213); «Rivedi» 3.74:1 (skills-section.tsx:316); box description 4.46:1 (suggestions-box.tsx:71), dropping to 2.26:1 while saving (opacity-60, :61).
- **Dialog re-centers (values → `design-engineer`):** rejecting one suggestion moves the dialog's top from 123 to 100 px and Salva from 617 to 639 px at 1280×800.
- **Reduced motion (→ `design-engineer`):** the dialog's zoom (`enter`, 0.2 s) still plays under reduced motion (dialog.tsx:48).

## State matrix
| Region | empty | loading | error | partial | long | no permission | offline |
|---|---|---|---|---|---|---|---|
| Card «Competenze» | not reachable (production has a `noExpertises` fallback, GeneralInfoCard.tsx:291-297) | not reachable | not reachable | present («4 skill compatibili») | missing (#4) | not reachable | not reachable |
| Suggestions box | present (hides; focus moves to Salva) | not reachable | not reachable | present (refills to 8) | present (8 chips wrap, 320–1280) | not reachable | not reachable |
| Skill field | not reachable | — | missing (#4) | — | missing (#4) | — | — |
| Salva | present (disabled, «Nessuna modifica») | present, but dismissable (#2) | missing (#1) | missing (#1) | present («Rimuovine N per salvare») | missing (401, #1) | not reachable |

**Width sweep, 320–1280 in 24 steps:** the preview always holds 2 rows with no horizontal scroll (using the fixture names). The 1023→1024 breakpoint moves it from full width to a 270 px card («+13» becomes «+33»).

## Persona situations
- **Freelance, 16 skills, keyboard, desktop.** Entering from «Rivedi», focus lands on the first «Aggiungi». Pressing Enter 8 times decides them all and focus moves to Salva. Two steps fail: Q4 (progress): after saving, the card still says «8 skill compatibili» because the pool refills; focus lands on `<body>` (`16-after-save.png`).
- **Freelance at 29, phone.** The second accept puts html under the line, and the task changes from "which suggestions" to "which of 30 to drop" (#6, 24 px ×).
- **Historic 38 skills (~6% of profiles, per the skill-addition concept).** Saving rejections alone works. Removing one skill turns the summary into «1 tolta · 1 rifiutata» and Salva into «Rimuovine 7 per salvare», so the rejection can't be saved until all 8 skills are gone. The 8 under the line are arbitrary: `/me` returns skills in no order.
- **Hand-offs to recruiters and small businesses:** accepted skills count at full weight in search (BE-PR2 §2). After Salva a rejection is final, and the skill can come back only by typing it by hand (§4).

## Already broken around the surface
- **TagInput** drops a typed skill silently at the cap and above 80 characters (tag-input.tsx:54-71, :63).
- **CompetenceModal, profiles over 30 skills:** Save is disabled from the first render by Zod `max(30)` (CompetenceModal.tsx:36-38, 135-150), with no reason shown until a field changes.
- **Unnamed buttons:** TagInput's remove buttons have no name (tag-input.tsx:92-100). Neither do the 6 edit buttons in GeneralInfoCard (:280-290 and the other `data-edit-trigger` buttons); axe `button-name` (critical) flags them in the shell mirror.
- **Dangling label:** `for="skills"` (CompetenceModal.tsx:113) points at no element, because TagInput's input has no id.
- **Focus return:** GeneralInfoModalContext.tsx:62-66 restores focus only for modals opened from the URL. Kobalte focuses `triggerRef()` on close and no `Dialog.Trigger` is mounted. This comes from the code: the prototype, built the same way, landed on `<body>`; I did not run production.

## Where the spec will be misread
| Phrase | How it will be misread | Fix |
|---|---|---|
| «si scrive una volta sola» | as one request | It is PATCH, then one confirm per accept, then one reject per rejection, in sequence (skills-section.tsx:153-160). Write "one action, one outcome" |
| «le 8 sotto la linea» | as these 8 being dropped | The line marks a position, not a choice: the user removes any 8 |
| «↺ ripristina» | as undoable after saving | Undo works only until Salva; the BE rejection is permanent (§4) |
| «N skill compatibili» | as the total left | It is at most 8 visible (§3) and refills |
| «riusabile nell'onboarding» | as the same data | Onboarding chips come from `GET …/onboarding/suggested-skills` (§5), with no confirm or reject |

## Manual checks still needed
- **VoiceOver (Safari) and NVDA (Firefox):** open the dialog from «Rivedi»: are the name and description read? Accept react: is anything announced (expected after the role=status fix)? Go over the cap at 31/30: is the warning read? After Salva: is the toast read? The polite region exists.
- **Real iPhone (Safari):** tap «Modifica competenze»: does the input's autofocus open the keyboard over Salva? Tap + and × with a thumb. Touch emulation did not take here (`navigator.maxTouchPoints=0`), so none of this was tested on a real touch device.

## Open questions
1. What feeds the box in onboarding? A new profile has no suggestions until the hourly cron runs (§6). **Default:** in onboarding, show the §5 chips with «+» only.
2. Is the permanent rejection a business rule? **Default:** keep it, and add «Dopo il salvataggio non te le riproporremo» under «Non ti interessano».
3. Does search treat «rest api» and «restful api» as one skill? At 29/30, accepting both pushes one over the limit. **Default:** the FE shows both; the BE owns canonicalization.
