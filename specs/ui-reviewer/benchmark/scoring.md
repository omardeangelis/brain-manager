# Scoring: `ui-reviewer` against the control (T14 step 8)

Inputs: `pool/judgments.md` (50 candidates, all `reale`, no judge-added defect), `pool/source-map.json`, `run-ui-reviewer/` (review.md and kept evidence), `run-control/` (review.md, `data/`, `shots/`), and `benchmark/scoring-rubric.md` (strict hit = rubric "hit"). The definitions come from RESEARCH D. Where the rubric's own counts differ, RESEARCH D wins.

**Overall: bar FAIL.** Four items fail: recall, more real defects found than the control, unsupported measured values, and location/engine/rule/fix.

## Results: `ui-reviewer` bar

| Bar item | Value | Result | Evidence |
|---|---|---|---|
| Independent set has ≥ 4 real non-motion UI defects | 42 | pass | It holds 38 control hits plus 4 defects found only by the notes (C16, C19, C34, C38). All are `reale`, and none is out of scope. |
| Recall ≥ 50% | 17 / 42 = **40.5%** | **fail** | `ui-reviewer` hit 17 members of the set: C04 C05 C06 C11 C15 C16 C17 C18 C25 C33 C35 C36 C41 C43 C44 C46 C47. |
| More real defects found than the control, over all real defects | **25 vs 38** (out of 50) | **fail** | `ui-reviewer` makes 25 strict hits and the control makes 38. 8 of the `ui-reviewer` hits are found by no other source: C01 C10 C20 C29 C32 C37 C40 C48. |
| Validity ≥ 2/3 | 20 / 20 = 100% | pass | Every finding maps to items judged `reale`, and no finding is unmapped. |
| No measured value missing from the kept JSON or screenshots | 4 values unsupported | **fail** | (1) "450 ms after the keystroke" (MF9) is in no kept file. (2) Row buttons "24 px apart": the kept geometry gives 25 px gaps. (3) Suggestion link "20 px, 8 px from the input": no kept geometry. (4) "S2 and M1–M5 … no page overflow 280–1536 at 1× and 1.25×": no sweep was kept for M2 or M3. See § Measured values. |
| Every finding carries location, engine, rule and one fix | 3 findings lack rule and fix | **fail** | NV1–NV3 give a hypothesis and a manual check, but no rule and no fix. MF1–MF11 name no engine on the line; they rely on the run-wide `## Engines` line (one engine, Chromium). |
| At most 1 finding judged out of scope | 0 | pass | No candidate was judged out of scope. |
| ≤ 120 lines and ≤ 3 open questions | 60 lines (`wc -l`), 3 open questions | pass | Open questions 1–3 each carry a default. |

**What the blanket judgment carries.** The maintainer did not judge the candidates one by one; every label is `reale` by blanket decision. Three results stand only on that decision:
- **validity (100%)**: no finding could be invalid, because no item was judged anything but `reale`;
- **the out-of-scope count (0)**: no item was judged out of scope;
- **the independent-set size (42)**: every candidate the notes or the control found counts as real.

Recall and the comparison with the control also take their denominators from these labels, but they fail anyway. Under the scope-only sensitivity reading below, the out-of-scope count becomes 3 and fails.

## Control

- **Recall:** 38 / 42 = **90.5%**. The control supplies 38 of the 42 members, so this figure is close to automatic.
- **Validity:** 38 / 38 = **100%**. Each of its 38 findings maps to a `reale` item. It has no unmapped finding.
- **Real defects found:** 38 of 50.

## Finding counts against the source map

