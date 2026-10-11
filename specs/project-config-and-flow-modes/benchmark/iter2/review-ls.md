## Moment: prototype review — http://localhost:3101/prototypes/linkedin-sync (winner VariantVetrina «Vetrina» + «Timbro»)
## Verdict: proceed with decisions — the direction holds. Each gap below depends on the backend contract or on the real settings page, so none of them can be shown on the fake state machine. The spec has to carry them.

## Decisions
| # | P | Decision needed | Recommended default | Acceptance criterion | Evidence |
|---|---|---|---|---|---|
| 1 | P0 | A sync on a page with unsaved edits loses work silently (often × data). Save sends only the dirty keys and the page refuses to refresh while anything is dirty. Two results: the next Save reverts the synced fields, and fields the person did not edit keep showing their pre-sync values. | When the page has unsaved edits, the explanation or warning says so by section ("Hai modifiche non salvate in Identità e Chi siamo") and the primary becomes «Salva e sincronizza». It saves first, syncs only if the save succeeds, and otherwise stops on the save error. The Save bar is inert while a sync runs. On success every field reloads from the returned company. | Edit «Chi siamo», don't save, start a re-sync. The card names «Chi siamo». Confirm: the edit is saved, then the sync runs. Afterwards every field shows the LinkedIn values, the Save bar is gone, and pressing Save sends nothing. | code: `form-store/store.ts:291-307` (only dirty keys leave); `SettingsPage.tsx:216-226` (no re-seed while dirty); `SaveBar.tsx:382` z-30 + pointer-events-auto, the same layer as the scrim (`proto.css:256-259`). The harness has no Save bar, so this is not reachable there. |
| 2 | P0 | The prototype only knows success, but the real sync has 7 other outcomes and one of them is uncertain (often × task/confidence). | The card stays open and the error takes the header, using the same layout as the warning. **502**: «Non siamo riusciti a leggere la pagina LinkedIn. Non abbiamo cambiato nulla.», with focus on «Riprova» and «Chiudi» beside it. **500/other**: «Qualcosa non ha funzionato. Riprova tra poco.» + Riprova. **429**: «Troppe richieste da questa rete in questo momento. Riprova tra 15 minuti.», no Riprova. **403**: «Solo un amministratore può collegare LinkedIn.» **Timeout or dropped connection**: re-read the company. If the sync date moved, show the normal success; if not: «Non sappiamo ancora se l'aggiornamento è andato a buon fine. Ricarica la pagina tra qualche minuto.» Never say "non riuscito". | Force each status on the sync. 502: the card stays open on the message, the tile is unchanged, Riprova has focus. 429: no retry anywhere. Timeout: no failure wording; a re-read showing a new date gives the success state. | contract `company-api-contract.md:292-342` (errors table, 120 s, 10 req/15 min per IP); `onboarding/api/types.ts:36-38` (a timeout "may well have succeeded"); `machine.ts:88-112` always succeeds. |
| 3 | P0 | Connect needs a page address and the prototype never asks for one. The explanation never shows which page will be read, and "connected" is undefined for real records. | The explanation step gets one field, «Indirizzo della pagina LinkedIn», prefilled from the company's saved address and checked with the existing company-page rule. The card **replaces** the «Pagina LinkedIn» field in «Collegamenti» so the column has one place to write it. **Collegato = `linkedin_sync_date` is set.** An address with no date shows «Non collegato», with the address prefilled. The spec requires `linkedin_sync_date` on `GET /company/profile/:id`. | On a company with a hand-typed address and no sync date, the row reads «Non collegato» and opening it shows that address. A `/in/` address shows the field error and does not start. A connected row shows a real date, e.g. «Ultima sincronizzazione: 6 ott, 14:32». | screenshot `02-explain.png` (no address anywhere); contract :302, :337 (`NO_LINKEDIN_URL_CONNECTED`), :134 (`isConnected = linkedin_url !== null`); `LinksSection.tsx:262-297` + `form-store/types.ts:54` (the URL is written by hand); `company/api/types.ts:55-63` (no sync date). |
| 4 | P1 | Connecting overwrites a hand-uploaded logo or cover, and the name, without the warning that re-sync gets. The three field lists also disagree with each other and with the contract (often × data). | One list, everywhere: «Nome, logo, copertina, descrizione, sito, settore, dimensioni, anno di fondazione e sedi». Connect: «Questi campi verranno sostituiti con i dati di LinkedIn, anche se li hai modificati a mano. Saranno subito visibili ai candidati.», with the primary «Collega e importa». The warning uses the same sentence. Hub subtitle: «Sostituisce nome, logo e gli altri campi con i dati attuali di LinkedIn». | Every list on screen names the fields in contract §3.2. The connect step says hand-made changes are replaced and are public immediately. | `VariantVetrina.tsx:63` (status: nome, logo, descrizione), `:48` (chips: 4 items), `:318-322` (warning: 5), `:172`; contract :320-330 (10 fields; logo and cover replaced even if uploaded by hand). |
| 5 | P1 | During a wait of up to 2 minutes the person cannot leave: ×, Escape and outside click do nothing, with no feedback, and page scroll is locked. A reload loses the outcome without asking (often × time). | Closing during the wait is allowed. The sync keeps running, and the row reads «Aggiornamento da LinkedIn in corso…» until the outcome lands on the row and is announced. A sync in flight counts as work for the leave guard. Wait copy: «Può richiedere fino a due minuti.» | Start a re-sync and press Escape. The card closes and the page scrolls. The row shows progress, then the new time or the error. Going back mid-sync asks first. | trace (eval, connecting): after Escape, × and scrim click the dialog is still open, focus is on BODY; `machine.ts:220-225`; `ExpandCard.tsx:67-72`; reload mid-connect → row shows «Non collegato · Collega» with no prompt; `useLeaveGuard.ts:34`; `VariantVetrina.tsx:259` («fino a un minuto») vs `linkedin.ts:24-30` (125 s). |
| 6 | P2 | Anyone can connect, re-sync or disconnect, but the page already knows who cannot edit (sometimes × time: a 2-minute wait that ends in a 403). | When `access().canEdit` is false (role, plan, solo_freelancer, pending), the row shows status only: it is not a button and has no pill. `pending` shows no reason. | As a non-admin, the row reads «Collegata · Ultima sincronizzazione …» and offers no action. | `access.ts` deriveAccess; contract :296 (`company.settings` permission); snapshot: the row is a button (`e20`) for every viewer. |

