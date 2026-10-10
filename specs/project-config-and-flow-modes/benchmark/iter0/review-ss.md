## Moment: prototype review — http://localhost:3102/prototypes/competenze-suggerite (winner «Bozza» + «Pulsanti»)
## Verdict: iterate — closing the modal loses focus every time (P0). Two P1 fixes are cheaper to make on the prototype than to describe in the spec, and the harness calls this prototype the spec's living reference.

## Prototype changes
1. **#1 → focus returns to the opener.** Give the `Dialog` an `onCloseAutoFocus` that focuses whichever button opened it: the pencil, `+N`, the over-limit «Modifica» link or «Rivedi». If that button no longer exists (the callout hides after the last suggestion), focus the pencil. **Check:** Tab to «Rivedi», press Enter, then Escape. `snapshot -i` shows «Rivedi» focused, and the 375 screenshot shows its ring. Do the same after Save.
2. **#2 → one polite live region inside the modal.** **Check:** accept `react` and the region reads «react aggiunta · 17/30». In `?s=29`, the second accept gives «Oltre il limite: rimuovine 1 per salvare». Typing `git` gives «git è già fra le tue competenze».
3. **#4 → in `?s=38`, no skill the profile already had gets the `over` tone.** The line and the red tone are kept for skills added in this session. **Check:** the 375 screenshot of `?s=38` shows no red chip, and the message reads «Rimuovi 8 competenze, quelle che vuoi, per rientrare nel limite di 30».

