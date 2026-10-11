# New-review score — linkedin-sync

Document: `review-ls.md` (UX review of the linkedin-sync prototype, winner `VariantVetrina.tsx`). Ground truth: `gt-ls.md` (LS-1…LS-15, N = 15).
Conventions, the same as the baseline scorer's: a bundled defect is a hit when most of its sub-failures are covered, otherwise partial. A defect named exactly but explicitly dismissed is partial. Findings = decisions + mechanical fixes + already-broken items. A runtime claim is unsupported only when it cites no observation (trace step, screenshot, axe rule, matrix cell) and no code location. Quotes are exact.

1.

| GT ID | verdict | quote + section |
|---|---|---|
| LS-1 | partial | «Cap the expanded card at viewport − 32px and let the face scroll inside it» — Prototype changes, M3 row. M3 under Mechanical fixes adds «After a scroll the actions sit at y=352–392 in a 256px viewport». [The closest item: the card runs past the viewport bottom. The document blames height and the scroll lock, not in-place placement, and its fix caps height without saying where the card opens. A card that opens at a low row would still sit against the bottom.] |
| LS-2 | partial | «Cap the expanded card at viewport − 32px» — Prototype changes, M3 row. Manual checks adds «Desktop Chrome at 400% zoom. Check that both actions can be reached on every face». [Same element and the same viewport-fit concern, but nothing covers resize or rotation while the card is open, and the cap is on height, not width or left. Borderline partial vs. miss.] |
| LS-3 | hit | «move focus to the first control of the face on open» and «Tab and Shift+Tab wrap inside the card» — Prototype changes, M1/M2/M5 row. M2 also reports «Focus drops to `<body>` … opening the hub». |
| LS-4 | hit | «Every close (Escape, ×, Annulla, success, disconnect) returns focus to the row button» — Prototype changes, M1/M2/M5 row |
| LS-5 | miss | — [«scrim» appears only in M1, about Tab reaching a control under it. Scrim fade and reduced motion are not mentioned.] |
| LS-6 | miss | — [Nothing covers header height or the hub→warning/confirm face transition.] |
| LS-7 | miss | — [M1's «with no visible ring» is about "Da remoto" behind the scrim, not clipped confirm-button rings.] |
| LS-8 | miss | — [M6's «inside the leaving view» is a double-fire of the confirm button, not reopening during the ~400ms return trip.] |
| LS-9 | miss | — [The success linger is only described («The only confirmation is a 950ms badge, then the card closes», Persona situations), the same thing the baseline scored as a miss. D3's trace (close ignored during connecting, `machine.ts:220-225`) is adjacent but covers a different stage, and nothing covers close-and-reopen inside the linger.] |
| LS-10 | hit | «never "non riuscito"» — Decisions #2. The timeout copy is «l'aggiornamento potrebbe arrivare comunque», backed by «a timed-out scrape may have succeeded». Open question 1 also covers it. |
| LS-11 | partial | «× and Escape collapse the card to its row» — Decisions #3. [This makes the sync wait closable. A hung disconnect, a hung «Salva prima» save or re-read, and the archived-company retry loop are not covered. D2's «at least one exit» applies only to failure faces. Fewer than half of the sub-failures are covered.] |
| LS-12 | partial | «an in-card failure face with non-blaming copy, "Riprova" and "Chiudi"» — Decisions #2. [400 gets its own face, but no 400 copy is given. 404 (closes silently) and 401 (wrong blame) are not listed. Nothing covers re-announcing a repeated failure. At most 1 of 4 sub-failures is covered.] |
| LS-13 | partial | «After a 429, closing and reopening still offers no retry» — Decisions #2 (acceptance criterion). [Same 429 memory, but nothing covers the 429 reason shown on the disconnect confirm with Scollega enabled, or the memory being lost on a workspace switch.] |
| LS-14 | partial | «the next Save writes the user's values over LinkedIn's» — Decisions #5 (evidence), with the requirement «the primary button is disabled» while the Save bar is dirty. [Same overwrite failure through Save, prevented for edits made before the sync. Nothing covers the leave dialog or «Salva ed esci», edits made during the wait (D3 lets the card collapse to the row and the page stay usable), or the uncertain timeout state. 1 of 2 states. Borderline partial vs. hit.] |
| LS-15 | partial | «Hai modifiche non salvate: salvale o annullale prima di sincronizzare» — Decisions #5. [It places the hold message on the card's faces. There is no discard count in the leave dialog, no SaveBar live-region rule, and no rule for where a «Salva prima» error appears.] |

2. strict recall = 3 / 15 = 0.20; lenient recall = (3 + 0.5 × 7) / 15 = 6.5 / 15 = 0.43

   Sensitivity: LS-14 as a hit gives 4/15 = 0.27 strict and 7/15 = 0.47 lenient. LS-2 as a miss gives 6/15 = 0.40 lenient. Baseline FLOW.md for comparison: strict 0.27, lenient 0.53.

3.
- lines: 69
- findings: 18 (decisions D1–D6 = 6, mechanical fixes M1–M9 = 9, already-broken items = 3). The Prototype changes rows only point to existing items. The 5 "misread" rows and the persona copy note («"Sincronizzazione" is integration jargon», with a default) are not counted.
- open questions: 2, both with a recommended default (2/2)
- decisions with default and acceptance criterion: 6 / 6 (every row has a non-empty "Recommended default" and "Acceptance criterion")
- runtime claims without evidence: 6. Each states current UI behaviour and cites no trace, screenshot, axe rule, matrix cell or code location:
  - M2: focus drops to `<body>` on «Annulla on the warning». The only citation in M2, `VariantVetrina.tsx:154-202`, belongs to the hub-open case.
  - M2: focus drops to `<body>` «after each confirm button unmounts»
  - M2: focus drops to `<body>` «after every close (Escape, Annulla, success, disconnect)»
  - Persona situations: «The only confirmation is a 950ms badge, then the card closes.»
  - Manual checks: «The success text clears after about 950ms». This is the same timer as the line above.
  - Persona situations, Hand-off: «There is no undo.» This one is borderline, because it can be read as a product or backend fact.

  Grouping M2 as one claim, counting the two 950ms lines once and dropping "no undo" gives 3. Excluded as cited: M1 (screenshot + `ExpandCard.tsx:205-210`), M3 (screenshot + code), M4 and M9 (axe rules), M5 and M6 (trace), M7 (`machine.ts:63-78`), M8 (snapshot ref e20 + code), the D3 trace, the state-matrix 375 truncation (`connected-375-light.png`), and the Verdict line (a summary of cited items).

4. Findings in the document that are not in the ground truth but look like real, user-observable problems:
- D1: connect never shows or asks for the LinkedIn URL (`machine.ts:12` hardcodes it). The contract returns 400 with no URL, and two controls (card and Links) would write `linkedin_url`.
- D4: the overwrite warning names 5 of the 10 overwritten fields, and does not warn that a hand-uploaded logo or cover will be replaced. Disconnect hides that the public LinkedIn button disappears.
- M6: the confirm button stays focused and enabled in the leaving view, so a second Enter fires the paid sync call again (trace).
- M5: the disconnect confirm autofocuses the destructive «Scollega» (trace).
- M4: the expanded `role=dialog` has no accessible name (axe `aria-dialog-name`, serious).

5. Validity (provisional, for the maintainer to confirm). Each item is judged only on whether it is a real, user-observable problem on this surface.

| Item | Validity | Reason |
|---|---|---|
| D1 (P0) URL ownership / where connect gets the URL | valid | The screenshot shows no URL or input, the URL is hardcoded, the contract 400s without a URL, and two controls would write the same field. The user cannot tell which page will be read. |
| D2 (P0) failure faces for 502 / timeout / 429 / 400 / 403 | valid | The prototype only succeeds, and every one of these statuses is in the real endpoint's contract. Without failure faces the user gets no outcome or a wrong one. |
| D3 (P1) what the user can do during a wait of up to 120s | valid | The trace shows Escape and × ignored during connecting for up to ~2 min, and the copy says «fino a un minuto». |
| D4 (P1) copy names fewer fields than sync overwrites; disconnect hides the public button | valid | The contract overwrites 10 fields, including hand-uploaded logo and cover, while the UI names 5 (3 on the row). The user loses data with no warning. |
| D5 (P1) syncing with unsaved page edits | valid | Code-cited: the page refuses to re-seed while dirty and Save sends dirty keys, so the fields stay stale and the next Save silently reverts the import. |
| D6 (P1) who may connect / sync / disconnect | valid | The page is read-only for members, but the card would stay actionable and the backend requires `company.settings`, so a member hits controls that 403. |
| Already broken: legacy records (URL only in `social_media.linkedin`) | valid | The data state is code-cited, and the card as designed would read «Non collegato» two cards above a visible LinkedIn URL. It shows up only once the card ships, and it overlaps D1. |
| Already broken: unconfirmed disconnect by blanking the Links field | doubtful | Today, clearing a link field and losing the button is what the user asked for. It becomes a defect only under the sync model, and D1 (moving the input into the card) already removes it. |
| Already broken: silent 200 on PATCH outside the allowlist | invalid | The behaviour is real per contract §2.3, but `linkedin_url` is in the allowlist, so nothing fails for the user on this surface today. It is a latent regression risk for a PATCH-based disconnect, not a broken behaviour. |

Counts: decisions 6 valid, 0 doubtful, 0 invalid. Already-broken 1 valid, 1 doubtful, 1 invalid. Total 7 valid, 1 doubtful, 1 invalid.
