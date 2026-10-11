## Moment: prototype review — http://localhost:3103/prototypes/add-skills (winner «Modo selezione», round 1 of 2)
## Verdict: iterate — the direction holds, but three outcomes leave users stranded: after a save, during a save, and at 0 free places. Each is a small change to the winner's own state machine. The other findings go to the spec as decisions.

## Prototype changes
Screenshots are in `scratchpad/shots-as/`.
1. **D1** → After a successful save, write the confirmation into the existing `role=status` line and keep «Aggiungi competenze al profilo» under it. When the last missing skill is added, show the confirmation as well. **Check:** with 13 missing and Successo, add GraphQL. The status line reads «1 skill aggiunta al tuo profilo.», the button is still there, and Enter opens the mode with 12 rows. With 4 missing on the panel, add all 4: the confirmation is visible next to «Il tuo profilo le ha tutte.»
2. **D3** → Stay in the mode until the save has an outcome, and leave it only on success. **Check:** press Aggiungi. The bar shows «Aggiungo…», the rows are blocked and the ticks stay. With «Da ripetere» you are still in the mode, with 2 ticks and the error under the bar. With «Tetto cambiato» the room line names the overflow.
3. **D4** → At 0 free places, render the ✗ reading list and put the cap line and the link under it. **Check:** 4 missing, «Pannello intero», 0 posti: 4 ✗ rows, then «Il tuo profilo ha già 30 competenze…» and «Fai spazio nelle competenze».

## Decisions
| # | P | Decision needed | Recommended default | Acceptance criterion | Evidence |
|---|---|---|---|---|---|
| D1 | P1 | What stays on screen after a successful save. It affects everyone who adds once, and it strands them | The confirmation goes into the `role=status` line. «Aggiungi competenze al profilo» stays while any skill is missing and there is room | After adding 1 of 13, the status text is «1 skill aggiunta al tuo profilo.» and the button opens a mode with 12 rows. After adding the last missing skill, the confirmation is present | `modo-selezione.tsx:86-115`: the confirmation *replaces* the button and `confirmed()` never resets. Trace: tick GraphQL → Aggiungi → `snapshot -i` shows no add button. `[role=status]` is empty and `activeElement` is BODY. Esc and reopen: still no button (`06-1280-success.png`), with 12 missing and 17 free places. Panel, 4 missing, add all 4: `innerText.includes('aggiunt')` is false, because `shell.tsx:217-226` falls back and drops the children (`21-panel-all-added.png`) |
| D2 | P1 | Where focus goes as the mode opens and closes. It affects every keyboard user | Entering the mode focuses the first checkbox. «Esci dalla selezione» returns focus to «Aggiungi competenze al profilo». After Aggiungi, focus stays on the bar, then moves to the status line | Enter on the button puts focus on «Docker». No Tab step lands on BODY. × puts focus back on the button | Checked on the card at 1280 and on the panel with 4 missing. Enter on the button gives `activeElement` BODY, and the next Tab goes to «Aggiungi», skipping all 13 checkboxes. × gives BODY, and so does Aggiungi. The cause: the focused control unmounts at `modo-selezione.tsx:107-110`, `:129-133` and `:144-150` |
| D3 | P1 | What the user sees during the save and after a failure. Every save is affected, and a failure loses the context | The mode stays open while saving: the bar shows «Aggiungo…» and rows are blocked. «Da ripetere» keeps the ticks with the error under the bar, and Aggiungi retries. «Tetto cambiato» changes the room line to «Hai scelto 3 skill, c'è posto per 1: togline 2.», and Aggiungi's `aria-describedby` points to that line | While saving, «Aggiungo…» is visible without re-entering the mode. After a failure you are still in the mode with the ticks. In the over-cap case the room line and the error do not contradict each other | `modo-selezione.tsx:131-132` runs `setMode(false)` at submit. Trace: Aggiungi returns at once to the reading view, GraphQL is still ✗ and the entry button is live for the whole save (`05-1280-saving.png`). «Aggiungo…» only appears if the user re-enters the mode (`18-reenter-during-save.png`). Retry: reading view plus «Riprova», with no retry control in reach (`09-1280-retry.png`). Over-cap: the room line says «Hai riempito i posti rimasti», the error says «ora puoi aggiungerne 1», 3 are ticked and Aggiungi is aria-disabled with no reason given (`17-overcap-mode.png`) |
| D4 | P1 | At 0 free places, the comparison disappears. This hits every capped profile, and the list is what they need to choose a swap | The ✗ list always renders. The cap line and «Fai spazio nelle competenze» sit under it, on the panel and in the card | 4 missing and 0 posti: 4 ✗ rows are visible above the link | At `modo-selezione.tsx:59`, `<Show when={!capped()} fallback={<NoRoom/>}>` also wraps the `ReadingView`. Trace: 4 missing, panel, 0 posti. The heading says «Non sul tuo profilo 4» and there are 0 rows (`24-panel-noroom.png`). The scope says the column at rest «stays today's comparison» |
| D5 | P2 | What happens to the ticks when the card closes while the mode is open | Every way of closing the card (Esc, scrim, ✕, and the shipped close on width change, S1) discards the selection, like «Esci dalla selezione». Only a failed save keeps the ticks (D3) | Mode → tick 2 → Esc → reopen → enter the mode: «0 selezionate» | Trace: tick Docker and Jest, Esc, reopen. The reading view shows; entering the mode shows both checked and «2 selezionate» (`12-mode-stale-selection.png`). The mode is local (`modo-selezione.tsx:30`) but the selection lives in the card (`shell.tsx:73`); the code flags this itself at `:23-27`. The shipped `specs/freelance/dashboard-filter-breakdown/SPEC.md` S1 closes the card on any width change, so rotating the phone mid-selection hits this |
| D6 | P2 | The honesty cue on the action (hand-off to companies). Every add is affected; the harm is moderate | Keep today's copy «Aggiungi le skill che hai davvero» on the button that opens the mode | The button's name equals that string | Today's copy is `src/locales/it/translations.json:1236`; the prototype uses «Aggiungi competenze al profilo» (`modo-selezione.tsx:112`). With 13–18 checkboxes and a bulk «Aggiungi», unverified skills flow into company search filters, where Recruiters care about filtering precision (`brain/personas.md`) |

