| ID | Defect | Where | Class | Source | Evidence at 442aeea4 | Sev |
|---|---|---|---|---|---|---|
| SS-1 | «+N» chip wraps to a 3rd row at card widths 270–343px (~1% of profiles) | card compact preview | placement | REPORT MAJOR v2; 1ae965f3 | chips.tsx:57-72,96-101; page-shell.tsx:85 | P1 |
| SS-2 | Closing the modal leaves focus on body, not the opener | modal close → opener | a11y | REPORT MINOR v5; 49904d62 | skills-section.tsx:326-343; ui/dialog.tsx:46-52 | P1 |
| SS-3 | Typed-but-unconfirmed text silently lost (Esc/outside/Salva ignore it) | modal input + Salva | interaction | REPORT MINOR v3; 7da09004 | chips.tsx:259-263,309-314; skills-section.tsx:128-129,224,326-329 | P1 |
| SS-4 | Close question wrong/missing after partial or uncertain save | modal close confirmation | missing-state | REPORT MAJOR v3; 1ae965f3 | state never shown | P1 |
| SS-5 | Back/route change discards the modified draft with no question, even mid-save | modal vs navigation | interaction | REPORT MINOR v3 | no leave guard; skills-section.tsx:326-329 | P2 |
| SS-6 | Save-error copy: raw English errors, «86400 secondi», «Riprova più tardi» next to immediate Riprova | modal save-error notice | missing-state | aa0c968d; tech-debt D1/D2 | state never shown | P2 |
| SS-7 | Safari/macOS Firefox: clicking a chip ✕ doesn't move focus to the next ✕ | modal chip ✕ / suggestion buttons | a11y | REPORT MINOR v5 | focus.ts:17-18; chips.tsx:266-273; suggestions-box.tsx:38-43 | P2 |
| SS-8 | Touch devices: focus jumps into the input, virtual keyboard covers suggestions and Salva | modal open / after last ✕ | interaction | REPORT MINOR v5 | skills-section.tsx:336-341,139; chips.tsx:268-272 | P2 |
| SS-9 | Mobile: centered modal jumps on every height change; Salva can sit under iOS toolbar | modal on ~375px | placement | d6d35bbe; tech-debt O6 | ui/dialog.tsx:48; skills-section.tsx:188-217 | P2 |
| SS-10 | Modal ✕ announced in English and reached last in Tab order | modal close button | a11y | REPORT NIT v5 | ui/dialog.tsx:54-71 | P2 |
| SS-11 | «+N» accessible name doesn't contain visible «+28» (label in name) | card «+N» | a11y | REPORT NIT v2 | chips.tsx:113-115 | P2 |
| SS-12 | «30/30» counter amber-600 ~3:1, fails AA at 12px | n/30 counter | a11y | PLAN FE7 log 7da09004 | chips.tsx:213 | P2 |
| SS-13 | No announcement when accepting a suggestion by typing; × gives no cue rejection is permanent | suggestions box / input | a11y | IMPL-NOTES O4; REPORT NIT v4 | no aria-live; skills-section.tsx:107-115,102 | P2 |
| SS-14 | Reject-only save shows «Competenze aggiornate» toast though no skill changed | success toast | copy | IMPL-NOTES EC-SK15 | skills-section.tsx:162; fixtures.ts:30-33 | P2 |

Dropped: 46 (PATCH bookkeeping, hook/onboarding tests and mutants, cache invalidation, onboarding-only cap, Tab-without-Enter on the real field).
