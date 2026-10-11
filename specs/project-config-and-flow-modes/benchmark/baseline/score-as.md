# Baseline score — add-skills step (dashboard-feedback)

Document: `24aacc0d:brain/specs/freelance/dashboard-feedback/FLOW.md` (old FLOW.md at the prototype commit), scored as a whole. Ground truth: `gt-as.md` (AS-1…AS-14, N = 14), which covers only the add-skills step («Modo selezione»).
Convention for "evidence": a claim counts as cited when it names a code identifier, file, class or function as its basis. Quotes are exact, with line breaks joined.
The document describes checkboxes that are always present in the «Non sul tuo profilo» column. It has no separate "mode" with an open button, so mode-specific wording in the GT is matched to the equivalent step (happy path E).

1.

| GT ID | verdict | quote + section |
|---|---|---|
| AS-1 | partial | «Una riga larga quanto la colonna, con l'etichetta cliccabile, supera il minimo AA (24 px) a ~32 px. Decide il piano» — Friction notes, FR-FB7. [Same row target size. It suggests a full-width clickable row but defers the decision to the plan, so there is no requirement that row padding or gap toggles.] |
| AS-2 | miss | — [The only rule on the box is OQ-FB1's «un quadrato bordato». Nothing on the focus ring.] |
| AS-3 | miss | — [No rule on the checkbox accessible name. EC-FB27 covers only the reason a disabled box gives.] |
| AS-4 | miss | — |
| AS-5 | partial | «Resta finché il freelance non cambia la selezione o chiude.» — Emendamenti, E6. [Implies the action comes back on a new selection. It never states that remaining gaps stay addable after a success. Happy path E5 and EC-FB30 make the outcome line replace the action.] |
| AS-6 | hit | «la riga d'esito prende il posto dell'azione e riceve il fuoco» — Emendamenti, E6 (and EC-FB31 «Senza una regola, il fuoco cadrebbe su `<body>`») |
| AS-7 | hit | «L'azione diventa «Aggiungo al profilo…» e si disattiva. Anche le caselle si bloccano.» — Happy path E, step 4 (and E4: card not closable during save). [Requires a visible in-place saving state. With no exit during the save, re-entering cannot swallow the success.] |
| AS-8 | hit | «la selezione resta, la card resta aperta» — Error paths, EN-FB9. E6 adds «Se il salvataggio fallisce, il fuoco resta sull'azione», and EN-FB9 keeps the action as the retry. [Not covered: a stale error after reopening.] |
| AS-9 | hit | «Se la card si è chiusa durante il salvataggio, l'esito arriva come toast.» — Emendamenti, E6 (and EN-FB14: forced close when the width changes) |
| AS-10 | hit | «Solo se il tetto può scattare, segue «Puoi aggiungerne ancora {n}.»» — Happy path E, step 2 (and E8.2) |
| AS-11 | hit | «Sotto la colonna compare l'azione «Aggiungi 3 skill al profilo»» — Happy path E, step 3 (and EC-FB33: the count on the action updates) |
| AS-12 | hit | «In testa alla colonna c'è una riga sola: «Seleziona quelle che hai davvero per aggiungerle al profilo.»» — Happy path E, step 2 (and E9, FR-FB5) |
| AS-13 | partial | «Messaggio: «Nel frattempo il profilo è cambiato: ora puoi aggiungerne {n}.»» — Error paths, EN-FB7. [Same state, and the room line must update. But the two counts can still disagree: EC-FB27's room line counts after the selection, the message counts free slots. There is no explicit instruction to untick.] |
| AS-14 | hit | «Il fallimento ha tre forme» — Emendamenti, E5. EN-FB8 (already present), EN-FB10 (429 and daily quota), EN-FB11 (400 rejected) and EN-FB12 (timeout → re-read) design each missing outcome. |

2. strict recall = 8 / 14 = 0.57; lenient recall = (8 + 0.5 × 3) / 14 = 9.5 / 14 = 0.68

3.
- lines: 735 for the whole document
- findings: 62 for the whole document (EN-FB1–EN-FB15 = 15, EC-FB1–EC-FB36 = 36, FR-FB1–FR-FB11 = 11). 27 of these concern the add-skills step: EN-FB6–EN-FB15, EC-FB25–EC-FB36, and FR-FB1, FR-FB5, FR-FB6, FR-FB7, FR-FB11. Not counted, though they sit inside the friction section: 7 flow decisions, 11 rows of «Dove la SPEC rischia di essere letta male» and 23 amendments E1–E23.
- open questions: 6, 4 with a recommended default.
  - Own OQs: OQ-FB1 (default «due gruppi»). OQ-FB2 recommends «prima si misura» and gives no default between (a) and (b).
  - SPEC OQs it comments on: OQ3, OQ4 and OQ5 have defaults. OQ1 lists only the inputs it needs.
  - Only OQ-FB1 concerns the add-skills step.
- decisions with default and acceptance criterion: n/a
- runtime claims without evidence: 6, of which 2 concern add-skills (EC-FB36, EN-FB14). Each is a fact about current UI with no source:
  - EC-FB6: the link is announced as «Scopri l'offerta esclusiva… Si apre in una nuova scheda»
  - EC-FB7/E18: «Tu» is centered on the dot today and half the label leaves the track at 98%
  - EC-FB16: a rank label hides when it touches another, «regola di oggi»
  - EC-FB17: panel selection is an index and changes subject when a new appearance enters
  - EC-FB36: today the card has two Tab stops (✕ and CTA)
  - EN-FB14: with the card closed the page is no longer inert, «quindi il toast si vede e viene annunciato». GT AS-9 says the toast never renders.

  Estimates marked «stima» and code-cited claims are excluded. Code-cited examples: E6 `Toaster` in the inert subtree, EN-FB13 `matchProfile()`, EC-FB25 `refetchOnWindowFocus`, EC-FB5 `<img width={728} height={250}>`.

4. Findings not in the ground truth that look like real, user-observable problems (add-skills step):
- EN-FB13: after a successful add, a failed `/me` re-read makes the verdicts and checkboxes disappear (`matchProfile()` reads `isSuccess`). This now sits on the main path.
- E8/S7 and «Misure» 2: profiles with more than 30 skills get silently truncated by any PATCH (`boundSkillsCsv`).
- EC-FB32: adding «Go» also moves «MongoDB» and «Django» to «Sul tuo profilo», because substring matching runs both ways. More rows move than skills were added.
- FR-FB6: below `sm` with 15 gaps, the add action sits about 600px below where the user ticks.
- EC-FB25/E1: PATCH replaces the whole set from a stale `/me`, so a skill removed on another device comes back and one added in another tab disappears silently. Flag: the GT lists "reread-before-PATCH" among its dropped items.