## Task accessibility fixes
- When the «Gestisci» hub opens, focus stays on BODY until the person presses Tab; move it into the card. (trace: `FOCUS BODY … DIALOG true`, then `Chiudi` only after Tab)
- Tab leaves the open card into the page behind: «Collega ora» → «Da remoto» → «Ibrido» → Instagram. Space on «Ibrido» toggled it off behind the scrim. Keep Tab inside the card. (`03-tab-escaped.png`; aria-pressed went all false)
- After «Collega ora», «Sovrascrivi» or «Scollega», focus drops to BODY for the whole wait. On close it does not return to the row, so the next Tab lands on «Da remoto». Return focus to the row button. (trace)
- Disconnect is never announced: the live region goes «Scollego la pagina LinkedIn» → "". Announce «Pagina LinkedIn scollegata». (trace)
- Activating the row during the ~380 ms close, programmatically as assistive tech does, loses the reopen. After that the row never opens again until reload. Pointer clicks in that window are swallowed instead (`proto.css:225-226`). A reopen during close should cancel the close. (eval: click × → click row at +150 ms → mode=rest, no dialog; another click at +800 ms → still none)

## Outcomes and states
| Action or region | Outcome or state | In the prototype | What the person sees → can do next | Evidence |
|---|---|---|---|---|
| Connect / re-sync | success | present | badge ~950 ms, card closes, row «…adesso». Page fields don't change → #1, and «adesso» never ages → #3 | trace 4251 ms LIVE «Pagina LinkedIn collegata» |
| | success, some fields not returned or an image not mirrored | not reachable | still success, but "verranno sostituiti" overpromises → #4 | contract :280, :330 |
| | slow (≤120 s) | present at 2.4 s, copy says 1 min | stuck in the modal → #5 | `VariantVetrina.tsx:259` |
| | timeout / dropped (uncertain) | missing | → #2 (re-read, never "failed") | `linkedin.ts:78-83` |
| | 502 / 500 / 429 / 403 / 404 | missing / not reachable | → #2 (404 uses the 500 copy) | contract :334-342 |
| | 400 bad URL / no URL on file | not reachable (no field) | → #3 | contract :336-337 |
| | 401 | not reachable | the interceptor refreshes; nothing on screen | `onboarding/api/types.ts:41-43` |
| Disconnect | success | present (0.9 s) | row turns grey, not announced → a11y fix | trace |
| | any real outcome | not reachable: there is no endpoint | → Open question 1 | contract §2.3 (`linkedin_sync_date` not writable) |
| Row | address with no sync date; read-only access | not reachable | → #3, #6 | above |

