## Moment: prototype review — http://localhost:3103/prototypes/add-skills («Modo selezione», `src/prototypes/add-skills/`)
## Verdict: iterate — first make 3 small changes to what the bar does while saving, after a success, and at the cap. Then the spec carries decisions 1, 5 and 6 for the real save.

Context: the repo has no `brain/chore/ux-review.md`, so no findings were suppressed. Personas come from `brain/personas.md`: only Freelance uses this surface, and Recruiter is the hand-off.

## Prototype changes
- **#2 → A.** «Aggiungi» stops closing the mode on click (`modo-selezione.tsx:132`). The mode closes only on a `done/added` outcome, which makes the existing «Aggiungo…» branch (`:140-142`) reachable. On any failure the mode stays open, with the ticks and the message under the bar.
  - Check: tick 2 and click «Aggiungi». The bar reads «Aggiungo…» for about 0.9 s, and «Aggiungi competenze al profilo» never shows in that time.
  - With «Da ripetere», the bar stays on «2 selezionate» with the message under it. With «Successo», the bar gives way to the count line.
- **#3 → B.** The success line sits above the entry button instead of replacing it (`:86-114`).
  - Check: «Successo», 18 posti, add 2. Both «2 skill aggiunte…» and the entry button are visible. Reopening the mode shows 0 ticked and room 16.
- **#4 → C.** `capped()` wraps only the action area, not the list (`:59`).
  - Check: with «0 posti», the 13 rows with ✗ and % stay, and the cap line and link sit where the button was.
  - With «3 posti», add 3: «3 skill aggiunte…» shows, then the cap line.

