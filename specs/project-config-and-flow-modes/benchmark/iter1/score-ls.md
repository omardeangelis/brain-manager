# New-review score — linkedin-sync

Document: `scratchpad/review-ls.md`, the UX review of `/prototypes/linkedin-sync` (winner `VariantVetrina.tsx` with `ExpandCard.tsx` and `MorphView.tsx`). It is scored as a whole. Ground truth: `gt-ls.md`, defects LS-1 to LS-15, so N = 15.

This score uses the same conventions as the baseline scorer:
- **Bundled defects:** a hit only when most sub-failures are covered, otherwise a partial.
- **Dismissed defects:** a defect named exactly but explicitly dismissed is a partial.
- **Findings:** decisions plus mechanical fixes plus already-broken items.
- **Unsupported runtime claims:** a claim counts only when it cites no observation (trace step, screenshot, axe rule, matrix cell or measured value) and no code location.

Quotes are exact.

## 1. Ground-truth table

| GT ID | verdict | quote + section |
|---|---|---|
| LS-1 | partial | «Trigger near the bottom: the card clamps inside the viewport (`22-375x540-trigger-bottom-open.png`)» (State matrix, «Other modes checked»). [This is the defect's state, observed and judged fine. The cited shot shows the card pressed 16 px from the bottom edge, which is the LS-1 failure. Named but dismissed, so partial.] |
| LS-2 | hit | «The card's geometry is recomputed on resize» (Decisions, #4, default). The acceptance criterion adds «After a rotation or a resize the card stays inside the viewport». The evidence (c) adds «the card stays 840 px wide at x=220 … Geometry is set only in `promote`». |
| LS-3 | hit | «Enter on the trigger opens the hub with focus on BODY … Fix: move focus to the title or the progress line» (Mechanical fixes, «Initial focus»). «Focus escapes the `aria-modal` card» adds «Fix: make the page outside inert». [Both sub-failures are covered: initial focus and Tab containment.] |
| LS-4 | hit | «Escape and the auto-close leave focus on BODY … Fix: return focus to the trigger» (Mechanical fixes, «Focus return»). |
| LS-5 | miss | — [The scrim appears only as a dismiss target and in a z-index comparison. «Reduced motion: the card snaps and the flow completes» is about the card, not the scrim. Nothing covers the scrim popping in with no fade, or being cut mid-fade under reduced motion.] |
| LS-6 | miss | — [Nothing on the header growing ~45 px instantly when the hub morphs to the warning or confirm faces.] |
| LS-7 | partial | «the browser's default `outline:auto 1px` is clipped to a hairline by `.xcard{overflow:hidden}`» (Mechanical fixes, «Trigger focus ring»). [Same failure, a focus ring clipped by `overflow:hidden`, but on a different element. The review reports the collapsed trigger. The GT defect is the confirm buttons inside the `.lsync-shell`.] |
| LS-8 | miss | — [Change 1 covers «Reopening during the sync» and change 2 covers a reopen during the success linger. Nothing covers a reopen during the ~400 ms return trip.] |
| LS-9 | hit | «reopening during the 950 ms success linger cancels the pending auto-close» (Prototype changes, 2). Decision #4 (b) traces it: «Escape on the stamp at 3207 ms, reopen at 3660 ms, then `mode=closing` at 4059 ms with no input». |
| LS-10 | hit | «Client timeout: re-read the company and show success if `linkedin_sync_date` moved, else "Ci sta mettendo più del previsto: ricontrolla tra qualche minuto"» (Decisions, #2, default). [This is the uncertain/verify treatment for the main ambiguous outcome. Borderline: a 500 and a network drop are not named, and the offline matrix cell says only «not reachable». Scored as a partial, the totals become 0.33 / 0.57.] |
| LS-11 | hit | «× always closes (change 1)» (Decisions, #4, default). The acceptance criterion adds «During progress, ×, Escape and the scrim close the card». #2 adds «and × works». [This removes the root cause, a working card that cannot be closed, for every progress state, the disconnect included. The archived-company retry loop is not named.] |
| LS-12 | partial | «an `/in/` URL shows "Questo è un profilo personale: serve la pagina aziendale (linkedin.com/company/…)"» (Decisions, #1, default). #2 adds «Each failure has its own copy inside the card and a way out». [This covers the 400 copy. The 404 silent close, the 401 blame and the missing re-announcement on retry are not covered. One of four sub-failures.] |
| LS-13 | partial | «it blocks only the sync, not the card's other actions» (Open questions, 3, default). #2 gives the 429 copy. [This is the same 429 area. Nothing says the reason must not show on the disconnect confirm while «Scollega» is enabled. Nothing covers the 429 state being forgotten on a workspace switch.] |
| LS-14 | partial | «After a successful sync the sections reload from the response. While the sync runs, the Save bar does nothing and leaving the page asks for confirmation» (Decisions, #3, default). The question cell adds «the next Save silently reverts the import». [The overwrite is identified, and the just-after-sync case is closed by the reload. Two things are not covered: the leave dialog's «Salva ed esci» option, and the uncertain (timeout) state, where the draft would survive. Borderline hit. Scored as a hit, the totals become 0.47 / 0.63.] |
| LS-15 | partial | «the warning and the explain view count the unsaved sections and offer "Salva prima" as the secondary action» (Decisions, #3, default). [The unsaved-section count goes on the warning, not on the leave dialog. Nothing covers the SaveBar live region being dropped, or where a «Salva prima» error surfaces while the SaveBar is inert.] |

## 2. Recall

strict recall = 6 / 15 = 0.40; lenient recall = (6 + 0.5 × 6) / 15 = 9 / 15 = 0.60

There are 6 hits (LS-2, 3, 4, 9, 10, 11), 6 partials (LS-1, 7, 12, 13, 14, 15) and 3 misses (LS-5, 6, 8). The baseline was 0.27 strict and 0.53 lenient.

Borderline calls and how they move the numbers:
- **LS-10 as partial:** 0.33 strict, 0.57 lenient.
- **LS-14 as hit:** 0.47 strict, 0.63 lenient.
- **LS-1 as miss**, if «clamps inside the viewport» is read as not naming the defect: lenient 0.57.

## 3. Counts

- **lines:** 71
- **findings:** 20, made of:
  - 6 decisions (#1–#6)
  - 10 mechanical fixes: Dialog name, Focus escapes the `aria-modal` card, Initial focus, Focus return, Default focus on the consequential action, Trigger semantics, Trigger focus ring, Silent disconnect, Small target, Contrast
  - 4 already-broken items: Stale contract table, Two writers for one column, No notion of outside writes, No data for the last sync

  Splitting the Contrast bullet into its three token pairs gives 22. Also splitting Trigger semantics (missing `aria-expanded`/`aria-haspopup`, and the run-together name) gives 23.

  Not counted:
  - the 2 «Prototype changes», which restate #4
  - the scope note «Violations that belong to the harness only … are left out»
  - state-matrix cells and the interruption log
  - persona notes
  - the 5 «misread» phrases
  - the 3 manual checks
- **open questions:** 3, all 3 with a recommended default (a quiet pill unless a URL is known; keep overwriting the name and list it first; 429 copy never says «il tuo limite» and blocks only the sync). The 6 decision rows are also framed as «Decision needed», each with a default. Counting them too gives 9 of 9.
- **decisions with default and acceptance criterion:** 6 / 6. Every row #1–#6 has a non-empty «Recommended default» and a non-empty «Acceptance criterion».
- **runtime claims without evidence:** 5.
  1. Mechanical fixes, «Initial focus»: «Enter on the trigger opens the hub with focus on BODY.» No trace, shot or code line is cited. The code agrees: `ExpandCard.tsx:205-207` makes the collapsed face, which holds the trigger, inert.
  2. Mechanical fixes, «Initial focus»: «After "Collega ora", "Sovrascrivi" or "Scollega", the clicked button unmounts and focus drops to BODY.» Nothing is cited.
  3. Mechanical fixes, «Focus return»: «Escape and the auto-close leave focus on BODY, and the next Tab skips the trigger (it lands on "Da remoto").» Nothing is cited.
  4. State matrix, «Other modes checked»: «iPhone 14 emulation: layout fine.» `29-iphone14-explain.png` exists in `shots-ls/` but is not referenced.
  5. «Where the spec will be misread», row 3: «Today three places list three different field sets (status line, chips, warning).» Nothing is cited, and the code shows only two sets. The chips (`VariantVetrina.tsx:48`) and the warning (`:320-322`) both list name, logo, cover, description and locations. Only the status line (`:63`) differs.

  Counted per bullet instead of per claim, the total is 4.

  Excluded as borderline:
  - «dark media: the page stays light, because only a `data-kb-theme` variant exists and no provider sets it.» It names the code mechanism, which `src/index.css:30` confirms. `27-1280-dark-media.png` exists but is not referenced.
  - «`overflow:hidden` on `html` does not stop scrolling on iOS» (Manual checks). This is stated as the reason for a manual check, not as an observation.

  Excluded as cited:
  - everything in the Decisions evidence column (shots, trace timings, `file:line`, contract sections)
  - the other 7 mechanical fixes (axe rule, shot, trace or code line)
  - the state matrix and the interruption log, which is itself the run record
  - the verdict's «2.4 s» and change 2's «~400 ms», which are measured values that #4 (b) also traces
  - the persona notes (code lines or `30-iphone14-…png`)
  - the already-broken items (code and doc lines)

## 4. Findings not in the ground truth that look real and user-observable

- **#1:** a company without a known URL cannot connect. The explain view has no URL field and `machine.ts:12` hard-codes the page. The real endpoint answers 400 `NO_LINKEDIN_URL_CONNECTED` with an empty body (contract §3.2). `LinksSection.tsx` remains a second, free-text writer of `linkedin_url`.
- **#5:** «Collegato» is defined as `linkedin_url !== null` (contract §2.1), so a hand-typed, never-synced URL reads as connected. There is no disconnect endpoint that clears `linkedin_sync_date`. The last-sync date is truncated off the row below ~620 px: 83 of 370 px are visible at 320 (`31-320-connected-rest.png`).
- **#6:** there is no permission model. A `member` would see an enabled, filled «Collega» under the page's read-only notice (`SettingsPage.tsx:333-349`), and the sync needs `company.settings`, so it would answer 403.
- **Default focus on the consequential action:** `autofocusSoft` on the confirm button (`VariantVetrina.tsx:144`) means Enter twice from the hub row disconnects the page (trace).
- **#2, wait copy:** «Può richiedere fino a un minuto» (`VariantVetrina.tsx:259`) against the contract's ~120 s. The staged messages stop on «Aggiorno i dati…» after 1.6 s (`machine.ts:159-184`), so a real sync would claim to be writing for about two minutes.

## 5. Validity judgement, provisional, for the maintainer to confirm

Judged only on whether each item is a real, user-observable problem on this surface. Code was checked read-only in `ux-bench-ls/` at 3adcff19.

### Decisions

| # | judgement | reason |
|---|---|---|
| 1 | valid | The explain view has no URL input, and `COMPANY_LINKEDIN_URL` is hard-coded (`machine.ts:12`). The contract's sync returns 400 `NO_LINKEDIN_URL_CONNECTED` when no URL is linked and says «mostrare il campo di input». `LinksSection.tsx:279-307` is a live free-text writer of the same column. With page scroll locked, `applyHeight` clamps the top to 16 px, so a taller card is cut. Shot 26 shows the hub's bottom clipped at 568×320. |
| 2 | valid | The fake machine is success-only, with no error, timeout or 429 path. `dismiss` returns early while busy (`machine.ts:221-222`). The copy says «fino a un minuto» (`VariantVetrina.tsx:259`) where the contract says ~120 s (line 279). The stages stall on «Aggiorno i dati…» after 1.6 s. |
| 3 | valid | `SettingsPage.tsx:216-236` refuses to reseed while a field is dirty or focused, so a sync's response never reaches a dirty section, and the next PATCH (which now accepts these fields) reverts the import. The SaveBar sits at `z-30` (`SaveBar.tsx:382`), the same as the scrim (`proto.css:259`), and comes later in the DOM. Same mechanism as GT LS-14. |
| 4 | valid | (a) `dismiss` is refused while busy. (b) The linger timer's `connect-success → connected` transition closes a reopened overlay (`machine.ts:201-210`). (c) Width and left are written only in `promote` (`ExpandCard.tsx:130-132`), and the ResizeObserver updates only height and top. These match GT LS-11, LS-9 and LS-2. |
| 5 | valid | The contract's `isConnected = linkedin_url !== null` (§2.1) plus a free-text writer means an unsynced URL reads as connected. `company/api/types.ts` has `linkedin_url` but no `linkedin_sync_date`. The public page's LinkedIn button reads `linkedin_url` (`identity-card.tsx:38-40`), so «I dati importati restano» understates what a disconnect hides. The status line is `truncate`d (`VariantVetrina.tsx:109`), and shot 31 shows the date cut at 320. |
| 6 | valid | The real page derives `canEdit: false` for `role`, `plan`, `solo_freelancer` and `pending` (`access.ts:61-84`) and shows a read-only notice for the first three. The sync endpoint requires `company.settings`. The prototype's «any viewer is an admin» is a declared fake, but left unspecified it becomes a dead-end CTA for members. |

### Already broken

| item | judgement | reason |
|---|---|---|
| Stale contract table | doubtful | Accurate: contract §2.3 (line 187) still lists `linkedin_url` as written «solo sync LinkedIn», while `IMPLEMENTATION-NOTES.md:22` says PATCH now accepts and persists it. But it is documentation drift that only a spec writer sees. It is not user-observable. |
| Two writers for one column | valid | `LinksSection.tsx:279-307` writes `linkedin_url` from a free-text `<Input>`. Under the contract's definition, a typed URL would show as «Collegato» with no sync behind it. It is latent until the card ships, but it is the direct cause of #1 and #5 on this page. |
| No notion of outside writes | valid | The reseed guard (`SettingsPage.tsx:216-236`) and `useLeaveGuard.ts:34` (`dirtyKeys().length > 0`) know only the page's own Save. Any outside write, whether this sync or a second tab, is silently overwritten by the next Save. Derived from code, not run, as the review itself says. |
| No data for the last sync | valid | `IMPLEMENTATION-NOTES.md:55` records `linkedin_sync_date` as deliberately left out of the authenticated DTO, and the FE `Company` type lacks it. «Ultima sincronizzazione» and a sync-date-based «Collegato» have nothing to read. |

Totals: 9 valid, 1 doubtful, 0 invalid (decisions: 6 valid; already broken: 3 valid, 1 doubtful).
