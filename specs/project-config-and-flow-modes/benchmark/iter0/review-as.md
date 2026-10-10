## Moment: prototype review — http://localhost:3103/prototypes/add-skills (winner «Modo selezione»)
## Verdict: iterate — the direction holds. Fix three things on the prototype before the spec: focus is lost every time the mode opens or closes, the save has no visible state between click and outcome, and after one success there is no way to add more.

## Prototype changes
1. → #1. In `modo-selezione.tsx`, move focus explicitly at three points: to the first checkbox when the user enters the mode, back to «Aggiungi competenze al profilo» on the bar's exit, and to the outcome line after «Aggiungi». **Check:** at 1280, press Enter on the entry button, then `snapshot -i`: checkbox «Docker 58%» has focus and the ring is visible in the screenshot. After the bar's ✕, the entry button has focus.
2. → #2. Stop calling `setMode(false)` on click (lines 129–133). Leave the mode only when the outcome is «added». **Check:** click «Aggiungi» and the bar shows «Aggiungo…» for about 900 ms (screenshot). With «Da ripetere», the two boxes stay checked and the error appears under the bar.
3. → #3 and #4. Put the success line in the `role="status"` region and keep the entry button under it. Render `NoRoom` under the reading view, not instead of it (line 59). **Check:** after «Successo», Tab reaches «Aggiungi competenze al profilo». A «0 posti» screenshot shows the 13 names and percentages above «Fai spazio nelle competenze».