## Mechanical fixes
`brain/chore/ux-review.md` is absent, so no findings are suppressed. axe-core 4.10.2 came from cdnjs (not in `node_modules`) and ran scoped to the card in every state above.
- **Focus hidden by the sticky bar (WCAG 2.4.11).** At 390, Tab to Terraform: row 741–773 against bar top 739, so the row is fully covered (`28-390-focus-under-bar.png`). At 1280 with 18 missing, «Go»: row 681–713 against bar top 695 (`33-1280-18-focus-under-bar.png`). At `checkbox-row.tsx:45`, `scroll-mb-20` (80 px) is smaller than the 89 px bar. Fix: add a bottom scroll padding of at least the bar height plus one row on the scrolling face.
- **Contrast 3.59:1 on the error text** (#ef4444 on #f8fafc, 12 px): `modo-selezione.tsx:157`.
- **Contrast 4.29:1 on the outline button** «Aggiungi competenze al profilo» (#1e77eb on #fff): `modo-selezione.tsx:107`. Fix the design-system token at `button.tsx:24`, not locally.
- **Contrast 4.1:1 on the primary «Aggiungi»** (white on #1e77eb, 14 px): `modo-selezione.tsx:124`. Same fix: the default variant token in `button.tsx`.
- **Contrast 4.1:1** on «Fai spazio nelle competenze» (`checkbox-row.tsx:121`) and «Vedi tutte N competenze» (`shell.tsx:384`).
- **«Esci dalla selezione»** shows the browser's default outline (`auto 1px rgb(0,95,204)`) instead of the project ring: `modo-selezione.tsx:151`. Add Button's `focus-visible:ring` classes.
- **Hit area smaller than the hover area.** The label is 694–988 × 276–296 inside a 660–996 × 270–302 row. Clicks at (663,286), (990,286) and (800,272) do not toggle, yet the whole row highlights on hover: `checkbox-row.tsx:28-74`. Make the whole row the label.
- **Checkbox names read «Docker 58%»** with nothing saying what the percentage is: `checkbox-row.tsx:71-74`. Add the hidden text «delle ricerche».
- **Heading order** (axe `heading-order`): the h4 follows an h2. `shell.tsx:143`, which mirrors the shipped panel.
- **Layout (motion values go to `design-engineer`).** The dialog re-centers when its height changes: top 33 → 21 px when the mode opens, 21 → 49 px after success, at 1280 (`02`, `03`, `06` .png). The jump comes from the ExpandCard centering on every height change.

## State matrix
| Region | empty | loading | error | partial | long | no permission | offline |
|---|---|---|---|---|---|---|---|
| Missing list at rest | present («le ha tutte»), but it hides the confirmation (D1) | not reachable | not reachable | not reachable (profile-unknown S5) | present: 18 rows scroll, the long name wraps at 320–360 and 640–680, no horizontal overflow in the 320–1280 sweep | not reachable | not reachable |
| Selection list | present: with 0 ticks Aggiungi is aria-disabled, with no reason given | — | — | present at 3 places (`15-tight-full.png`) | present, but focus is hidden (mechanical fix 1) | **missing** at 0 places (D4) | — |
| Save | — | **missing** (D3) | present in `role=status`; the selection is hidden (D3) | over-cap: present but contradictory (D3) | — | — | not reachable: the fake save reports success with `navigator.onLine=false` (`34-offline-save.png`) |
| Success | **missing** announcement and focus (D1, D2) | — | — | — | — | — | — |

Only the light theme ships (dark CSS exists, but nothing sets `data-kb-theme`). Under reduced motion the bar has `animation: none` (observed).

## Persona situations (only where they differ) + dependencies and hand-offs
`brain/personas.md` lists four personas; only **Freelance** uses this surface.
- **Freelance at 30 skills.** The list is gone (D4). «Fai spazio» goes to `/profile?edit=competence`, which is a whitelisted deep link (`profile/utils/edit-param.ts:19-26`). It carries none of the missing skills over, so the freelancer has to come back and find them again. Once D4 keeps the list visible, no carry-over is needed.
- **Freelance on keyboard or screen reader.** Steps 2 and 4 of the walkthrough fail: no focus, no announcement (D1, D2).
- **Freelance at 390.** The 6 owned rows come before the actionable list, and about 7 checkboxes fit above the bar (`27-390-mode.png`). Otherwise it behaves like desktop.
- **Hand-off Freelance → Recruiter / Small business:** self-declared skills feed the company search filters (D6).
- **Dependency:** the shipped dashboard SPEC S1 closes the card on width change, which interacts with D5.

## Already broken around the surface
- **`SkillsCta` sends users to a bare `/profile`** (`dashboard/components/axis-entries.tsx:204-231`). Its comment says a deep link «would be half a lie» because skills and rate live in two modals. But this CTA is skills-only, and `?edit=competence` is whitelisted. Today users land on the profile and have to find the pencil. This comes from reading the code; I did not run it.

## Where the spec will be misread
| Phrase | Misread as | Fix |
|---|---|---|
| «l'✕ riporta tutto com'era» | Only × cancels | «Any way out of the mode or the card discards the ticks; only a failed save keeps them» (D5) |
| «Aggiungo…» on the button | The in-flight state is visible | It is only visible if the mode stays open (D3) |
| «a riposo la colonna è il confronto di oggi» | It holds at every room level | Add «including 0 free places» (D4) |
| Dialog label «Confronto delle competenze» (`shell.tsx:369`) | The prototype's label gets copied | Keep the state-driven name from shipped S3: «Confronto completo: {Tipo}» |
| `click_freelance_dashboard_cta` / `add_skills` (`checkbox-row.tsx:112`) | The same event is reused for opening the mode | Use its own `cta` value for opening the mode, plus a save-outcome event with `count` and `outcome` only |

## Manual checks still needed
1. **VoiceOver on iOS and NVDA on Chrome.** Enter the mode and note what is announced. Tick a box: are «N selezionate» and «Puoi aggiungerne ancora N» read? Neither is a live region (`modo-selezione.tsx:119`, `checkbox-row.tsx:89`). Focus a blocked row and confirm it reads the cap line. Force a failure and confirm `role=status` speaks once.
2. **On a real phone (coarse pointer).** Emulation reported `pointer: fine`. Tap the top and bottom 10 px of a 40 px row, and the gap between the box and the label: does it toggle?
3. **iOS Safari.** Tap «Aggiungi competenze al profilo» and «Esci dalla selezione», and note where focus and the VoiceOver cursor land.

## Open questions
1. Does the real save add all the skills or none, or can it partly succeed («2 su 3»)? The bench has no partial outcome. *Default: all or none.*
2. Should a single save add any number of skills, or should there be a limit per save beyond the 30 cap (signal quality for companies)? *Default: no extra limit; rely on the honesty copy (D6).*
3. How common are profiles at the 30-skill cap? It decides whether D4 is P1 or P2. *Default: treat it as P1.*
