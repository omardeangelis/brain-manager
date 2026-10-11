# Baseline score — suggested-skills

Document: `442aeea4:brain/specs/freelance/suggested-skills/FLOW.md` (old FLOW.md at the prototype commit). Ground truth: `gt-ss.md` (SS-1…SS-14, N = 14).
Convention for "evidence": a claim counts as cited when it names a code identifier, file, class or function as its basis. Quotes are exact, with line breaks joined.

1.

| GT ID | verdict | quote + section |
|---|---|---|
| SS-1 | partial | «può scendere a zero chip e mostrare solo «+38»» — Edge cases, EC-SK9 (and P10). [Same compact preview and «+N» on narrow cards, but a different failure (zero chips). Nothing says «+N» wraps to a 3rd row at 270–343px.] |
| SS-2 | hit | «Alla chiusura il focus torna su chi ha aperto il modale.» — Proposte per SPEC.md, P9 (also EC-SK13, «Non va mai sul `body`») |
| SS-3 | partial | «Esc e lo scrim sono gesti facili da sbagliare» — Edge cases, EC-SK11. [About unsaved draft decisions on close. Nothing covers typed text not yet confirmed in the input being dropped by Esc, outside click or Salva.] |
| SS-4 | hit | «Dopo un guasto a metà la conferma dice cosa resta già salvato.» — Open questions, OQ3 (also P2, EC-SK11). [The uncertain/timeout half is covered only indirectly: P3 treats a timeout as a network failure.] |
| SS-5 | partial | «si chiede conferma solo se la bozza è modificata, e da ✕, Esc o scrim» — Open questions, OQ3. [Limits the close question to ✕/Esc/scrim. No back or route-change guard. P3 blocks only modal close during save.] |
| SS-6 | partial | «Il messaggio del BE smentisce il 29/30 a schermo, e riprovare darebbe di nuovo 409» — Error paths, EN-SK7. [Same save-error surface, but EN-SK1/EN-SK2 keep «come oggi», and P4 even keeps the backend message visible. No rule on raw English text, «86400 secondi» or «Riprova più tardi» next to Riprova.] |
| SS-7 | partial | «Il focus passa alla chip successiva» — Happy path B, step 4. [Required only on the keyboard path. Nothing covers pointer clicks in Safari or macOS Firefox, where buttons do not take focus.] |
| SS-8 | hit | «Sugli schermi touch l'apertura non apre la tastiera.» — Proposte per SPEC.md, P8 (also EC-SK9). [The "after last ✕" trigger is not covered.] |
| SS-9 | partial | «Il focus sull'input apre la tastiera, che copre il box e «Salva».» — Edge cases, EC-SK9. [Salva hidden on mobile, but by the keyboard. Nothing covers the centered modal jumping on height change or the iOS toolbar. Borderline partial vs. miss.] |
| SS-10 | miss | — |
| SS-11 | miss | — |
| SS-12 | partial | «Sotto 30 il contatore è primario nella SPEC e grigio nel prototipo» — Proposte per SPEC.md, P11. [Raises the counter's color, but below 30. Nothing on the contrast of the 30/30 amber state. Borderline partial vs. miss.] |
| SS-13 | partial | «Ogni ＋, × e ↺ viene annunciato allo screen reader.» — Proposte per SPEC.md, P7. [Covers button actions only, not accepting a suggestion by typing (P5 makes typing an accept). FR-SK1 «non te le riproporremo» does cover the permanent-rejection cue, so half of the bundle is covered.] |
| SS-14 | partial | «Anche un salvataggio di soli rifiuti mostra il toast «Competenze aggiornate».» — Edge cases, EC-SK15. [The exact failure is identified, but filed as «Da sapere in QA, senza correzioni», so it names the failure with no usable requirement. On a detection-only reading this would be a hit.] |

2. strict recall = 3 / 14 = 0.21; lenient recall = (3 + 0.5 × 9) / 14 = 7.5 / 14 = 0.54

3.
- lines: 350
- findings: 32 (EN-SK1–EN-SK11 = 11, EC-SK1–EC-SK16 = 16, FR-SK1–FR-SK5 = 5). Not counted: 3 «Attrito rimosso» bullets, 4 «Regole che questo documento fissa» and 15 SPEC proposals P1–P15.
- open questions: 6 (OQ2, OQ3, OQ-SK1, OQ-SK2, OQ-SK3, OQ-SK4), all 6 with a recommended default. OQ-SK3's default is «Si accetta», OQ-SK4's is an event only if someone will read it. 4 are also marked «Deciso».
- decisions with default and acceptance criterion: n/a
- runtime claims without evidence: 14. The header states «senza nessuna misura nel browser». Each claim below is a fact about current or prototype UI with no source:
  - Entry points: card shown in every tab on desktop, only «overview» on mobile
  - D step 2: onboarding chip toggles «come oggi»
  - EC-SK9: input focus opens the keyboard, covering box and Salva
  - EC-SK10: user stays on `/profile` after save
  - EC-SK12: prototype disables Salva on first click
  - EC-SK13 ×3: focus falls on `body` after a failed save, on close when the opener is gone, and from the link
  - EC-SK15 ×2: reject-only toast; «rest api»/«restful api» take two slots
  - FR-SK2 ×2: disabled Salva never read; no cue where the skill landed
  - FR-SK5: accepted skill out of view
  - P11: counter grey in the prototype

  Excluded as code-cited: EC-SK1 `normalizeSkillName`, EC-SK2 `addTyped`, EC-SK8 `profileResponse.ts:37-40`, the EC-SK9 bullet on `CompactSkills`, EC-SK12 `onOpenChange`, EC-SK16 `Badge`.

4. Findings not in the ground truth that look like real, user-observable problems:
- EN-SK9: `updateProfileV2` has no wait cap. With the modal locked during save (S5.7/P3), a write that never answers traps the user in the modal.
- EC-SK12: Esc still closes the modal mid-save and the write sequence continues headless. A second sequence gives a 409 and duplicate confirmations.
- EN-SK5: pressing Salva again after a mid-sequence failure resends the old PATCH and permanently deletes confirmations that had succeeded. This may fall under the GT's dropped "PATCH bookkeeping".
- FR-SK2: a `disabled` Salva leaves the Tab order, so screen-reader users never hear «Rimuovine 1 per salvare».
- EC-SK16: onboarding suggestion chips are `<div onClick>` and cannot be reached by keyboard. The document flags this as out of scope.