## Decisions
| # | P | Decision needed | Recommended default | Acceptance criterion | Evidence |
|---|---|---|---|---|---|
| 1 | P0 | Where focus goes when the mode opens, exits and confirms (affects every keyboard and screen-reader use; the user loses their place inside a dialog) | Entering: first checkbox. Bar exit: the entry button. Confirm: the outcome line | Focus is never on `<body>` after any of the three actions | Walk at 1280 (card and full panel). Enter on «Aggiungi competenze al profilo» puts focus on BODY. The next Tab lands on «Aggiungi» and skips all 13 checkboxes; they are reached only after ✕. «Esci dalla selezione» → BODY. «Aggiungi» → BODY |
| 2 | P1 | What the user sees during the save and after a failure (affects every save; it looks like nothing happened) | Keep the bar mounted until the outcome: «Aggiungo…» with `aria-busy`, boxes locked. On failure, stay in the mode with the selection checked, put the error under the bar, and let «Aggiungi» retry. On over-cap, the room line reads «Ne hai scelte 3, ora c'è posto per 1: togline 2.» | During the save the bar reads «Aggiungo…». With «Da ripetere», the choices are still checked and one press retries. With «Tetto cambiato», the line says how many to remove | `06-1280-saving.png`: reading view plus the entry button, no progress. «Aggiungo…» appears only if the user re-enters the mode mid-save (eval: all 13 boxes blocked, label «Aggiungo…»). `09`: «…Riprova.» with nothing to retry. `11`: 3 checked, «Hai riempito i posti rimasti» next to «ora puoi aggiungerne 1», and «Aggiungi» silently `aria-disabled` |
| 3 | P1 | Confirmation and next step after a successful add (affects every multi-skill user; success is not announced and the flow dead-ends) | Announce «2 skill aggiunte al tuo profilo.» in the `role="status"` region. Keep the entry button while gaps > 0 and places > 0. When the add fills the last places, show the confirmation above the full-profile line. Event `add_freelance_dashboard_skills` with `count` only | After success, a live region holds the confirmation and Tab reaches the entry button. «3 posti» + 3 added still shows the confirmation | `07-1280-success.png`: `snapshot -i` lists only ✕, and the confirmation `<p>` (lines 92–104) has no role. The button is still gone after close and reopen (`08` + snapshot), until reload. `20`: «3 posti» + 3 added gives no confirmation, and the column turns into «Il tuo profilo ha già 30 competenze» |
| 4 | P1 | With a full profile (0 places), keep the comparison visible (freelancers with 30 skills lose what the card is for) | The reading list stays. «Il tuo profilo ha già 30 competenze, il massimo.» and «Fai spazio nelle competenze» (`/profile?edit=competence`, valid per `edit-param.ts:23`) replace only the entry button | With «0 posti», the 13 names and percentages are visible | `19-1280-noroom.png`: heading «Non sul tuo profilo 13» above zero rows. Cause: `modo-selezione.tsx:59` `<Show when={!capped()} fallback={<NoRoom />}>` wraps the list |
| 5 | P2 | Closing the card while in the mode, and two identical ✕ (occasional; leaves hidden state) | Closing (✕, Esc, scrim) also leaves the mode and clears the selection. The bar's exit becomes a text button «Annulla» | Select 2, press Esc, reopen, enter the mode: «0 selezionate». The bar has no second ✕ | Esc with GraphQL and Kubernetes checked closes the card. Reopen + mode: both still checked, «2 selezionate», «Puoi aggiungerne ancora 16» (`05-1280-reopen-mode.png`). `14-375-mode.png`: header ✕ and bar ✕ use the same glyph with different effects |
| 6 | P2 | Entry copy and one noun (every view; recruiters lose signal when people add skills they don't have) | Keep the production copy «Aggiungi le skill che hai davvero» (`translations.json:1236`) and say «skill» everywhere | Button, room line, confirmation and full-profile line all say «skill» | `modo-selezione.tsx:112` «Aggiungi competenze al profilo»; `checkbox-row.tsx:119` «30 competenze» against `:102` «skill aggiunte» |

## Mechanical fixes
- **Error line contrast** (`modo-selezione.tsx:157`, `p.text-destructive.text-xs`): 3.59:1 (#ef4444 on #f8fafc). axe `color-contrast`; it needs 4.5:1.
- **Checkbox focus ring** (`checkbox-row.tsx:45`, same as `ui/checkbox.tsx:27`): computed ring is #9AC2FE on about #F6F6F6, roughly 1.7:1, below the 3:1 required for focus indicators (WCAG 1.4.11). It is the shared `--ring` token, so use a darker ring locally or fix the token.
- **Row hit area** (`checkbox-row.tsx:29-41`, the Kobalte root with `role=group`): the row highlights on hover, but clicks on its padding do nothing. Mouse at (664,254) and (740,240) did not toggle; only the 294×20 label and the 16×16 box do. Make the whole row the label.
- **Primary button text «Aggiungi»** (#f8fafc on #1e77eb): 4.1:1. Already recorded as token debt (`tech-debt/freelance/dashboard-filter-breakdown.md`); nothing new to do here.
- The harness itself (bench controls, `document-title`, landmarks) has violations; those are out of scope.

## State matrix
| Region | empty | loading | error | partial | long | no permission | offline |
|---|---|---|---|---|---|---|---|
| Gap column (rest + mode) | not reachable (harness min is 4; shell fallback exists, `shell.tsx:220`) | not reachable | not reachable | present: 3 places / 13 gaps, 10 rows blocked plus room line (`15`); profile unknown is not reachable | present: 18 gaps, long name wraps at 320, no horizontal scroll (`16`) | n/a; the full profile hides the list (#4) | not reachable |
| Save (bar) | present: 0 selected, «Aggiungi» `aria-disabled` | missing in the default view (#2) | present, but it leaves the mode (#2) | present (over-cap), contradictory copy (#2) | — | not reachable | not reachable (fixtures only) |

Reduced motion was checked: under `prefers-reduced-motion` the bar's animation is `none`. No dark theme ships (no color-mode provider).

## Persona situations
- **Freelance, desktop keyboard, 13 gaps, 18 places, adds 2 then wants a 3rd:** focus is lost at every step (#1), then the flow dead-ends after the first success (#3).
- **Freelance on a 375 phone, 18 gaps, 3 places:** works. The bar sticks at the bottom and the room line stays readable. The two identical ✕ about 650 px apart are where this differs (#5).
- **Senior freelance with 30 skills:** the comparison disappears (#4), so they can't see which skills are worth swapping in before following «Fai spazio».
- **Hand-off, freelancer to recruiter:** skills added in one tap become search matches through the engine's substring arms (`search-match.ts:84-88`; the third arm means a profile skill «Go» matches any search value containing «go»). The Recruiter persona's «filtering precision» depends on honest adds (#6).

## Already broken around the surface
- `router/dashboard/route.tsx:89` `if (!profile.isSuccess) return null;`. A failed `/me` re-read keeps `data` but drops the verdicts, so the comparison falls back to a single list with no action. The tech debt (EN-S4) records this as verified in jsdom. An add triggers that re-read, so a failure would wipe the mode and the selection. The recorded fix is to anchor on `data !== undefined`.
- **Gap labels are the first search's raw spelling.** Entries are de-duplicated on lowercase (`search-match.ts:105-106`) but keep the first chip's label (`:144-148`). REQUIREMENTS §3.5 notes that skills arrive unnormalised («react.js»). One tap writes that spelling to the public profile.
- **The current `SkillsCta` goes to bare `/profile`** (`axis-entries.tsx:221-222`), even though it renders only for skills (`:216`) and `?edit=competence` exists. Users land on the profile page and have to find the competence editor themselves.

## Where the spec will be misread
| Phrase | How it will be misread | Fix |
|---|---|---|
| «A riposo la colonna è il confronto di oggi» | Copied from the prototype's ReadingView, which puts a ✗ on every gap (`modo-selezione.tsx:172-176`) | Today's detached card has no marks in either column (`axis-compare.tsx:64`, `verdict="none"`). Say "production AxisCompare, unchanged" |
| «Le skill aggiunte passano nella colonna blu» | Taken to mean exactly the checked rows move, as the fake does (`shell.tsx:77-79`) | Columns are recomputed with the engine's substring match, so other rows can move too. The confirmation counts what was written |
| «Al più due fermate: la ✕ e la CTA» (flow step 4) | Assumed still true | In the mode there are up to 18 checkboxes plus two buttons. Restate the Tab order |
| The group headings | Built from the shell's `GroupHeading`, whose accessible name reads «Non sul tuo profilo 13 % delle ricerche» | Use production `VerdictGroup` (SrMark colon, caption `aria-hidden`) |
| «Vedi tutte 19 competenze» (shell) | Copied as is | Production copy is «Vedi tutte le {asked} {noun}» |

## Manual checks still needed
- **VoiceOver with Safari and NVDA with Chrome:** open the card and enter the mode. Confirm the move is announced and checkbox 1 is read as «Docker, 58%, casella non selezionata». With «3 posti», select 3, then Tab to row 4: it should say unavailable and read «Hai riempito i posti rimasti…». Press «Aggiungi»: «Aggiungo…» and then the outcome should be spoken once.
- **Real phone (coarse pointer, 40 px rows):** tap the top and bottom 10 px of a row and confirm whether it toggles (on desktop, padding clicks don't). With 18 gaps, scroll to the end and confirm the sticky bar does not cover «Vue.js».

## Open questions
1. How messy are real searched skill strings («react.js», «k8s»)? **Default:** write the label exactly as displayed, trimmed, and ask the backend for the alias map from REQUIREMENTS §3.5 before launch.
2. Is the 30-skill cap enforced on the server, and can existing profiles already exceed 30? **Default:** treat 30 or more as 0 places (#4's view).

Screenshots are in `/private/tmp/claude-501/-Users-omardeangelis-Desktop-imparare-cose-brain-manager/900e90a7-0877-4ac2-a73f-141d7fab3fef/scratchpad/shots-as/`. axe ran from the cdnjs 4.10.2 build, because `node_modules` has no axe-core. `brain/chore/ux-review.md` is absent, so no findings were suppressed.