## Decisions
| # | P | Decision needed | Recommended default | Acceptance criterion | Evidence |
|---|---|---|---|---|---|
| 1 | P0 | Where focus lands when the modal closes (Escape, ×, overlay, Save). Happens on every close for keyboard and screen-reader users, who end up at the top of the document | On the button that opened it; if it is gone, on «Modifica competenze». While saving, keep focus on Save by using `aria-disabled` instead of `disabled` | After any close, `document.activeElement` is the opener. During «Salvataggio…» it is not `<body>` | Walk: «Rivedi» → Enter → Escape → active element `BODY` (checked immediately and again at 1000 ms). After Save: `BODY`. During saving: `BODY`, then Tab reaches «Dismiss». Cause: Kobalte focuses `triggerRef()`, which only `Dialog.Trigger` sets (`node_modules/@kobalte/core/dist/chunk/PLLNVYER.jsx:144-148`). The openers are plain buttons (`skills-section.tsx:268-319`, `chips.tsx:109-117`) |
| 2 | P1 | How draft changes are announced (accept, reject, restore, manual add, over the cap, duplicate). Happens on every decision. Without it, screen-reader users get no feedback that anything changed | One `aria-live="polite"` region in the modal with one short sentence per change (see change 2) | After each action the region's text changes to that sentence | After accepting `react` and rejecting `html`, the page's only live region is sonner's `section[aria-live=polite]`, and it is empty. Focus moves straight to «Aggiungi html». The counter and the over-cap warning (`skills-section.tsx:171,188-201`) are not live |
| 3 | P1 | What the user sees when the save fails, and what the success message says. Failures are rare (429, 409, 503 exist per `skill-addition.md`), but the result is a stuck button and a lost draft | On any failure: the modal stays open, the draft is intact, Save is re-enabled, and an inline `role="alert"` under Save uses the existing `mapProfileSkillWriteError` kinds. On success, the toast names what changed: «2 competenze aggiunte». After a rejection-only save: «Non ti riproporremo html» | With a forced failure: the summary still reads «1 aggiunta», the error is visible and Save is enabled. A rejection-only save never says «Competenze aggiornate» | `skills-section.tsx:153-163` has no failure branch: `setSaving(false)` is never reached if a call rejects, and the success toast is unconditional. Observed in `?s=38`: one rejection, Save → toast «Competenze aggiornate» while the counter still reads 38/30 (`card-38-after-reject-save-375.png`) |
| 4 | P1 | Which skills are marked «oltre il limite» on a profile already over the cap (about 6% of profiles, up to 68 skills). Those users will remove the skills shown in red | Only skills added in this session go below the line. The excess the profile already had is a count, shown by the counter and the message, and the user chooses what to remove | `?s=38`: no chip the profile already had shows the `over` tone; the 29→31 case is unchanged | `modal-38-open-375.png`: the last 8 in the fixture order are shown in red. The tone is decided by position only (`skills-section.tsx:184-186`). Real order is arbitrary: «`/me` le legge senza ordinamento» (`brain/domains/freelance/concepts/skill-addition.md`, «L'ordine») |
| 5 | P2 | Limits on manual input. Rare, but the result is a chip the server will reject, or an input that clears with no reason given | More than 80 characters: the text stays in the input and «Massimo 80 caratteri» appears, linked via `aria-describedby`. A duplicate: the input clears and the region says it is already there | Typing 81 characters + Enter adds no chip. Typing `git` + Enter produces the announcement | A 99-character term became a chip at 320 (`modal-30-long-320.png`); the limit is 80 (`src/libs/skill-input.ts:4`) and `fake-profile.ts:85-89` has no bound. Typing `git` + Enter: the input empties, chips stay at 30, and nothing is said (`draft-editor.ts:19-23`) |
| 6 | P2 | What happens to an unsaved draft on Escape, overlay or ×. Rare, but every decision is lost | Keep the draft for the life of the page and restore it on reopen with its summary line. No confirm step | Accept `react`, reject `html`, press Escape, reopen: `react` is in the field and the summary reads «1 aggiunta · 1 rifiutata» | Observed: summary «1 aggiunta · 1 rifiutata» → Escape → reopen gives «Nessuna modifica» and no `react`. `ModalBody` unmounts (`skills-section.tsx:348-357`) |

## Mechanical fixes
axe-core 4.10.2 was injected from the CDN, because the CLI has no `a11y` command and `axe-core` is not in `node_modules`. Bench and shell violations are excluded.
- `color-contrast`, «Rivedi» in the card callout: #1e77eb on #ebf0f5 is 3.74:1 (`skills-section.tsx:316`).
- `color-contrast`, the over-cap text in red (#ef4444 on white is 3.76:1): the divider (`chips.tsx:282`), the warning (`skills-section.tsx:189`) and the card line (`skills-section.tsx:291`). The `over` chip is 3.29:1 (`chips.tsx:130`).
- `color-contrast`, the `fresh` chip: text-primary on primary/10 is 3.77:1 (`chips.tsx:28,129`).
- `color-contrast`, the subtitle of the suggestions box: 4.46:1 (`suggestions-box.tsx:71`).
- The dialog close button is named «Dismiss», in English, with a 16×16 target (`src/components/ui/dialog.tsx:55`). Fix: `aria-label="Chiudi"`.
- The `+N` button's name, «Mostra altre N competenze», does not contain the visible «+N», and the button opens the editor (`chips.tsx:113`). Fix: «+N competenze, apri l'elenco».
- The input is named only by its placeholder (`chips.tsx:299-305`). Fix: `aria-labelledby` pointing to «Le tue competenze» (`skills-section.tsx:170`).

## State matrix
| Region | empty | loading | error | partial | long | no permission | offline |
|---|---|---|---|---|---|---|---|
| Card · skills preview | not reachable (fixtures start at 16) | not reachable | not reachable | — | present (38 → 4–6 chips + «+34/+32», 2 rows at 320/375/1280) | not reachable | not reachable |
| Card · «N skill compatibili» | present (hides after the last suggestion is decided and saved) | not reachable | not reachable | present («4 skill compatibili» after a save) | — | not reachable | not reachable |
| Modal · field | not reachable (0 skills) | — | missing (#5) | — | present (99 characters wrap at 320, no horizontal scroll) | — | — |
| Modal · suggestions box | present | not reachable | not reachable | present (only the snapshot taken at open; refills after Save) | — | not reachable | — |
| Save | — | present («Salvataggio…») | missing (#3) | missing (PATCH succeeds but a confirm fails; create-spec owns the sequence) | — | not reachable | not reachable (the fake lives in memory) |

## Persona situations + dependencies and hand-offs
- **Freelance with a historic over-cap profile (38), arriving from the dashboard's «fare spazio»** (`/profile?edit=competence`, `dashboard/components/add-skills.tsx:711`): the walkthrough fails at Q3. The red chips read as «remove these» (#4). The card still invites «8 skill compatibili», yet every accept moves Save further out of reach («Rimuovine 9»). Only rejections can be saved.
- **Freelance on keyboard or screen reader at 375:** the walkthrough fails at Q4. Accepting gives no feedback (#2) and every close drops them to the top of the document (#1). On touch, + and × are 24×24 and 2 px apart; both are reversible until Save.
- **Onboarding reuse (profile starting at 0):** not reachable in the prototype. The existing onboarding suggestions are `<div>` elements with `onClick` (see below).
- **Hand-off:** `GeneralInfoModalContext.tsx:81-83` sends focus back to `[data-edit-trigger="competence"]` after a URL-opened close. The prototype's pencil has no such attribute (`skills-section.tsx:268-276`); the new pencil must keep it. `PATCH /profile` replaces the whole set, but the modal writes the snapshot taken when it opened: that question belongs to create-spec.

## Already broken around the surface
- `tag-input.tsx:55-71`: at 30 skills, or above 80 characters, the input clears and drops the term without a word.
- `tag-input.tsx:92-100`: the remove buttons have no accessible name.
- `tag-input.tsx:191-196`: onboarding suggestions are `Badge` `<div>`s with `onClick`, so a keyboard cannot reach them (`onboarding/.../Skills.tsx:188`).
- `CompetenceModal.tsx:109,135-149`: a profile with more than 30 skills opens with Save disabled and no message, because validation runs on change only. Those users are stranded (read in the code, not run).
- `GeneralInfoModalContext.tsx:65`: focus is restored only for modals opened from the URL, so modals opened by a button lose focus as in #1 (read in the code; the same Kobalte path).
- `GeneralInfoCard.tsx:117-126,280-289`: the edit buttons have no accessible name (axe `button-name` ×5 on the shell that mirrors them).

## Where the spec will be misread
| Phrase | How it will be misread | Fix |
|---|---|---|
| «il tetto di 30 si previene» | Block the 31st at the input, as TagInput does | «The 31st always enters the draft below the line; only Save is blocked» |
| «otto sotto la linea» (profile over the cap) | These 8 are the excess | «The excess is a count; the user picks» (#4) |
| «un rifiuto si ripristina con ↺» | The undo is always available | «Restorable until Save; permanent after it (no backend endpoint)» |
| «N skill compatibili» | The total pending (the cron keeps up to 30) | «Visible suggestions, ≤ 8 (`MAX_VISIBLE_SUGGESTED`), refilled after each save» |
| «Competenze aggiornate» | One success message for every save | The message depends on the outcome (#3) |

## Manual checks still needed
- VoiceOver on iOS Safari at 375: open «Rivedi», double-tap «Aggiungi react», and write down what is spoken. Then, in `?s=29` after two accepts, swipe to `html` and check that «Oltre il limite di 30» is read before it.
- NVDA + Chrome: open from the pencil. Check that the dialog announces «Competenze, Modifica le tue competenze», and that «Rimuovine 1 per salvare» (disabled) is read in browse mode.
- Real phone: tap + and × on 10 suggestions each and count mis-taps.
- After Save, check that the toast is announced exactly once.

## Open questions
1. Do skills past the 30th count in search and show on the public profile today? **Default:** yes. The card copy then turns from a red alarm into a neutral note: «38 competenze, il limite è 30: togline 8 per aggiungerne».
2. Does `/me` return `suggested_skills` for a profile still in onboarding? **Default:** no. The field works alone, and the box is hidden when empty.
3. Is a rejection permanent forever, or can the cron suggest the skill again later? **Default:** permanent, with this under «Non ti interessano»: «Dopo il salvataggio non te le riproporremo».
