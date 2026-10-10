# Review-2 score — linkedin-sync

Document: `review2-ls.md`, the second-format UX review of `/prototypes/linkedin-sync` (winner VariantVetrina «Vetrina» + «Timbro»). Ground truth: `gt-ls.md`, defects LS-1 to LS-15, so N = 15.

This score uses the same conventions as `score-baseline-ls.md`, `score-new-ls.md` and `score2-ss.md`:
- **Bundled defects:** a hit only when most sub-failures are covered. Fewer than that gives a partial.
- **Dismissed defects:** a defect named exactly but explicitly dismissed is a partial.
- **Findings:** decisions plus the items under «Task accessibility fixes» (this format's name for the mechanical-fix list) plus already-broken items.
- **Unsupported runtime claims:** a claim counts only when it cites no observation (trace step, screenshot, snapshot, outcome row or matrix cell, measured value) and no code location. A cross-reference to a cited row or decision counts as cited.

Every ground-truth defect is scored, including the layout and visual ones. Quotes are exact.

## 1. Ground-truth table

| GT ID | verdict | quote + section |
|---|---|---|
| LS-1 | miss | — [Nothing covers where the card lands vertically when the row sits mid or low on the page. The only geometry item is the resize row (LS-2). Manual check 4 is about the on-screen keyboard once an address field exists, not about placement against the viewport bottom.] |
| LS-2 | hit (borderline) | «the card keeps its 840 px position: «Annulla», «Collega ora» and «Chiudi» end up at x 840-1035 on a 375 screen. Only Escape or an outside click gets out» (Leaving and interrupting, row «Card open (explain)» / «resize the window to 375 (rotate or narrow it)»), with `11-resized-open.png` and button rects. [Same failure on the same state, observed and reported. The rubric counts a report that the behavior fails as a hit. Borderline because the row is not routed to a decision or a fix, and no requirement ("recompute geometry on resize") is written. Read strictly as "names it without a usable requirement", this is a partial.] |
| LS-3 | hit | «When the «Gestisci» hub opens, focus stays on BODY until the person presses Tab; move it into the card.» and «Tab leaves the open card into the page behind … Keep Tab inside the card.» (Task accessibility fixes, bullets 1 and 2). [Both sub-failures are covered: initial focus and Tab containment.] |
| LS-4 | hit | «On close it does not return to the row, so the next Tab lands on «Da remoto». Return focus to the row button.» (Task accessibility fixes, bullet 3). |
| LS-5 | miss | — [The scrim appears only as a z-index layer in #1's evidence and as a dismiss target in #5. Nothing covers the scrim popping in with no fade, or being cut mid-fade under reduced motion.] |
| LS-6 | miss | — [Nothing on the header growing ~45 px instantly when the hub morphs to the warning or confirm faces.] |
| LS-7 | miss | — [No focus-ring or `overflow:hidden` clipping item anywhere.] |
| LS-8 | hit | «Activating the row during the ~380 ms close, programmatically as assistive tech does, loses the reopen. After that the row never opens again until reload. … A reopen during close should cancel the close.» (Task accessibility fixes, bullet 5). Manual check 3 adds a screen-reader repro. |
| LS-9 | miss | — [The success linger appears only as «badge ~950 ms, card closes» (Outcomes and states). Nothing covers closing the stamp and reopening inside the linger window. Bullet 5's reopen is during the ~380 ms return trip, not the 950 ms linger.] |
| LS-10 | hit (borderline) | «**Timeout or dropped connection**: re-read the company. If the sync date moved, show the normal success; if not: «Non sappiamo ancora se l'aggiornamento è andato a buon fine. …» Never say "non riuscito".» (Decisions, #2, default). The acceptance criterion adds «Timeout: no failure wording; a re-read showing a new date gives the success state.» [Covers the two main ambiguous outcomes, timeout and dropped connection, with a verify-then-speak rule. Borderline because a **500**, which can arrive after the update (old FLOW EP7), gets plain failure copy «Qualcosa non ha funzionato. Riprova tra poco.» with Riprova and no re-read. That copy does not claim "no data written", though. Scored as a partial, the totals become 0.27 / 0.47.] |
| LS-11 | partial (borderline) | «Closing during the wait is allowed. The sync keeps running» (Decisions, #5, default). The acceptance criterion adds «Start a re-sync and press Escape. The card closes and the page scrolls.» [This removes the non-closable working card, but only for the connect and re-sync wait. None of the listed sub-failures is named: a hung disconnect, a hung «Salva e sincronizza» save (#1), a hung re-read (#2), or the archived-company retry loop. #2's default even gives a 404 the 500 copy with «Riprova», which is the retry loop. The evidence `machine.ts:220-225` is the generic busy guard, so an implementer might lift it for every busy state. Scored as a hit, the totals become 0.40 / 0.53.] |
| LS-12 | partial | «→ #2 (404 uses the 500 copy)» (Outcomes and states, row «502 / 500 / 429 / 403 / 404»), with #2's «The card stays open and the error takes the header». Row «400 bad URL / no URL on file» routes to #3's «A `/in/` address shows the field error and does not start.» [404 no longer closes silently, but «Riprova tra poco» misleads for an archived company. The 400 is prevented client-side rather than given correct copy. For 401 the review says «the interceptor refreshes; nothing on screen» and gives no rule. Nothing covers re-announcing a repeated failure after Riprova. About one of four sub-failures.] |
| LS-13 | partial | «**429**: «Troppe richieste da questa rete in questo momento. Riprova tra 15 minuti.», no Riprova.» (Decisions, #2, default). The acceptance criterion adds «429: no retry anywhere.» [Same 429 area. Nothing says the reason must not show on the disconnect confirm while «Scollega» is enabled. Nothing covers the 429 state being forgotten on a workspace switch.] |
| LS-14 | partial (borderline) | «the primary becomes «Salva e sincronizza». It saves first, syncs only if the save succeeds … The Save bar is inert while a sync runs. On success every field reloads from the returned company.» (Decisions, #1, default). #5 adds «A sync in flight counts as work for the leave guard.» [The overwrite of a fresh import is identified, and save-first plus reload-on-success closes the just-after-sync case. The leave dialog's «Salva ed esci» is never named. The uncertain (timeout) state has no rule for fields edited after #5 lets the person close the card mid-sync. Same call as the earlier review-ls score. Scored as a hit, the totals become 0.40 / 0.53.] |
| LS-15 | partial | «the explanation or warning says so by section ("Hai modifiche non salvate in Identità e Chi siamo")» and «otherwise stops on the save error» (Decisions, #1, default). [The unsaved-section count goes on the card, not the leave dialog. Where the save error appears is not stated, and the review makes the Save bar inert during the sync. Nothing covers the SaveBar live region being dropped.] |

## 2. Recall

strict recall = 5 / 15 = 0.33; lenient recall = (5 + 0.5 × 5) / 15 = 7.5 / 15 = 0.50

There are 5 hits (LS-2, LS-3, LS-4, LS-8, LS-10), 5 partials (LS-11, LS-12, LS-13, LS-14, LS-15) and 5 misses (LS-1, LS-5, LS-6, LS-7, LS-9).

For comparison, the baseline FLOW.md scored 0.27 strict and 0.53 lenient, and the first-format review (`review-ls.md`) scored 0.40 strict and 0.60 lenient. Review 2 picks up LS-8 (reopen during the return trip), which the first review missed. It loses LS-9 (reopen during the success linger), which the first review hit. It turns LS-1 and LS-7 into clean misses where the first review had partials from its width sweep and focus-ring check. LS-5 and LS-6, the two motion defects, are missed by every document.

Borderline calls and how they move the numbers:
- **LS-2 as partial:** 0.27 strict, 0.47 lenient.
- **LS-10 as partial:** 0.27 strict, 0.47 lenient.
- **LS-2 and LS-10 both as partial:** 0.20 strict, 0.43 lenient.
- **LS-11 as hit:** 0.40 strict, 0.53 lenient.
- **LS-14 as hit:** 0.40 strict, 0.53 lenient.

## 3. Counts

- **lines:** 76
- **findings:** 16, made of:
  - 6 decisions (#1–#6)
  - 5 «Task accessibility fixes»: initial focus on hub open, Tab escaping the card, focus to BODY during the wait plus no return on close, disconnect never announced, and reopen during close lost
  - 5 already-broken items: hand-written `linkedin_url` field, no `linkedin_sync_date` in the page's data, leave guard counts only unsaved fields, page subtitle false for the sync, and freelance `getErrorMessage` showing raw server `msg`

  Splitting fix 3 into "focus drops to BODY for the wait" and "focus not returned on close" gives 17. Also splitting #4 into "connect lacks the hand-edit warning" and "field lists disagree" gives 18.

  Not counted: 10 outcome rows, 4 «Leaving and interrupting» rows, the persona notes and hand-offs, 5 «misread» phrases, 4 manual checks and 3 open questions.
- **open questions:** 3, all 3 with a recommended default (OQ1 «Default: required, backend first; without it, v1 ships without «Scollega pagina».»; OQ2 «Default: yes for v1, with the copy in #2.»; OQ3 «Default: write the copy for Small business (plain words).»). The 6 decision rows are also framed as «Decision needed», each with a recommended default. Counting them too gives 9 of 9.
- **decisions with default and acceptance criterion:** 6 / 6. Every row #1–#6 has a non-empty «Recommended default» and a non-empty «Acceptance criterion».
- **runtime claims without evidence:** 0.

  Excluded as borderline:
  - Persona «Small business admin»: ««dalla tua pagina pubblica» reads as the SeVedemo page that the «Vedi la pagina pubblica» button opens (`translations.json:1785`)». The sentence's code location covers only the button. The status-line copy itself is not cited, though it is accurate (`VariantVetrina.tsx:63`). It is also a reading of copy, not a claim about behavior.

  Excluded as cited:
  - every Decisions problem cell, each backed by its Evidence column (code lines, contract lines, trace, `02-explain.png`, snapshot `e20`)
  - all 5 accessibility fixes (trace, `03-tab-escaped.png`, eval timings, `proto.css:225-226`)
  - all outcome and «Leaving and interrupting» rows, including the resize row (`11-resized-open.png` plus button rects, confirmed in `shots2-ls/`)
  - persona and hand-off claims that cite a contract line or point to a cited decision: «so the first try can return 429», «it reads «Collegata» from day one» (contract :85), «B's Save reverts those fields» (#1), «The page subtitle promises the opposite (below)»
  - the already-broken items (code, doc and contract lines)

  Not a runtime claim, but inaccurate: the verdict says «none of them can be shown on the fake state machine». #5 and all 5 accessibility fixes were observed on the prototype by trace.

## 4. Findings not in the ground truth that look real and user-observable

- **#3:** the explain step has no address field, and `COMPANY_LINKEDIN_URL` is hard-coded (`machine.ts:12`). The contract defines «connected» as `linkedin_url !== null` while `LinksSection.tsx` writes that column from free text, so a never-synced company would read as connected. The page's `Company` type has no `linkedin_sync_date` to show.
- **#4:** connect says only «Ogni sincronizzazione sovrascrive i campi corrispondenti» (`VariantVetrina.tsx:209`). Unlike the re-sync warning, it never says hand-made changes, including an uploaded logo or cover, are lost, although the contract asks for a confirmation. The status line names 3 fields, the chips and warning 5, the contract 10.
- **#6:** there is no permission gate. A member or unpaid plan sees an actionable row, and the sync needs `company.settings`, so it would answer 403 after a wait of up to 2 minutes.
- **Fix 4:** disconnect is never announced. The live region goes from «Scollego la pagina LinkedIn» to "" because `announcement()` has no case for a finished disconnect (`machine.ts:63-78`).
- **#5:** the wait copy says «fino a un minuto» (`VariantVetrina.tsx:259`) against a 125 s client cap. Reload or back mid-sync gives no prompt, because the leave guard counts only dirty fields (`useLeaveGuard.ts:34`).

## 5. Validity judgement, provisional, for the maintainer to confirm

Judged only on whether each item is a real, user-observable problem on this surface. Code was checked read-only in `ux-bench-ls/` at 3adcff19.

### Decisions

| # | judgement | reason |
|---|---|---|
| 1 | valid | `store.ts:291-307` sends only dirty keys. The reseed effect in `SettingsPage.tsx:216-226` refuses to refresh while `dirtyKeys().length > 0`, page-wide, so fields that were not edited also keep pre-sync values. The SaveBar island is `z-30` with `pointer-events-auto` (`SaveBar.tsx:382-386`), the same layer as the scrim (`proto.css:256-259`). Same mechanism as GT LS-14. |
| 2 | valid | The machine is success-only (`machine.ts:88-112`). The contract lists 400 (two kinds), 401, 403, 404, 429 and 502, plus the 125 s timeout that `onboarding/api/types.ts:36-38` calls a possible server-side success. One flaw in the default: a 404 (archived company) gets «Riprova tra poco» with Riprova, the GT LS-11 retry loop. The 502 copy is keyed on status, but the existing classifier keys on the `LINKEDIN_SCRAPE_FAILED` marker. |
| 3 | valid | The explain face has no input. `COMPANY_LINKEDIN_URL` is hard-coded. The contract's `isConnected = linkedin_url !== null` (§2.1) combines with the free-text writer in `LinksSection.tsx`, which `IMPLEMENTATION-NOTES.md:22` says PATCH now persists. `company/api/types.ts` has `linkedin_url` and no `linkedin_sync_date`. |
| 4 | valid | Connect's body (`VariantVetrina.tsx:209`) does not say hand edits are lost, while the warning does (`:320-322`). The contract asks for a confirmation because logo and cover are replaced even when uploaded by hand. Minor inaccuracy: the chips (`:48`) and the warning name the same five fields, so only the status line (`:63`, three fields) disagrees with them. All three are short of the contract's ten. |
| 5 | valid | `dismiss` returns early while `isBusy()` (`machine.ts:221-222`), with no feedback. `lockScroll` sets `overflow:hidden` on `html` (`ExpandCard.tsx:67-72`). The copy says «fino a un minuto» against `COMPANY_LINKEDIN_FETCH_TIMEOUT_MS = 125_000`. `useLeaveGuard.ts:34` guards only dirty fields. «The outcome is never seen» is slightly overstated: a successful sync's data would show after reload, just with no confirmation. |
| 6 | valid | `deriveAccess` (`access.ts:61-80`) already yields `canEdit: false` for `solo_freelancer`, `plan`, `role` and `pending`. The prototype's row is a button for every viewer, and the endpoint requires `company.settings`. It is a spec gap rather than an observed defect, but left open it becomes a dead-end action that ends in a 403. |

### Already broken

| item | judgement | reason |
|---|---|---|
| Hand-written «Pagina LinkedIn» field | valid | `LinksSection.tsx` renders a free-text `<Input name="linkedin_url">`, `linkedin_url` is a writable form key, and PATCH persists it (`IMPLEMENTATION-NOTES.md:22`). Under the contract's rule a typed URL reads as connected. It stays latent until the card ships, but it is the direct cause of #3. |
| No `linkedin_sync_date` in the page's data | valid | The FE `Company` type (`company/api/types.ts:54-63`) has no such field. `IMPLEMENTATION-NOTES.md:55` records it as left out of the authenticated DTO on purpose, and the tech-debt table (`company-edit-area-redesign.md:31`) agrees. «Ultima sincronizzazione» has nothing to read. |
| Leave guard counts only unsaved fields | valid | `hasUnsavedWork = () => store.dirtyKeys().length > 0` (`useLeaveGuard.ts:34`). Once a sync runs on the page, leaving mid-sync gives no prompt and the outcome is lost. Latent until the sync ships. |
| Page subtitle false for the sync | valid | `translations.json:1783` says «Le modifiche diventano pubbliche quando salvi.» The contract's sync writes and publishes with no Save, so the copy on the same page contradicts the action. |
| Freelance `getErrorMessage` shows raw `msg` | doubtful | It is accurate: `LinkedInSync.tsx:26-48` returns `response.data.msg` verbatim and falls back to axios's English `error.message`, and the company 429 body is English (contract :341). But that is the freelance surface, and here it is only a reuse hazard, not a problem a person on the company page can see today. |

Totals: 10 valid, 1 doubtful, 0 invalid (decisions: 6 valid; already broken: 4 valid, 1 doubtful).
