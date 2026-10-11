| ID | Defect | Where | Class | Source | Evidence at 24aacc0d | Sev |
|---|---|---|---|---|---|---|
| AS-1 | Only the name/% label (and 16px box) toggles; row padding/gap inert though the row highlights; ~20px touch target vs 40px claimed | mode, checkbox row | interaction/a11y target | de94cf64; IMPL-NOTES Fase 3 #1 | checkbox-row.tsx:29-41, :71-74; shell.tsx:36-38 | P1 |
| AS-2 | Focus ring around the 16px box only, not the row | mode, checkbox rows | a11y focus | tech-debt DS checkbox; de94cf64 | checkbox-row.tsx:45 | P2 |
| AS-3 | Accessible name runs together «Docker58%» (no separator / «delle ricerche») | checkbox name | a11y name | PLAN-FE FE16 (b) | checkbox-row.tsx:72-73; shell.tsx:160-167 | P2 |
| AS-4 | Tick SVG has <title>Selezionata</title>, not hidden → extra announcement | checked indicator | a11y | tech-debt; de94cf64 | checkbox-row.tsx:54-59 | P2 |
| AS-5 | Dead end after success: outcome line replaces the action, remaining gaps can't be added | action slot | interaction (strands) | PLAN-FE FE17; IMPL-NOTES | modo-selezione.tsx:42-43, :86-106 | P1 |
| AS-6 | Focus drops to body after «Aggiungi» (button unmounted, outcome line never focused) | confirm bar → outcome | a11y focus | de94cf64; IMPL-NOTES #2 | modo-selezione.tsx:129-133, :92-95 | P1 |
| AS-7 | No visible saving state; mode exits at once; open button live during save; re-entry swallows success | mode during save | missing-state/interaction | SPEC S9; de94cf64 | modo-selezione.tsx:129-133, :140, :107-113 | P1 |
| AS-8 | Failed save strands user: selection hidden, no retry in view, focus lost, stale error after reopening | action slot retry/over_cap | interaction/a11y | FE18 log; FE17 log | modo-selezione.tsx:129-133, :44-50, :157-159 | P1 |
| AS-9 | No outcome surface when the detached card is force-closed mid-save (resize); toast never renders | collapsed card | missing-state | de94cf64; tech-debt toast after resize | shell.tsx:371-393 (state never shown) | P1 |
| AS-10 | Room line always shown even with plenty of room (noise) | mode column top | copy | PLAN-FE FE16 DL19 | modo-selezione.tsx:61; checkbox-row.tsx:89-108 | P2 |
| AS-11 | Confirm button «Aggiungi» doesn't say what/how many; separate counter | confirm bar | copy | PLAN-FE FE17 | modo-selezione.tsx:119-123, :140-142 | P2 |
| AS-12 | No lead line «Seleziona quelle che hai davvero» in the mode | mode column top | copy/placement | de94cf64 add_skills.lead | LeadLine defined, never rendered | P2 |
| AS-13 | Contradictory copy after «Tetto cambiato» (room line says full vs error says 1 left), no guidance to untick | room + failure line | copy | PLAN-FE FE17 | shell.tsx:89-92; modo-selezione.tsx:35,:51,:136 | P2 |
| AS-14 | Only retry/over_cap failures designed; rate-limit, quota, rejected, timeout, already-present never designed | action slot outcomes | missing-state/copy | IMPL-NOTES wait split; de94cf64 seven outcomes | fixtures.ts:87; harness.tsx:40-44 | P2 |

Dropped: 12 (double toggle introduced by the implementation dd8a1c75, /simplify regression, 15s deadline/reread-before-PATCH, close/reopen losing mode already in prototype comment, fe-fase-1 REPORT rows = rate bell/Fido banner).
