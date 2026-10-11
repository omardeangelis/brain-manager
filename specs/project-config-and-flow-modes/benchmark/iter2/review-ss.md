## Moment: prototype review — http://localhost:3102/prototypes/competenze-suggerite (winner «Bozza» + «Pulsanti»)
## Verdict: proceed with decisions — the direction holds. What it gets wrong is failure outcomes and leaving mid-way: four times the draft is lost or the person never learns how a save ended. Decisions #2 and #3 are each about one line on the prototype; fix them there if it stays the spec's living reference.

`brain/chore/ux-review.md` is absent, so there are no suppressed findings. Personas come from `brain/personas.md`. Screenshots are in `scratchpad/shots2-ss/`.

## Decisions
| # | P | Decision needed | Recommended default | Acceptance criterion | Evidence |
|---|---|---|---|---|---|
| 1 | P0 | Save has no failure, partial or uncertain outcome. Every failed `PATCH` would leave «Salvataggio…» showing and every control locked, with no way out except closing, which loses the draft. Happens on each real error × the whole draft. | **On `PATCH` failure:** no confirm or reject is sent. The modal stays open with the draft intact, and a line under Save shows the `mapProfileSkillWriteError` kind with the existing `errors.profile_skills.*` copy (it speaks to someone who edited, which fits here). Save stays as the retry for `version_conflict`/`claim_conflict`/network/5xx. **No answer within the 15 s cap** (`SKILL_WRITE_DEADLINE_MS` precedent): reread `/me`. If the draft is there, it is a success. If not, show «Non siamo sicuri che il salvataggio sia andato: abbiamo ricaricato le tue competenze, controlla e salva di nuovo». **After `PATCH` succeeds:** a confirm or reject failure (404, 500) is not an error to the person. | Force a `PATCH` 503: modal still open, draft and summary unchanged, message shown, Save enabled. Force a timeout then a reread that has the skills: success toast. Reject 500 after `PATCH` 200: success toast, and the skill is not reported as failed. | `skills-section.tsx:153-163`: no `catch`, so `setSaving(false)` never runs on a throw. `:158-159` drops the `ConfirmResult`. `:162` always shows the toast. Error kinds: `api/utils/profile-skill-write-error.ts:3-9`. Every outcome row below marked "not reachable". |
| 2 | P1 | Escape, ×, or a click outside discards every unsaved accept, reject and typed skill without asking. Reopening shows «Nessuna modifica» and the same suggestions. | Keep the draft in the section until a successful save or leaving the page. Reopening from any trigger restores it, with no confirm dialog. This is the precedent of dashboard flow step 12 / DL17 in `add-missing-skills-from-comparison.md`. | Accept react, reject html, type kubernetes + Enter, press Escape, reopen via Rivedi: react and kubernetes are chips, html is under the rejected list, summary reads «2 aggiunte · 1 rifiutata». A reload discards the draft. | Traces: «1 aggiunta · 1 rifiutata» → Escape → reopen → «Nessuna modifica», «Aggiungi react»/«Aggiungi html» back (`16-decided.png` → `16-after-escape.png`). Same with click-outside (3 additions lost) and Dismiss. |
| 3 | P1 | During the save the modal can be closed and reopened. The reopened modal shows the state from before the save. When the first save finishes, it closes the reopened modal and drops what the person was typing. | While saving, Escape, × and outside do nothing (dashboard flow step 8). The modal closes itself on success, and the 15 s cap from #1 bounds the wait. | Click Salva then Escape at once: the modal stays on «Salvataggio…», then closes with the toast. The trigger cannot reopen it mid-save. | One command: Salva → Escape → Modifica competenze → type «kubernetes». The modal shows 16/30 and react/docker still suggested while the card shows 18/30 (`reopen-typing.png`). 2.5 s later: `dialog:false`, input gone, focus on BODY (`reopen-closed-by-save.png`). Unguarded `onOpenChange` at `skills-section.tsx:326-329`. |
| 4 | P1 | Typed input is dropped with no word. Text without Enter is lost on Save; a duplicate («Git») just clears the field; a term over 80 characters is not stopped (today's field drops it). | Pending text counts as a change and is committed on blur and on Save. A duplicate keeps the text and shows «git è già fra le tue competenze». Over 80: keep the text, «Massimo 80 caratteri». | Type kubernetes with no Enter: Save is enabled and the summary says «1 aggiunta». Press Salva: kubernetes is saved. Type Git + Enter: the text stays and the line shows. | Trace: «kubernetes» typed, react accepted, Salva → reopen shows 17 skills, no kubernetes. Typed text alone gives «Nessuna modifica», Save disabled. «Git»+Enter → `v:"" chips:16`. Code: `chips.tsx:309-314` (Enter only, no blur), `skills-section.tsx:128`, `draft-editor.ts:19-23`, `fake-profile.ts:85-89` (no 80 limit) vs `libs/skill-input.ts:4`. |
| 5 | P2 | Copy is untrue or inconsistent. «Competenze aggiornate» appears when only suggestions were rejected and the count stayed 20/30. One verb has three names, and nothing says a rejection is final. | Toast by outcome: «{n} competenze aggiunte al profilo», «{n} suggerimenti scartati», or both joined with « · ». One verb everywhere: «Scarta {name}» / list «Scartate:». Add to the box sub-line: «Quelle che scarti non te le riproporremo; puoi sempre aggiungerle a mano.» | Rejects-only save → «4 suggerimenti scartati». The × button's name and the list label use the same verb. | `after-rejects-only.png`: 20/30 with «Competenze aggiornate». `chips.tsx:192-193` («Rifiuta» / «Non mi interessa»), `suggestions-box.tsx:105` («Non ti interessano»). BE §4: the reject is final and the cron never re-proposes. |
| 6 | P2 | On profiles already over 30 (24 profiles, ~6%), the «Oltre il limite di 30» line paints 8 specific existing skills red. Which 8 depends on server order, which `/me` does not guarantee, so people may delete the skills they care about. | Existing skills get no line and no red. The warning gives the count only: «Hai 38 competenze, il limite è 30: togline 8 per salvare le modifiche». The line separates only new additions beyond 30. | ?s=38: no red chips among existing skills, warning gives the count. Accept html: html sits under the line. | `38-modal.png` (apollo client…monorepo in red). `skill-addition.md` «L'ordine…`/me` le legge senza ordinamento». `chips.tsx:281-287` places the line by index. |

## Task accessibility fixes
- Focus after closing (Escape, ×) and after saving lands on `<body>`; the next Tab goes to the top of the page. Return focus to the control that opened the modal. If that control is gone (the callout disappears after the last suggestion), use «Modifica competenze». Trace: Enter on «Modifica competenze» → Escape → `BODY` → Tab → «16 skill».
- During the save, focus drops to `<body>` when the focused Salva disables. Keep focus on Salva (`aria-disabled` while saving). Trace: Enter on Salva → `BODY`.
- Accept, reject, restore, remove and the cap warning are silent. The only live region is the toaster `section[aria-live=polite]`. Make the summary line plus the cap warning (`skills-section.tsx:188-201, 220`) a polite status: «react aggiunta · 17/30», «Rimuovi 1 competenza per fare entrare html».

## Outcomes and states
| Action or region | Outcome or state | In the prototype | What the person sees → can do next | Evidence |
|---|---|---|---|---|
| Salva | `PATCH` ok (+ confirms/rejects) | present | Toast, card updated with new chips first; next batch «4 skill compatibili» → review again | `after-save-8.png` |
| Salva | rejects only, no `PATCH` | present | Same toast, untrue → #5 | `after-rejects-only.png` |
| Salva | 400 / 429 rate / 429 quota | not reachable | Draft kept, message with no «riprova» for 400 and quota → fix the input or come back → #1 | `profile-skill-write-error.ts:25-41` |
| Salva | 409 version / 503 claim / 5xx / network | not reachable | Draft kept, Save = retry → #1 | `:42-47` |
| Salva | no answer (uncertain) | not reachable | Reread `/me`, then success or «non siamo sicuri» → #1 | dashboard precedent, `skill-addition.md` |
| Salva | 401 after a failed refresh | not reachable | Session ends as everywhere else; the draft is lost (accepted precedent) | `add-missing-skills…md` EN-FB15 |
| Confirm/reject after `PATCH` | 404 (already decided, or the cron replaced it) / 500 | not reachable | Not an error; a failed rejection simply comes back later | BE-PR2 §4, §6 |
| Confirm | 409 `DECLARED_SKILLS_LIMIT_REACHED` | not reachable by design | `PATCH` declares the skill first, so the confirm skips the cap | `skills-section.tsx:46-50`, BE §4 |
| Card callout | `/me` loading or failed, field missing before the BE release, `[]` | not reachable | No callout, card as today | BE-PR2 §3, risk 3 |
| Modal | draft over 30 | present | Red line, «Rimuovi 1 competenza per fare entrare html», «Rimuovine 1 per salvare» | `29-over.png` |
| Modal | profile already over 30 | present | Rejects only can be saved; accepting one gives «Rimuovine 9» → #6 | `38-modal.png`, trace at 375 |

## Leaving and interrupting
| Where | What the person does | What happens to the input, the operation and its outcome | Evidence |
|---|---|---|---|
| Modal with a draft | Escape / × / click outside | Every decision and typed chip is lost, with no question → #2 | traces above |
| Save in flight | Escape, then reopen and type | Stale state shown; the old save closes the new modal; typing lost; focus on body → #3 | `reopen-typing.png`, `reopen-closed-by-save.png` |
| Typed text, no Enter | Salva | The text is silently not saved → #4 | trace, 17 skills |

## Persona situations
- **Freelance, over the cap (38 skills).** Arrives from «8 oltre il limite di 30. Modifica» or from the dashboard's `/profile?edit=competence` (`dashboard/components/add-skills.tsx:711`). Accepting one suggestion blocks even the rejections already made («Rimuovine 9 per salvare»). Giving up and closing loses everything (#2). Seeing progress (walkthrough Q4) fails here: the summary grows but nothing can be saved.
- **Keyboard or screen-reader freelancer.** Decisions are silent, and focus drops to body after every close and save (fixes above).
- **Hand-offs.**
  - The dashboard link must open this modal. `GeneralInfoModalContext.tsx:69-95` hands focus back to `[data-edit-trigger]`, so the new trigger must carry that attribute.
  - A freelancer's rejection removes the skill from recruiter search (BE §2). See Q1.

## Already broken around the surface
- `TagInput` (today's competence modal, the onboarding `Skills.tsx:182` and `ProfessionalModal.tsx:179`) silently drops a term at the cap, over 80 characters, or a duplicate, then clears the field (`components/shared/input/tag-input.tsx:55-71`). The winner fixes this only on the profile.
- From the code, not triggered: `CompetenceModal` on a profile over 30 skills disables Save through `isSubmittable` (`CompetenceModal.tsx:135-149`) with no reason shown. The validator runs only on change (`:109`), so the person meets a dead button.

## Where the spec will be misread
| Phrase | How it will be misread | Fix |
|---|---|---|
| «riusabile anche nell'onboarding» | Onboarding reuses ×, ↺ and the rejected list | Onboarding chips are `string[]` with no id and no reject endpoint (BE §5, R6): «+» only |
| «la 31ª entra sotto la linea» | The line is drawn by index over server order | The line goes only before new additions beyond 30 (#6) |
| «Le decisioni sono bozza: niente parte finché non si salva» | Closing = cancel, by design | The draft survives closing (#2) |
| R7 events `confirm_suggested_skill` / `reject_suggested_skill` | Fired when + or × is clicked | Fire per item only after the save sent it and got 200 |

## Manual checks still needed
- VoiceOver + Safari, and NVDA + Firefox. Tab to «8 skill compatibili Rivedi», press Enter. Expect «Competenze, dialog» followed by «Aggiungi react». Note whether the region «Skill compatibili con il tuo profilo» is announced.
- Press Enter on «Aggiungi react». Note whether anything says react was added (today expect only «Aggiungi html»).
- With ?s=29, accept two. Note whether the cap warning is read.
- Press Salva. Note whether «Competenze aggiornate» is read from the toaster, and where the reading cursor lands.

## Open questions
1. Do pending suggestions already count in recruiter search? BE §2 says «La ricerca ignora le rifiutate», and §11 mentions a «ramo delle suggerite» in search. **Default: yes.** The × copy then says «Scarta: non conterà più nelle ricerche».