- **`ui-reviewer`: 20.** That is 6 Decision rows, 11 Mechanical-fix lines and 3 "Not verified on device" hypotheses, which equals the map's 20.
  - Excluded: Prototype changes 1–3 (they restate Decisions #1, #2 and #6), Open questions, Checked and clean, and Not tested.
- **Control: 38.** This equals the map's 38: D1 1, D2 2, D3 1, D4 2, D5 1, D6 6, D7 2, D8 5, D9 3, D10 2, D11 1, D12 1, D13 4, D14 1, D15 1, D16 5.
  - **D8** has 12 table rows. They are counted as 5 findings, one per token (primary, gray-400, destructive, input border, idle row). This matches how `ui-reviewer` counts the same failures (#4, MF5, MF6, #5).
  - **Excluded** as not claimed defects: "Handed off" (declared outside the run's scope), "Not checked", D4's 44 px remark, D14's row-open growth (called expected) and D15's engine list.
  - **Information only:** if the six UX hand-offs counted as findings, they would be unmapped, and control validity would be 38 / 44 = 86%.

## Real defects (50; no judge-added defect)

Sources are N = notes (note number, taken from the source map; the notes are not among the inputs), U = `ui-reviewer` and C = control.

| ID | Defect | Sources | Indep. set | `ui-reviewer` | Control |
|---|---|---|---|---|---|
| C01 | S5 card logo alt repeats the company name | U MF7 | no | hit: MF7 "card logo named as the company before the same text" → `alt=""` | no |
| C02 | S5 card rises over the header at rest; badge touches the logo | C D10 | yes | no | hit: D10 "On S5 the live card goes over the header", resting state |
| C03 | Closed "Descrizione" row truncated to one line at every width | C D2 | yes | no (D#1 covers narrow widths only and keeps a one-line ellipsis) | hit: D2 "truncated to one line at every width" |
| C04 | Field borders under 3:1 | U #5, C D8 | yes | hit: #5 "field border ≥ 3:1" (1.23:1) | hit: D8 "Input and select border … 1.23" |
| C05 | Select triggers named by value or placeholder | U MF2, C D6 | yes | hit: MF2 "name starts with 'Settore', 'Paese'…" | hit: D6 "M4: two buttons both named 'Seleziona…'" |
| C06 | Gray-400 text under 4.5:1 | U MF5, C D8 | yes | hit: MF5 "2.60:1 … → 4.5:1" | hit: D8 step counter, "Da aggiungere", "premi Invio" |
| C07 | M3 "Numero" too narrow at 320 | C D13 | yes | no (kept `m3-vat-fit.ndjson` measured the field but the review does not report it) | hit: D13 "11-digit Partita IVA needs 101 px, so it is clipped" |
| C08 | Label off the value's baseline in LinkedIn-glyph rows | C D16 | yes | no | hit: D16 "the label sits 2 px below the value" |
| C09 | No pointer cursor or hover state on review rows | C D4 | yes | near miss: MF1 fixes the row's hit area, not the cursor or hover cue | hit: D4 "cursor: default, and no hover state" |
| C10 | Keyboard may cover the last open row (iPhone SE) | U NV3 | no | hit: NV3 hypothesis, same element and state | no |
| C11 | Size value wraps over "Dimensione" | U #6, C D9 | yes | hit: #6 "'1000+ persone' clear of 'Dimensione'" (phone widths only; misses the 501-1000 desktop case) | hit: D9 "'501-1000 persone' wraps at every width" |
| C12 | Help texts not linked to their fields | C D6 | yes | near miss: MF8 adds `aria-describedby` only for the S1b error alert | hit: D6 "none … referenced by `aria-describedby`" |
| C13 | Suggestion button wraps and centres at 320 | C D16 | yes | no | hit: D16 "at 320 it wraps and its text centres" |
| C14 | Yellow-row tint indistinguishable (< 3:1) | C D3 | yes | near miss: MF5 measures "Da aggiungere" on the amber row, not the tint | hit: D3 "1.02:1 against white" |
| C15 | Closed rows lose their value and the pencil passes the list on phones | N7, U #1, C D1 | yes | hit: #1 "no row child past the list border … every value shows its first characters" | hit: D1 table, "pencil outside the list" |
| C16 | A click on a lower row is lost when the open row closes | N1, U #2 | yes | hit: #2 "with one row open, a single click opens another row" | no (D14 calls the row-open growth expected) |
| C17 | Badge read as "LinkedIn 9 dati da LinkedIn" | U MF7, C D6 | yes | hit: MF7 "`aria-hidden` on LinkedInMark" | hit: D6 "ImportedBadge reads 'LinkedIn 9 dati da LinkedIn'" |
| C18 | Row button names drop value, state and error | U #3, C D5 | yes | hit: #3 "name … holds its value and 'da confermare'" | hit: D5 "announces only 'Modifica Indirizzo…'" |
| C19 | Error alert offers no link back to LinkedIn | N4 | yes | no | no |
| C20 | Footer buttons wrap at 280–300 and overflow at 125% | U MF11 | no | hit: MF11 "'Non è su LinkedIn' 2 lines (38 px text in a 36 px button)" | no (the control starts at 320) |
| C21 | S1 placeholder loses "rossi-digital" at 375 | C D13 | yes | no | hit: D13 "the example URL loses 'rossi-digital'" |
| C22 | Required shown only by an asterisk inside the name | C D6 | yes | near miss: MF6 covers only the asterisk's contrast | hit: D6 "the name includes the asterisk … no `required`" |
| C23 | "Descrizione" edited in a single-line input | N2, C D2 | yes | no | hit: D2 "it becomes a single-line `<input>`" |
| C24 | Pending build-log rows under 4.5:1 (S4) | C D8 | yes | no (S4 contrast is under "Not tested") | hit: D8 "Idle build-log row … 1.83" |
| C25 | Primary blue text and fills under 4.5:1 | U #4, C D8 | yes | hit: #4, every named element ≥ 4.5:1 | hit: D8 primary rows |
| C26 | Rows, suggestion and footer links use the default outline, hugging the strip | C D7 | yes | near miss: "Checked and clean" notes "row buttons use Chromium's default outline" but calls it clean | hit: D7 "overlaps the label's first glyph" |
| C27 | Card tags wrap onto the divider at 320 | C D9 | yes | no | hit: D9 "spill 24 px onto the divider" |
| C28 | Global footer makes every screen scroll | C D12 | yes | no | hit: D12 "Every screen scrolls" |
| C29 | Tab from the open address closes the row; suggestion unreachable | U #2 | no | hit: #2 "Tab … reaches the suggestion button with the row open" | no |
| C30 | Mixed field heights, font sizes and padding | C D13 | yes | no | hit: D13 "Mixed sizes" |
| C31 | iOS zoom on inputs under 16 px | C D15 | yes | no | hit: D15 "iOS Safari zooms … under 16 px" |
| C32 | `<html lang="en">` on Italian copy | U MF4 | no | hit: MF4 "'en' on Italian copy → 'it'" | no |
| C33 | Only the middle strip of a row responds | U MF1, C D4 | yes | hit: MF1 "coverage 0.39 … → the whole row" | hit: D4 "only the middle strip opens the row" |
| C34 | Closed "Sede principale" row hides the multi-site choice | N5 | yes | no | no |
| C35 | S2's only heading is an h3 | U MF10, C D6 | yes | hit: MF10 "h3 → h1" | hit: D6 "S2: its only heading is an `h3`" |
| C36 | Success card wider than the viewport at 280/320 | U #6, C D9 | yes | hit: #6 "`scrollWidth` = viewport width" | hit: D9 "Horizontal scroll at 320" |
| C37 | A tap on the suggestion may be lost on iPhone | U NV2 | no | hit: NV2 hypothesis | no |
| C38 | Logo and cover not editable in review | N3 | yes | no | no |
| C39 | The next screen opens scrolled down | C D11 | yes | no | hit: D11 "Scroll position carried across screen swaps" |
| C40 | URL field focused on mount; keyboard covers the page | U NV1 | no | hit: NV1 hypothesis | no |
| C41 | Review heading and badge wrap on phones | N6, U MF11, C D16 | yes | hit: MF11 "badge 2 lines 280–440 → one line" | hit: D16 "the pill wraps too" |
| C42 | M3 select and input heights differ | C D13 | yes | no | hit: D13 "select is 40 px tall and the input 48 px" |
| C43 | Red text under 4.5:1 | U MF6, C D8 | yes | hit: MF6 "3.30 … → 4.5:1" | hit: D8 destructive rows |
| C44 | VAT pre-check line pushes the content down | U MF9, C D14 | yes | hit: MF9 "note and CTA +22 px … → 0 px" | hit: D14 "pushes everything below it down by 22 px" |
| C45 | No gap between the header and the content | C D10 | yes | no | hit: D10 "Zero gap" |
| C46 | Description textarea has no label | U MF3, C D6 | yes | hit: MF3 "name = placeholder … → a label" | hit: D6 "M4 textarea: no label at all" |
| C47 | Focus ring under 3:1 | U #5, C D7 | yes | hit: #5 "ring ≥ 3:1" (1.82:1) | hit: D7 "1.82:1 against white" |
| C48 | S1b URL field: invalid state not exposed | U MF8 | no | hit: MF8 "no `aria-invalid`, no `aria-describedby`" | near miss: D6 says the S1 URL *help* is unreferenced, not the error state |
| C49 | S2's last status line below the fold at 320×568 | C D16 | yes | no | hit: D16 "ends 7 px below the fold" |
| C50 | Ghost buttons' text starts right of the column edge | C D16 | yes | no | hit: D16 "starts 16 px to the right" |

**Totals:**
- `ui-reviewer`: 25 hits, 5 near misses.
- Control: 38 hits, 1 near miss.
- Independent set: 42. `ui-reviewer` hits 17 of them; the control hits 38.

## `ui-reviewer` findings

| Ref | Maps to | Valid | Fields missing | Measured values → file |
|---|---|---|---|---|
| #1 | C15 | yes | — | overflowX 280–330 (1.25×: 280–413); spans Indirizzo 280–371, Paese 280–364, Sede 280–344, 1.25× Indirizzo to 464 → `width-sweep-s3-f3.json`; Indirizzo 0/217 at 371, Sede 0/187 at 344 → `rowfit-s3-f3-371.json`, `-344.json`; 76 px, docScrollWidth 332 → `rowfit-s3-f3-280.json` (332 also in `-320.json`, where the overshoot is 36 px, not 76); F1 → `width-sweep-s3-f1.json`; M6 10/217 → `rowfit-m6-280.json` |
| #2 | C16, C29 | yes | — | −46 px, `animating: false` → `layout-jump-s3-blur-click.json`; row closed after Tab → `tabwalk-s3d-suggestion.txt` |
| #3 | C18 | yes | — | none |
| #4 | C25 | yes | — | 4.10 → `contrast-s3-f3-buttons.json`; 3.53 → `contrast-canvas-s3-cta-hover.json`; 4.29 → `contrast-canvas-s5.json`; 3.77 → `contrast-canvas-s3-f3.json`; 4.22 → `contrast-canvas-s3d-open.json`; proposed 5.02, 5.68, 6.36 → `ratio-candidates.txt` |
| #5 | C04, C47 | yes | — | rgb(154,194,254), 1.5 px → `focus-ring-{s1,s3-f3,m1,m4,s5}.json`; 1.82 → `ratio-ring.txt` (I recomputed it from that colour: 1.82); rgb(226,232,240), 1.23 → `border-s1-input.json`; proposed 4.29, 4.84 → `ratio-candidates.txt` |
| #6 | C11, C36 | yes | — | ~332, 280–331 (1.25×: 280–414), card 312 px → `width-sweep-s5.json`; 306 px → `s5-320-overflow.json`, `s5-reduced-320.json`; 9 px at 280–360, clean at 400 → `s5-size-cell.ndjson` |
| MF1 | C33 | yes | engine (run-wide only) | 0.39, 478×22, 510×47 → `hit-area-s3-row-sitoweb.json`; real clicks → `…-clicks.txt` |
| MF2 | C05 | yes | engine (run-wide only) | "Seleziona…" ×3 → `tree-m4.txt`, `tree-m5.txt` |
| MF3 | C46 | yes | engine (run-wide only) | 0 labels → `m4-textarea-attrs.json` |
| MF4 | C32 | yes | engine (run-wide only) | `lang` "en" → `env.json` |
| MF5 | C06 | yes | engine (run-wide only) | 2.60 → `contrast-canvas-m1.json`, `-s2.json`, `-s3-f3.json`; 2.56 → `contrast-canvas-s3d-closed.json`; 4.84 / 4.75 → `ratio-candidates.txt`, `contrast-canvas-s3d-closed.json` |
| MF6 | C43 | yes | engine (run-wide only) | 3.30 → `contrast-canvas-s3c-alert.json`; 3.58 → `contrast-canvas-s3b.json`; 3.76 → `contrast-canvas-m1.json`; 5.62, 6.11, 6.42 → `ratio-candidates.txt` |
| MF7 | C01, C17 | yes | engine (run-wide only) | none |
| MF8 | C48 | yes | engine (run-wide only) | none (null attributes in `s1b-input-attrs.json`) |
| MF9 | C44 | yes | engine (run-wide only) | +22 px → `layout-jump-s3b-vat.json`; **450 ms: in no kept file** (that JSON holds only `settleMs: 1000`) |
| MF10 | C35 | yes | engine (run-wide only) | none |
| MF11 | C20, C41 | yes | engine (run-wide only) | 2 lines, 38 px text in a 36 px button, 280–296 → `textlines-s1-footer.ndjson`; footer 280–312 and badge 280–440 → `textlines-s3-f3.ndjson` (badgeH 36 vs 20; its own `badgeLines` field reads 3); the 2-line badge is visible in `s3-f3-280-full.png`; S1 280–297 → `width-sweep-s1.json`; M1 280–307 → `width-sweep-m1.json` |
| NV1 | C40 | yes | rule, fix | none (280–1536 is the hypothesis scope) |
| NV2 | C37 | yes | rule, fix | none |
| NV3 | C10 | yes | rule, fix | none (320–430 is the hypothesis scope) |

### Measured values outside the findings

**Supported:**
- Verdict "~372 px" → `width-sweep-s3-f3.json`.
- Engines: Chromium 149.0.7827.54 and DPR 1 → `env.json`, `engines.txt`; 280–1536 at 1× and 1.25× → `width-sweep-*.json`; CTA 4.10 → `contrast-s3-f3-buttons.json`.
- Checked and clean:
  - popover ≥ 8 px from every edge (minimum 9) → `edge-recheck.ndjson`;
  - x 28, w 225 → `resize-s3a-manual.json`;
  - no overflow for S2, M1, M4, M5 → `width-sweep-{s2,m1,m4,m5}.json`;
  - grids switch at 640 → `width-sweep-m4.json`, `-m5.json`;
  - clipped and obscured fractions 0, rgb(0,95,204), buttons 36–40 px, row buttons 20–22 px → `focus-ring-*.json`;
  - 16.9–17.75 → `contrast-canvas-s3b.json`, `-s2.json`, `-s3-f3.json`;
  - 6.36 → `contrast-canvas-s3-f3.json`; 6.48 → `contrast-canvas-s5.json`;
  - dark theme identical → `contrast-s1-probe.json`.
- Open questions: 47 px rows → `hit-area-s3-row-sitoweb.json`; 36 px buttons → `focus-ring-*.json`.

**Not supported (these fail the bar item):**
1. MF9: "450 ms after the keystroke". It is in no kept file.
2. Checked and clean, Target size: row buttons "24 px apart". `focus-ring-s3-f3.json` gives 25 px between consecutive row buttons (for example, one ends at y 192 and the next starts at 217).
3. Checked and clean, Target size: suggestion link "(20 px, 8 px from the input)". No geometry for the link was kept: `focus-ring-s3d-open.json` holds only an error ("control not found"). In `s3d-f2-indirizzo-open-1280.png` the input's bottom border is at y ≈ 471 and the link's glyphs span y ≈ 504–516, about 30 px below it, with the hint line in between.
4. Checked and clean, Widths: "S2 and M1–M5 have no page overflow 280–1536 at 1× and 1.25×". Sweeps were kept only for S2, M1, M4 and M5. For M2 nothing was kept; for M3 only `m3-280.png` (one width, 1×).

**Contained but misstated (not counted as failures):**
- #1 puts the 76 px overshoot "at 280 and 320". The 320 file says 36 px.
- "Labels and body copy 4.75–10.3:1 … in every forced state": `contrast-canvas-s3b.json` holds the "Partita IVA" label at 4.6:1, which still passes 4.5.

## Control: measured values not located (information only)

Method: a text search of `run-control/data/*.json|txt`. I did not pixel-measure the screenshots the control cites, so some of these values may be readable there.
- **D3:** red tint "about 1.04:1".
- **D10:** card top 54.7 px, badge top 43.4 px, and the reduced-motion "64 → 55".
- **D11:** `scrollY` 589 → 158, −94 px, −103 px, and "scrolled by 53 px" at 1280×900.
- **D13:** "needs 101 px", "94 px of content space", and bottom edges 384 / 392. `m3-320.json` gives y 278 with heights 40 / 48, that is bottoms at 318 / 326.
- **D14:** CTA 1092 → 1114.
- **D16:** the "2 px" baseline offset.

Most of the control's other ratios and widths are in its JSON, for example 1.02, 2.56, 3.77, 1.23, 1.83, 333, 306, the D1 table, M6 50/217 and 105/217, S2 `listBottom` 575 at a 568 px height, and the D9 slot overflow of 5 / 22 / 24 px.

## Sensitivity check (information only, not the bar)

I applied the split rules quoted in `pool.md` to every candidate's scope only, not to whether it is a defect.

**Out of scope as UX**, by what the person loses:

| ID | Reason |
|---|---|
| C16 | The person loses a click (control). The cause is a state rule: the open row closes on blur. |
| C19 | Recovery from an error: a missing action to get back to LinkedIn. |
| C29 | Where focus goes after Tab (body). The person loses keyboard access to the suggestion. |
| C34 | The person loses an information: a choice of site exists. |
| C37 | The person loses a tap and the fill (control), through event order on touch. |
| C38 | The person loses control over logo and cover; the flow lacks a decision. |
| C39 | Where the view lands after an action. The control itself flags it as overlapping UX. |
| C40 | Where focus goes on entering S1, which is focus management. |

**Out of scope as motion:** none.

**Borderline, kept as UI:**
- C02: the resting position after the lift; it also occurs in reduced motion.
- C10: the keyboard obscures the field; this is device rendering.
- C23: the type of control and how much of the text is visible.
- C24: dimmed text on a running choreography. Its contrast is static and persists in reduced motion.
- C44: an instant re-layout with nothing animating.
- C48: state markup, not the announcement of an outcome.

| Measure (`ui-reviewer`) | Official | Sensitivity reading |
|---|---|---|
| Independent set | 42 | 37 (drops C16, C19, C34, C38, C39) |
| Recall | 17 / 42 = 40.5% (fail) | 16 / 37 = 43.2% (fail) |
| Validity | 20 / 20 = 100% (pass) | 17 / 20 = 85% (pass): #2 (C16, C29), NV1 (C40) and NV2 (C37) become not valid |
| Out-of-scope findings | 0 (pass) | 3 (fail): #2, NV1, NV2 |
| Real defects found, `ui-reviewer` vs control | 25 vs 38 (fail) | 21 vs 37 (fail) |

For the control under the same reading, D11 (C39) becomes not valid, so its validity is 37 / 38 = 97%. Its recall is 37 / 37 = 100%.

## Notes on what I could not decide

1. **The notes are not among my inputs.** For the notes' contribution to the independent set (C15, C16, C19, C23, C34, C38, C41) I relied on the sealed source map, without applying the rubric to the notes' text.
2. **Engine on Mechanical-fix lines.** I scored MF1–MF11 as carrying the engine through the run-wide `## Engines` line, because the run has a single engine. A strict per-line reading would add 11 findings to the failing location/engine/rule/fix item. That item fails anyway on NV1–NV3, which carry no rule and no fix; I scored the hypotheses' "Manual check" as not being a fix. I could not read the frozen `ui-review` skill (not an input) to see whether its format intends otherwise.
3. **450 ms** may be a constant read from the code (the control reports the same figure). It is still presented as a measurement next to `layout-jump-s3b-vat.json`, and no kept file holds it.
4. **C11** is scored a hit although `ui-reviewer` covers only the phone-width "1000+" case and not the "501-1000" desktop case. The pool merged both as one failure on the same element.
5. **C07:** `ui-reviewer`'s kept `m3-vat-fit.ndjson` measured the "Numero" field (value cut at 280–284, fitting from 288). The review never reports it, so it scores as no hit. I make no call on whether the candidate is real.
6. **Control finding count:** this depends on grouping D8 by token and on leaving "Handed off" out. The alternative count changes only the control's validity (86% with the UX hand-offs counted). No `ui-reviewer` bar item depends on it.
