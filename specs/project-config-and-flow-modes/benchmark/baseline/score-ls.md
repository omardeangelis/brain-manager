# Baseline score — linkedin-sync

Document: `3adcff19:brain/specs/company/linkedin-sync/FLOW.md` (old FLOW.md at the prototype commit). Ground truth: `gt-ls.md` (LS-1…LS-15, N = 15).
Convention for "evidence": a claim counts as cited when it names a code identifier, file, class or function as its basis. Quotes are exact, with line breaks joined.

1.

| GT ID | verdict | quote + section |
|---|---|---|
| LS-1 | partial | «che la crescita "sul posto" non venga tagliata da un antenato con `transform` o `overflow`» — Open questions, OQ1. [Covers clipping of the in-place card, not vertical placement against the viewport bottom. The document prescribes "cresce sul posto", which is the cause.] |
| LS-2 | partial | «si ferma alla larghezza disponibile meno i margini» — Edge cases, EC16. [Caps the width at the viewport width but says nothing about resize or rotation while the card is open.] |
| LS-3 | hit | «il focus entra, non esce finché è aperta» — Edge cases, EC18 |
| LS-4 | hit | «e torna sulla riga alla chiusura» — Edge cases, EC18 |
| LS-5 | partial | «invece di viaggiare, i crossfade restano» — Edge cases, EC17. [Covers reduced motion for the card's opening and closing, but not the scrim fade. Borderline partial vs. miss.] |
| LS-6 | partial | «crossfade, le righe non si spostano» — Happy path, step 3. [Same element and same hub→warning transition, but no rule on header height or on syncing it with the frame animation.] |
| LS-7 | miss | — |
| LS-8 | miss | — [The return trip is described only as «si ricompone dov'era». No rule for reopening mid-close.] |
| LS-9 | miss | — [The success auto-close is described («Dopo un momento breve la card si richiude da sola»). Nothing covers a close and reopen inside the linger window.] |
| LS-10 | hit | «Il messaggio non deve quindi promettere che nulla è cambiato» — Error paths, EP7. EP8 adds «messaggio che dichiara l'incertezza». |
| LS-11 | partial | «Non è un timeout: la richiesta continua fino al tetto client» — Happy path, step 5 (and EP8, 125s cap). [Bounds only the sync request. Nothing covers a hung disconnect, «Salva prima» save or re-read. EP6 stops the archived-company retry only for a 404.] |
| LS-12 | partial | «Messaggio generico, card chiusa, nessun invito a riprovare» — Error paths, EP6. [Messages are given for 404 and 400 (EP5). 401 is not covered, and a repeated failure being re-announced is not covered beyond EC17's general aria-live.] |
| LS-13 | partial | «ricordarlo almeno per la vita della pagina, e mostrare l'azione come non disponibile con il motivo scritto» — Open questions, OQ6. [Same 429 memory, but life-of-page scope is what loses it on a workspace switch. Nothing covers the disconnect confirm with Scollega enabled.] |
| LS-14 | hit | «in quel dialogo «Salva ed esci» non deve essere offerto» — Edge cases, EC8. For the uncertain state, EP8 adds «la barra Salva resta bloccata» until the page is re-read. |
| LS-15 | partial | «aggiunge un esito d'errore (salvataggio fallito → il sync non parte)» — Open questions, OQ5. [Names the «Salva prima» error but not where it surfaces. EC7 makes the SaveBar inert. No discard count in the leave dialog and no rule for the SaveBar live region.] |

2. strict recall = 4 / 15 = 0.27; lenient recall = (4 + 0.5 × 8) / 15 = 8 / 15 = 0.53

3.
- lines: 509
- findings: 39 (EP1–EP12 = 12, EC1–EC19 = 19, F1–F8 = 8)
- open questions: 8 (OQ1–OQ8), 7 with a recommended default. OQ8 has none («Decidibile solo da prodotto»). OQ3's default is the EP8 proposal. The header marks all 8 as resolved.
- decisions with default and acceptance criterion: n/a
- runtime claims without evidence: 12, each stated as a fact about current UI with no source:
  - Happy path step 5: onboarding wait copy «sta impiegando più del solito»
  - EP2: onboarding promotes the fallback after two failures
  - EC5: SaveBar «invalid» blocks Salva
  - EC8: leave guard fires only when dirty
  - EC8: dirty dialog offers «Salva ed esci»
  - EC9: workspace switch unmounts the page and clears the cache
  - EC14: page shows no notice while `pending`
  - EC15: reason already declared at the top of the page
  - EC16: «cresce sul posto» stays readable on mobile because the row is full width
  - F6: the prototype's short list names four fields
  - OQ4: SaveBar already counts and names dirty sections
  - OQ6: onboarding import keeps the 429 for 15 minutes

  EC7 (SaveBar clickable over the z-30 scrim) is excluded because it is code-cited («Verificato a codice», z-30, `pointer-events-auto`).

4. Findings not in the ground truth that look like real, user-observable problems:
- EC3: `GET /company/profile/:profileId` omits `linkedin_sync_date`, so every company would read «Non collegato» until the field is added.
- EC7: the SaveBar shares z-30 with the scrim and renders later in the DOM, so Salva is clickable during the sync. Its PATCH races the import and can silently undo it.
- EC6: an in-flight logo or cover upload races the sync, which deletes the previous blob. Two writes hit the same column with an irreversible delete in between.
- EC10: with two tabs open on the same company, tab B's Salva silently reverts data just imported in tab A.
- EP11: a «Scollega» built as PATCH `linkedin_url: null` leaves `linkedin_sync_date` set. The company then has no URL but still reports a sync, a state the card cannot read.
