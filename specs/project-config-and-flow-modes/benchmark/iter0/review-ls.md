## Moment: prototype review — http://localhost:3101/prototypes/linkedin-sync (winner `VariantVetrina.tsx`; it will live at `/profile/company/settings`)
What I read: `brain/personas.md`, `brain/domains/company/company.md` with `concepts/linkedin-company-import.md`, `brain/raw/reference/company-api-contract.md`, the root `CLAUDE.md`, and the real `src/domains/company/settings-page/`. There is no `brain/chore/ux-review.md`, so nothing is suppressed. Only the light theme ships (nothing in `src/` sets `data-kb-theme`), so there was no dark pass. axe 4.10.2 was injected from cdnjs because no local axe-core is installed. Screenshots are in `scratchpad/shots-ls/`.

## Verdict: iterate — the direction holds, but the overlay does not work as a modal for keyboard or zoom users, and connect never says which page it will read.

## Prototype changes
| Finding | Change | How to check it on screen |
|---|---|---|
| M1, M2, M5 | In `ExpandCard`, move focus to the first control of the face on open and on every face change ("Annulla" on the disconnect confirm). Tab and Shift+Tab wrap inside the card (`inert` on everything outside it). Every close (Escape, ×, Annulla, success, disconnect) returns focus to the row button | From the hub, Tab ×6 never reaches "Da remoto". After Escape, after Annulla and after the success badge, `snapshot -i` shows the row button focused |
| M3 | Cap the expanded card at viewport − 32px and let the face scroll inside it | At 320×256, scrolling inside the card brings "Collega ora" fully into view |
| D1 | The explain face gets a "Pagina LinkedIn" URL field above the chips: prefilled from `seedLinkedinUrl`, validated with `validateLinkedInCompanyUrl`, "Collega ora" disabled until valid | The 375×812 screenshot shows the field, the chips and both buttons inside the card. An `/in/` URL shows the personal-profile error and does not start the progress face |

## Decisions
| # | P | Decision needed | Recommended default | Acceptance criterion | Evidence |
|---|---|---|---|---|---|
| 1 | P0 | Which control owns `linkedin_url`, and where connect gets the URL | The sync card owns it. Connect asks for the URL (change 3), the `linkedin_url` input leaves `LinksSection`, and the card enters `SECTION_IDS` before `links` so AnchorNav lists it | Exactly one control on the page writes `linkedin_url`. A URL with `linkedin_sync_date` null reads "Collegato · mai sincronizzato" | `explain-1280-light.png`: no URL and no input. `machine.ts:12` hardcodes the URL. Contract §3.2: an empty body with no URL returns 400 `NO_LINKEDIN_URL_CONNECTED`. Contract §2.1: connected means `linkedin_url !== null`, a column `LinksSection.tsx:284-305` already writes (blank becomes `null`, `social-media.ts:90-94`) |
| 2 | P0 | Failure faces for 502, 125s timeout, 429, 400 and 403 | Reuse the onboarding taxonomy: an in-card failure face with non-blaming copy, "Riprova" and "Chiudi". On 429: "Troppe richieste in questo momento. Riprova tra qualche minuto", no retry for the 15-min window, never "il tuo limite". On timeout: "Ci sta mettendo più del previsto: l'aggiornamento potrebbe arrivare comunque", never "non riuscito" | Each forced status shows its own face with at least one exit. After a 429, closing and reopening still offers no retry. "Ultima sincronizzazione" changes only on a 200 | `machine.ts:88-112`: every path succeeds, and there is no failure phase (`:26-36`). Concept page: the 10/15-min per-IP budget is shared with `/linkedin/fetch`, and a timed-out scrape may have succeeded |
| 3 | P1 | What the user can do during a wait of up to 120s | × and Escape collapse the card to its row, which reads "Sincronizzazione in corso…". The result lands on the row and in the live region. One honest line, "Può richiedere fino a due minuti", replaces the timed stage messages | During progress, Escape returns to the row. On completion the row shows the new date and the live region says "Dati aggiornati da LinkedIn" | Trace: during connecting, Escape plus a click on × left `mode=overlay` and the stage kept advancing (`machine.ts:220-225`). `VariantVetrina.tsx:259` says "fino a un minuto". `machine.ts:159-184` advances the messages on an 800ms timer, not on real progress |
| 4 | P1 | The copy names fewer fields than sync overwrites, and hides what disconnect removes | Warning and explain: "Nome, logo, copertina, descrizione, sito, settore, dimensione, anno di fondazione e sedi verranno sostituiti con quelli della pagina LinkedIn, anche logo e copertina caricati a mano. I campi che LinkedIn non mostra restano come sono." Disconnect: "Il pulsante LinkedIn sparisce dalla tua pagina pubblica. I dati già importati restano." | Every field in contract §3.2's "Sovrascritti" column is named on both faces. The disconnect face names the public button | `VariantVetrina.tsx:48,63,320-322,336-337` name 5 fields (the row names 3). §3.2 lists 10, including `industry`, which is the "Settore" field visible above the dialog in `warning-1280-light.png`. The public CTA reads `linkedin_url` (`identity-card.tsx:38-40,146`) |
| 5 | P1 | Syncing while the page has unsaved edits | While the Save bar is dirty, explain and warning say "Hai modifiche non salvate: salvale o annullale prima di sincronizzare" and the primary button is disabled. After a 200 the sections re-seed from the response | Edit "Chi siamo", then Gestisci → Risincronizza: "Sovrascrivi" is disabled with the message. After a sync, Identity, About and Cover show the synced values without a reload | `SettingsPage.tsx:216-236` refuses to re-seed while the page is dirty, focused or saving. `store.ts:266-306` sends dirty keys, so the screen stays stale and the next Save writes the user's values over LinkedIn's |
| 6 | P1 | Who may connect, sync or disconnect | The card follows `deriveAccess` (`access.ts:61-80`). When `canEdit` is false, the card shows status only: the row is not a button and has no pill. While `pending`, the same until resolved | As a `member`, the snapshot shows the status text and no button for the card | The brief says there is no permission model. §3.2 requires `company.settings`. The page is already read-only for role, plan and solo workspaces (`SettingsPage.tsx:333-349`) |