## Decisions
| # | P | Decision needed | Recommended default | Acceptance criterion | Evidence |
|---|---|---|---|---|---|
| 1 | P0 | The add is a full-list `PATCH /profile`, and the client silently keeps only the first 30 skills. With a stale room count, ticked skills (or existing ones) are dropped while the line still says «N skill aggiunte». Rare (stale `/me`: another tab, LinkedIn sync) × silent loss of profile data under a success message | Build the list from a fresh read of `/me` right before sending. If current + ticked > 30, send nothing: show the "profile changed" state with the real room and keep the ticks. Never remove an existing skill. After the 200, re-read `/me` and count only the ticked skills now on it | Server has 28 skills, dashboard cache says 27, 3 ticked: no PATCH is sent, the bar says «C'è posto per 2: togline 1.», and all 3 stay ticked. No add ever shortens the existing list | code: `profile/api/index.ts:240-251` sends `skills` as one CSV; `libs/skill-input.ts:30,40` `boundSkillsCsv` → `.slice(0, MAX_SKILL_TERMS)`, no error. The prototype's room is a fixture count (`shell.tsx:89-97`) |
| 2 | P1 | The mode closes the instant «Aggiungi» is pressed. The save is invisible, a failure leaves the person outside the mode, and pressing the entry button mid-save hides the outcome. Every save × confidence and the retry path | Change A. Mode and ticks live in the card state (DL17): reopening the card shows the mode as it was left. Only ✕ «Esci dalla selezione» or a success clears them | As change A. Also: Escape with 2 ticked, then «Vedi tutte»: the mode is open, 2 are ticked, and no old message shows | `05-inflight.png`: after the click the bar is gone, the entry button is back, and only ✕ is greyed. Timed run: entry button pressed 150 ms into the save → bar «Aggiungo…»; at +1.3 s «0 selezionate», `role=status` empty, success only after ✕. «Da ripetere»: mode closed, message in status. Escape in mode closed the card; reopening and re-entering showed Storybook and Redux still ticked plus the old message |
| 3 | P1 | After one success, the only way into the mode is gone for good, so there is no second batch. Anyone adding in two goes × the task ends | Change B | After adding 2 (18 posti), the entry button is still there, also after close and reopen | `06-success.png`, `07-reopen-after-success.png`: 11 gaps and 16 places left, no control. `modo-selezione.tsx:86-114`: the line is the button's fallback for as long as `saveState` is done/added |
| 4 | P1 | At 0 places, and right after a save that fills the cap, the missing list disappears and the success is never confirmed. Every profile at 30 × loses the comparison they came for, and their confirmation | Change C. Copy: «3 skill aggiunte. Il profilo è al massimo: 30 skill.» + «Togli skill dal profilo» | As change C | `13-zero-room.png`: «Non sul tuo profilo 13» over no rows. Timed run, «3 posti», add 3: the column becomes «Il tuo profilo ha già 30 competenze, il massimo.» + link, with no count |
| 5 | P1 | The real write returns outcomes the prototype cannot produce: no answer (there is no timeout, and the card is locked), uncertain, quota, rate limit, claim conflict, version conflict, validation. Occasional × trapped in a locked dialog, or told "failed" when it saved | **Timeout:** 10 s cap on the PATCH. On no answer, re-read `/me` with a 5 s cap, as the username save does. **No answer, after the re-read:** one of these three, and the card unlocks: the success line; «Non le abbiamo aggiunte. Riprova con «Aggiungi».»; «Non sappiamo se sono state aggiunte: ricarica la pagina per controllare.» **Answered errors:** `mapProfileSkillWriteError` + `errors.profile_skills.*` copy under the bar, ticks kept. «Aggiungi» stays active for generic, claim conflict and version conflict. For quota and rate limit it is disabled and the wait is stated. **Tracking:** also emit `fail_profile_skill_update {error_kind}` from this surface | PATCH held 20 s → unlocked by 15 s, with the message that matches `/me`. 429 `SKILL_CREATION_QUOTA_EXCEEDED` with `retryAfterSeconds` 120 → «…Riprova tra circa 120 secondi.», «Aggiungi» disabled, ticks kept | Interruption: Escape and ✕ «Chiudi il confronto» pressed 80 ms into the save → the dialog stays and ✕ is `aria-disabled` (`shell.tsx:362-365,404-407`). `profile/api/index.ts:251` has no signal; the recovery pattern is at `:37-52,206-217`. Error kinds: `api/utils/profile-skill-write-error.ts:16-56`. The fixtures know only `added`, `retry`, `over_cap` (`fixtures.ts:87`) |
| 6 | P2 | The copy names the thing two ways, and some lines claim more than is true. Every state × confidence | **Naming:** one word, «skill», as the shipped panel uses (axis «Skill», «Vedi tutte le {n} skill»). **Buttons:** entry «Aggiungi le skill che hai davvero» (shipped `skills_cta`); confirm «Aggiungi {n} skill». **Room line:** «Puoi sceglierne altre {n}.»; at 0, «Le hai scelte tutte: il profilo ne tiene 30.» **Overflow:** «Ne hai scelte {k}, c'è posto per {n}: togline {k−n}.» **Cap:** «Il tuo profilo ha già 30 skill, il massimo.» | No «competenze» anywhere in the flow. With 3 of 3 places ticked, nothing reads as saved. After «Tetto cambiato», the line says how many to untick | Snapshot: «Vedi tutte 19 competenze», «Aggiungi competenze al profilo», «2 skill aggiunte», «30 competenze». `12-375-18gaps-full.png`: «Hai riempito i posti rimasti…» shows before any save. Timed run «Tetto cambiato»: 3 ticked, room 1, «Hai riempito…», «Aggiungi» `aria-disabled`, and clicking it does nothing |

