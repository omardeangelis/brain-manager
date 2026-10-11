| ID | Defect | Where | Class | Source | Evidence at 3adcff19 | Sev |
|---|---|---|---|---|---|---|
| LS-1 | Card opens "in place" pressed against the viewport bottom when the row is mid/low page | expanded card position | placement | 1d604af9 (D22, AC35) | VariantVetrina.tsx:368 placement in-place; ExpandCard.tsx:100-107 | P1 |
| LS-2 | Open card keeps opening width/left on resize/rotation → too narrow / off-screen | expanded card geometry | placement | REPORT r2 MINOR v7; c5ce04d3 | ExpandCard.tsx:79-93,130-132,193-199 | P1 |
| LS-3 | Opening the hub never moves focus into the aria-modal dialog (falls to body); Tab not contained | expanded card hub | a11y | REPORT r2 MAJOR v7; 478277c9 | ExpandCard.tsx:205-207,236-239,177-179; VariantVetrina.tsx:155-202 | P1 |
| LS-4 | Focus not returned to the LinkedIn row on close (drops to body) | close path | a11y | REPORT r1/r2 v7 | ExpandCard.tsx:143-164,208-210 | P1 |
| LS-5 | Scrim appears in one frame (no fade-in); under reduced motion cut mid-fade | scrim | interaction/motion | REPORT r2 BLOCKER v8; tech-debt v8 | proto.css:256-269; ExpandCard.tsx:214-218,54,156-163 | P1 |
| LS-6 | Header grows ~45px instantly hub→warning/confirm faces while frame animates | expanded card header | interaction/motion | REPORT r2 MAJOR v8; 478277c9 | VariantVetrina.tsx:358-359; MorphView.tsx:79-80 | P1 |
| LS-7 | Focus ring of confirm buttons clipped right/bottom (overflow hidden) | confirm buttons | a11y | tech-debt NIT v7 | proto.css:109-112; VariantVetrina.tsx:137-148 | P2 |
| LS-8 | Reopening during the ~400ms return trip leaves card stuck (no scrim/Escape, won't reopen) | collapsed row during close | interaction | REPORT r2 MAJOR v7, r1 BLOCKER v5 | ExpandCard.tsx:111-112,156-163; machine.ts:216-219 | P1 |
| LS-9 | Closing the success stamp and reopening within the linger window → card closes by itself | success stage | interaction | REPORT r1 BLOCKER v1 | machine.ts:93,102,113-116,221-225,201-210 | P0 |
| LS-10 | Ambiguous server outcomes shown as definite failure ("no data written") instead of uncertain/verify | card error face | missing-state | REPORT r1/r2 BLOCKER v2 | state never shown (machine.ts success-only) | P0 |
| LS-11 | Non-closable working card can strand the user (hung disconnect/save/re-read; archived company retry loop) | busy/uncertain faces | interaction | REPORT r1/r2 MAJOR v1-v3 | state never shown (no hang/timeout) | P1 |
| LS-12 | Error surfaces mislead or go silent (404 closes silently, 401 wrong blame, 400 wrong copy, retry not re-announced) | error faces + aria-live | copy | tech-debt v1/v2/v7; REPORT checklist | state never shown (no error copy) | P2 |
| LS-13 | Rate-limit (429) reason shown on disconnect confirm with enabled Scollega; forgotten on workspace switch | hub/disconnect confirm | copy | REPORT r1 MAJOR v6, r2 MAJOR v1 | state never shown | P1 |
| LS-14 | With unsaved page edits, leave dialog offers «Salva ed esci» during uncertain/just-after sync → overwrites fresh import | leave dialog / SaveBar | interaction | REPORT r1 BLOCKER v4, MAJOR v5 | state never shown (no dirty tracking in harness) | P0 |
| LS-15 | Messages explaining the hold are lost (leave dialog without discard count, SaveBar live region dropped, Salva-prima error inside inert SaveBar) | leave dialog, SaveBar | copy | REPORT r1 MAJOR v4, r2 MINOR v7 | state never shown | P1 |

Dropped: 40 (double PostHog event, dead i18n keys, options.signal/try-finally/dispose, BE limiter, R5 social_media write).
