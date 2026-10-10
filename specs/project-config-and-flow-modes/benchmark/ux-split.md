# UX / UI split of the ground truth (frozen 2026-10-06, before iteration 2)

Maintainer decision (2026-10-06): `ux-advisor` reviews UX only, and UI belongs to `design-engineer`. From iteration 2 on, recall is measured on the UX defects only. The ground-truth files and the scoring rubric stay unchanged. Scorers still judge all 43 defects, and the UX figures are computed from their verdicts.

**Rule: classify each defect by what the person loses.**
- **UX:** the person loses the task, their work or data, an information, or control. This covers flows, outcomes and states, recovery, leaving and interrupting, and what the words mean. It also covers task-level accessibility: where focus goes after an action, and whether an outcome is announced.
- **UI:** the person loses appearance or feel. This covers placement and geometry, widths and wrapping, motion, contrast, focus-ring visibility, target size, accessible-name markup, and browser- or device-specific rendering.

| Case | UX (counted) | UI (`design-engineer`, not counted) |
|---|---|---|
| linkedin-sync (15) | LS-3, LS-4, LS-8, LS-9, LS-10, LS-11, LS-12, LS-13, LS-14, LS-15 — **10** | LS-1, LS-2, LS-5, LS-6, LS-7 — 5 |
| suggested-skills (14) | SS-2, SS-3, SS-4, SS-5, SS-6, SS-13, SS-14 — **7** | SS-1, SS-7, SS-8, SS-9, SS-10, SS-11, SS-12 — 7 |
| add-skills (14) | AS-5, AS-6, AS-7, AS-8, AS-9, AS-10, AS-11, AS-12, AS-13, AS-14 — **10** | AS-1, AS-2, AS-3, AS-4 — 4 |
| **Total (43)** | **27** | 16 |

Borderline cases, placed as above and confirmed by the maintainer:
- **SS-8:** on touch devices the virtual keyboard covers Save. Its cause is device rendering, so it counts as UI.
- **SS-10, SS-11, AS-3, AS-4:** what a screen reader reads, at markup level. They are accessible-name markup, so they count as UI.
- **LS-3, LS-4, SS-2, AS-6:** focus after an action, which decides whether a keyboard user can go on. They count as UX.

## Earlier runs, rescored on the UX subset (same verdicts, no new scoring)

| Case | Old `FLOW.md` | Iteration 0 | Iteration 1 |
|---|---|---|---|
| linkedin-sync (10) | 4 hits = 0.40 | 3 = 0.30 | 5 = 0.50 |
| suggested-skills (7) | 2 = 0.29 | 3 = 0.43 | 4 = 0.57 |
| add-skills (10) | 8 = 0.80 | 5 = 0.50 | 5 = 0.50 |
| **Total (27)** | **14 = 0.52** | 11 = 0.41 | **14 = 0.52** |

On the UI subset (16), the old `FLOW.md` had 1 hit and iteration 1 had 4.

## Pass bar from iteration 2 (maintainer decision, 2026-10-06)

This replaces "recall ≥ 2× baseline" in RESEARCH part D. In every case:

- strict UX recall ≥ the old `FLOW.md`'s strict UX recall, and ≥ 40%;
- at least two thirds of findings valid, judged by the maintainer;
- at least one adopted P0/P1 decision, judged by the maintainer;
- every decision carries a default and an acceptance criterion;
- about 120 lines at most, and at most 3 open questions;
- zero runtime claims without evidence.