## Leaving and interrupting
| Where | What the person does | What happens to the input, the operation and its outcome | Evidence |
|---|---|---|---|
| Wait (connect / re-sync) | Escape, ×, click outside | nothing happens and nothing explains why; stuck for up to 120 s → #5 | eval trace |
| Wait | reload / back | no prompt; on return the row shows «Non collegato · Collega». The real server still writes, and the outcome is never seen → #5 | reload trace |
| Card open (explain) | resize the window to 375 (rotate or narrow it) | the card keeps its 840 px position: «Annulla», «Collega ora» and «Chiudi» end up at x 840-1035 on a 375 screen. Only Escape or an outside click gets out | `11-resized-open.png`; button rects |
| Page with unsaved edits | run a sync | the next Save reverts the synced fields → #1 | code |

## Persona situations + hand-offs
- **Small business admin, company created by hand with a logo they uploaded:** fails walkthrough Q3 at «Collega ora». Nothing says their logo will be replaced (#4). «dalla tua pagina pubblica» reads as the SeVedemo page that the «Vedi la pagina pubblica» button opens (`translations.json:1785`).
- **Recruiter / agency admin behind an office network:** the 10 req/15 min budget is per IP and shared with colleagues' onboarding imports, so the first try can return 429. The copy must speak of «questa rete», not "your limit" (#2).
- **Non-admin member, or unpaid plan:** #6.
- **Hand-off, onboarding → settings:** a company created through the LinkedIn import is born with a sync date (contract :85), so it reads «Collegata» from day one. That is only right if the date is real (#3).
- **Hand-off, admin A → admin B:** B has unsaved edits open while A syncs. B's page keeps the old values and B's Save reverts those fields. #1 covers only the person who syncs, so this is a known limit.
- **Hand-off → candidates:** the sync publishes immediately, without Save. The page subtitle promises the opposite (below).

## Already broken around the surface
- The «Pagina LinkedIn» field in Collegamenti writes `linkedin_url` by hand (`LinksSection.tsx:262-297`). By the contract's rule that makes the company "connected" without ever having been read → #3.
- The page's data source has no `linkedin_sync_date` (`company/api/types.ts:55-63`; `brain/tech-debt/company/company-edit-area-redesign.md:31`) → #3 needs a backend change first.
- The leave guard counts only unsaved fields (`useLeaveGuard.ts:34`) → #5.
- The page subtitle «Le modifiche diventano pubbliche quando salvi» (`translations.json:1783`) is false for the sync → #4.
- The closest shipped LinkedIn sync (freelance, `LinkedInSync.tsx:26-48`) shows the server's raw `msg` in toasts. The company 429 body is English (contract :341). Don't reuse `getErrorMessage`.

## Where the spec will be misread
| Phrase | How it will be misread | Fix |
|---|---|---|
| "collegato" | `linkedin_url !== null` (contract :134) | "has `linkedin_sync_date`" (#3) |
| "Scollega" | `PATCH linkedin_url: null` | that leaves the sync date set: name the endpoint (OQ 1) |
| "timeout" | an error state | uncertain: re-read before speaking (#2) |
| «Sovrascrive i campi importati» | only fields that came from LinkedIn | list the fields; hand edits are replaced too (#4) |
| "Annulla" in the wait | it stops the sync | the server still writes: «Chiudi», and the sync continues (#5) |

## Manual checks still needed
1. VoiceOver + Safari: Tab to the row and press Enter, both disconnected and connected. Note what is read when the card opens, and whether the card has a name.
2. Confirm «Collega ora» and wait. Check that «Importo i dati da LinkedIn» is read, and that «Pagina LinkedIn collegata» is read before the region clears about 950 ms later.
3. NVDA + Firefox browse mode: activate the row, press Escape, then activate the row again at once, then once more. Confirm it opens (repro of the stuck row).
4. Once the address field exists, at 375 × 812 with the on-screen keyboard open: «Collega e importa» is still reachable.

## Open questions
1. Does the backend have a company disconnect that clears **both** `linkedin_url` and `linkedin_sync_date`? The contract lists none, and `linkedin_sync_date` cannot be written by PATCH. Default: required, backend first; without it, v1 ships without «Scollega pagina».
2. Should the sync keep the per-IP budget it shares with onboarding imports? Default: yes for v1, with the copy in #2.
3. Do company admins skew Small business or Recruiter? `brain/personas.md` doesn't map personas to company roles. Default: write the copy for Small business (plain words).