## Task accessibility fixes
- **Entering the mode** puts focus on `<body>`, outside the `aria-modal` card. Tab then lands on «Aggiungi», after the list (keyboard walk). At `modo-selezione.tsx:107-113`, focus the first checkbox instead.
- **«Esci dalla selezione»** (Enter) also puts focus on `<body>`. At `:144-154`, return focus to the entry button.
- **«Aggiungi»** (click or Enter) puts focus on `<body>` (`:129-133`). With change A, focus stays on it with `aria-busy`. On success, move focus to the count line, which already has `tabindex=-1` (`:92-93`). On failure, keep it on «Aggiungi».
- **The success line is not announced.** After a success, the only `role=status` (`:157`) stays empty. Render the count line inside that status.
- **Escape on the full panel** (4 gaps, «Pannello intero») does nothing inside the mode. Make it leave the mode and send focus to the entry button. On the card, Escape keeps closing the card, with the ticks kept per decision 2.
- **«Aggiungi» blocked by overflow** gives no reason. Point its `aria-describedby` at the room line.

## Outcomes and states
| Action or region | Outcome or state | In the prototype | What the person sees → can do next | Evidence |
|---|---|---|---|---|
| Aggiungi | success | present | Count line; then no way to add more (D3) | `06`, `07` |
| Aggiungi | success that fills the cap | present | The cap line replaces both the list and the count (D4) | timed run, 3 posti |
| Aggiungi | answered failure (5xx, generic) | present («Da ripetere») | Today the mode closes and «Non siamo riusciti ad aggiungerle. Riprova.» shows, with no retry control nearby. Should be: mode kept, ticks kept, «Non le abbiamo aggiunte. Riprova con «Aggiungi».» | retry walk |
| Aggiungi | profile changed (409 `PROFILE_VERSION_CONFLICT`, cap moved) | present («Tetto cambiato») | Today: room 1, 3 ticked, no instruction. Should be: «Il profilo è cambiato nel frattempo: c'è posto per 1. Togline 2 e riprova.» | timed run; `profile-skill-write-error.ts:42-44` |
| Aggiungi | no answer, dropped after send, slow | not reachable (fixed 900 ms) | Card locked with no exit (D5) | interruption run; `profile/api/index.ts:251` |
| Aggiungi | quota (429 + `retryAfterSeconds`), rate limit (429), claim conflict (503), validation (400) | not reachable | Existing copy (`translations.json:4848-4856`) under the bar, ticks kept; «Aggiungi» behaves per D5 | `profile-skill-write-error.ts:25-48` |
| Aggiungi | session expired (refresh rejected) | not reachable | Sent to logout with `next` = dashboard; ticks are lost. Acceptable, since nothing was saved | `api/client.ts` `clearSessionAndLeave` |
| Comparison load | loading, failed, profile unknown (`/me` slow or failed) | not reachable | No mode and no entry button: use the shipped CTA predicate (`axis-entries.tsx:213-218`) | concept `filter-type-match`: «unknown non è no» |
| Comparison | 0 places on arrival | present | The list is hidden (D4) | `13-zero-room.png` |
| Comparison | every gap added | present (full panel, 4 gaps) | «Il tuo profilo le ha tutte.» is true, but not announced | timed run |

## Leaving and interrupting
| Where | What the person does | What happens to the input, the operation and its outcome | Evidence |
|---|---|---|---|
| Card, mode open, 2 ticked | Escape | The card closes and the mode is gone, but the ticks are kept out of sight. Reopening shows the reading view; re-entering shows them ticked plus the previous failure message | retry walk (Storybook, Redux) |
| Card, save in flight | Presses the entry button, which is still offered | The mode reopens on «Aggiungo…». At the outcome the ticks vanish, the bar reads «0 selezionate», and the success stays hidden until ✕ | timed run, t+150 and t+1300 |
| Card, save in flight | Escape, or ✕ «Chiudi il confronto» | Nothing happens (DL21, by design). With a real hung PATCH this never ends (D5) | interruption run |
| Card, save in flight | Window resized 1280 → 375 | In the prototype the card stays and «1 skill aggiunta» shows (`11-375-after-save.png`). The shipped card closes on any width change (`axis-panel.tsx:225-234`), so the outcome would be lost | misread row 1 |
| Full panel, mode open | Escape | Nothing; only ✕ exits | timed run |