## Mechanical fixes
- **M1** Focus escapes the modal. From "Collega ora", Tab lands on "Da remoto" under the scrim with no visible ring (`explain-1280-tab-escapes.png`), and Space toggled it (`aria-pressed` false→true) with the dialog open. `ExpandCard.tsx:205-210` inerts only the collapsed face.
- **M2** Focus drops to `<body>` in all of these cases: opening the hub (no autofocus, `VariantVetrina.tsx:154-202`); Annulla on the warning; after each confirm button unmounts; after every close (Escape, Annulla, success, disconnect).
- **M3** Reflow fails at 320×256. After a scroll the actions sit at y=352–392 in a 256px viewport, because page scroll is locked and the card is `position:fixed; overflow:hidden` (`ExpandCard.tsx:96-109`, `explain-320x256-after-scroll.png`).
- **M4** axe `aria-dialog-name` (serious): `.xcard-face-expanded` has `role=dialog` and no name (`ExpandCard.tsx:238-239`). Fix: `aria-labelledby` pointing at the face title.
- **M5** The disconnect confirm autofocuses the destructive "Scollega" (trace). Fix: focus "Annulla", and give the warning and confirm faces `role="alertdialog"` with `aria-describedby` on the body.
- **M6** After Enter, the confirm button stays focused and enabled inside the leaving view (trace: focus on "Collega ora", `disabled:false`, inside `[data-leaving]`). A second Enter fires the paid call again. Fix: disable the button on press.
- **M7** Disconnect completion is not announced: the live region goes from "Scollego la pagina LinkedIn" to "" (`machine.ts:63-78`). Fix: announce "Pagina LinkedIn scollegata".
- **M8** The row button's accessible name runs words together: "…Non collegatoImporta nome…" (snapshot ref e20). The cause is the `aria-hidden` " · " at `VariantVetrina.tsx:72-73`. Fix: an sr-only ", ".
- **M9** axe `color-contrast`: the primary fill (#f8fafc on #1e77eb) is 4.1:1 at 14px, on the "Collega" pill (`VariantVetrina.tsx:115-123`) and on "Collega ora". This is the design-system primary token, so it goes to the token's owner rather than being patched in this card.

## State matrix
| Region | empty | loading | error | partial | long | no permission | offline |
|---|---|---|---|---|---|---|---|
| Row status | present ("Non collegato") | not reachable | not reachable | missing: a URL that was never synced, or a URL only in legacy `social_media.linkedin` | present, but at 375 it truncates to "linkedin.com/company/…" and hides the last sync (`connected-375-light.png`) | missing | not reachable |
| Connect | missing (no URL field) | present (progress face) | missing | not reachable | not reachable | missing | not reachable |
| Re-sync | — | present | missing (429 from the shared budget) | not reachable | — | missing | not reachable |
| Disconnect | — | present | missing | — | — | missing | not reachable |

## Persona situations
- **Small-business admin (not a recruiting expert), company created on the manual path, on a phone, logo uploaded by hand.** At "Collega", nothing says which page will be read, so they cannot tell whether the control does what they want (D1). The chips say "Nome e logo", but nothing warns that the hand-made logo will be replaced (D4). The only confirmation is a 950ms badge, then the card closes. On the real page, the fields above would also not change while anything is unsaved (D5). "Sincronizzazione" is integration jargon. Default: keep the title, and lead the empty-state line with the verb: "Importa nome, logo e altri dati dalla pagina LinkedIn dell'azienda".
- **Recruiter or agency admin on an office network.** Colleagues onboarding companies share the per-IP budget, so "Risincronizza" can return 429 without anything they did (D2).
- **Non-admin member.** The prototype lets them run the whole flow, while the real page is read-only for them (D6).
- **Hand-off.** An admin's sync or disconnect rewrites the public company page that freelancers and potential freelancers see, including the LinkedIn button (`identity-card.tsx:146`). There is no undo.

## Already broken around the surface
- **Legacy records.** When a company's URL lives only in `social_media.linkedin`, the Links field shows it (`social-media.ts:73-79`), but `linkedin_url` is null. The card would read "Non collegato" two cards above that URL.
- **Unconfirmed disconnect today.** Blanking the Links LinkedIn field and saving sends `linkedin_url: null` (`LinksSection.tsx:284-305`). That disconnects with no confirmation and removes the public button.
- **Silent 200 on PATCH.** `PATCH /company` drops fields outside its allowlist and still answers 200 (contract §2.3). A PATCH-based disconnect works only while `linkedin_url` stays in the allowlist (edit-area AC 22).

## Where the spec will be misread
| Phrase | Misread as | Fix |
|---|---|---|
| "`/company/settings`" | a new route | the page is `/profile/company/settings` (`AppRouter.tsx:529-545`) |
| "the real `POST /company/linkedin/fetch`" | settings calls the onboarding prefill | settings uses `POST /company/:companyId/linkedin/sync`, which writes the DB and needs `company.settings` |
| "disconnect" | a new endpoint, or deleting the imported data | there is no disconnect endpoint: it is `PATCH linkedin_url: null`. The imported fields stay and the public button goes |
| "connected" | a client flag | `linkedin_url !== null`. "Never synced" means a URL is set and `linkedin_sync_date` is null |
| "overwrite warning" | reusing the prototype's 5 fields | the list is the 10 fields in §3.2, with hand-uploaded logo and cover included |

## Manual checks still needed
- **Screen readers.** With VoiceOver and Safari (macOS), then NVDA and Firefox: Tab to the row and activate it. The dialog should be announced by its name (after M4). Activate "Collega ora": "Importo i dati da LinkedIn" and then "Pagina LinkedIn collegata" should each be spoken once. The success text clears after about 950ms, so check it is not cut off. Repeat for disconnect after M7.
- **iOS Safari on a real 375 device, after change 3.** Focus the URL field and check that the field and "Collega ora" stay visible above the on-screen keyboard.
- **Desktop Chrome at 400% zoom.** Check that both actions can be reached on every face (after M3).

## Open questions
1. Does the backend finish a sync after the client closes or aborts the request? D3 depends on it. Default: yes, and the row reads `linkedin_sync_date` on the next load.
2. Should the first "Collega" overwrite hand-edited data the way re-sync does, or only fill empty fields? Default: the same overwrite as re-sync, since the contract has one endpoint for both, and the explain face names the fields (D4).