## Persona situations + dependencies and hand-offs
- **Freelance at 30 skills (0 places).** Today they cannot see which 13 are missing while deciding what to drop. «Fai spazio nelle competenze» opens the competence modal (`/profile?edit=competence`). That modal closes on save and stays on `/profile` (`CompetenceModal.tsx:73`), where the list isn't shown either. Change C keeps the list in view before they leave.
- **Freelance on a phone, 3 places, 18 gaps.** The task completes and the bar is reachable at 375 px (`12-375-18gaps-full.png`). The only difference: «Hai riempito…» appears before saving and reads as already saved (D6).
- **Hand-off, Freelance → Recruiter.** Ticked chips become skills recruiters match on. The shipped CTA said «…che hai davvero»; the prototype drops it, and padding the profile with all 18 is a few taps. D6 keeps the shipped wording.

## Already broken around the surface
- **Raw English error text.** A dropped connection on any skills write shows «Network Error» to the person. The path:
  - `profile-skill-write-error.ts:51` calls `resolveApiErrorMessage`.
  - `error.ts:149` falls back to `error.message`, because axios 1.14 sets `response` only when there is one (`AxiosError.js:49`).
  - `CompetenceModal.tsx:78` shows it in a toast.
  - Fix: map an error with no `response` to `generic` with an empty message, so the i18n copy shows.
- **A failed `/me` re-read blanks the comparison.** Every save re-reads `/me` (`profile/api/index.ts:267`), and the route reads the profile only when `isSuccess` is true (`router/dashboard/route.tsx:89`). If that re-read fails, every verdict in the open comparison blanks (S4 → S5, tech-debt EN-S4), and here the mode and the count line would go with them. Fix as already filed: anchor on `data !== undefined`.

## Where the spec will be misread
| Phrase | How it will be misread | Fix |
|---|---|---|
| «In volo la card non si chiude» (DL21) | As covering every way the card closes | The shipped card also closes on a width change (`axis-panel.tsx:225-234`). Spec: mid-save it still closes without travel, the outcome line shows in the closed panel under «Vedi tutte», and focus goes there |
| «Le aggiunte passano in Sul tuo profilo oggi» | Exactly the ticked rows move | The engine's three-arm match (`search-match.ts:73`) can move other rows too. The line counts skills written; the rows follow the re-read of `/me` |
| «Posti rimasti» | 30 minus the «Sul tuo profilo oggi» count | Use 30 minus `skills.length` from `/me` (every profile skill, not only the asked ones) |
| «Il modo esiste quando ci sono mancanze» | `gap > 0` alone | Use `compares() && key === "skills" && gap > 0`, so an unknown profile is never offered to fill an unmeasured gap |
| «Esito Da ripetere» | The request failed | A missing answer is not a failure (D5) |

## Manual checks still needed
Run with VoiceOver + Safari and with NVDA + Chrome. Settings: 13 gaps, «Card staccata», 3 posti.
1. Activate «Vedi tutte 19 competenze», Tab to «Aggiungi competenze al profilo», press Enter, and note what is read.
2. Tick 3 rows and Tab to the 4th: is «Hai riempito i posti rimasti…» read as its description?
3. With «Successo», press «Aggiungi»: is the count read? With «Da ripetere»: is the status read once?
4. After the fixes, repeat steps 1–3 and confirm focus lands on the first checkbox, on the count line, and on «Aggiungi».

## Open questions
1. Can a recruiter's chip spelling (e.g. «react.js») go onto the public profile as written, or must it map to the skill catalogue? Default: write the label exactly as the row shows it, trimmed.
2. How many new skills does the daily creation quota allow? Default: no extra per-batch cap; show the quota message with its wait, and keep the ticks.
3. Does `PATCH /profile` return `PROFILE_VERSION_CONFLICT` for skill writes? The client sends no version. Default: assume it does not, and rely on decision 1's fresh read before and after the save.
