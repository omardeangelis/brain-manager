# UI defects → standards and evidence (research for `ui-reviewer`)

Date: 2026-10-06. Read-only research. The CLI under test is `agent-browser` 0.27.1, at `~/Library/pnpm/global/5/.pnpm/agent-browser@0.27.1`. The ground truth is `specs/project-config-and-flow-modes/benchmark/ground-truth-{ls,ss,as}.md` and `ux-split.md`. The probe page is `probe/index.html` next to this file. The screenshots and the local copy of axe-core 4.11.1 (taken from the pnpm store, not downloaded) stayed in the session scratchpad and are not kept.

The evidence recipes `R-…` that the table cites are spelled out in §3.1.

## 1. Defect map (16 UI defects; LS-5 and LS-6 are motion)

| ID | Defect (one line) | Class | WCAG SC or heuristic | Caught by axe? | agent-browser evidence (exact commands) | Desktop Chromium? | Code alone? | Notes |
|---|---|---|---|---|---|---|---|---|
| LS-1 | When the row sits low, the expanded card opens "in place", pressed against the viewport bottom | geometry (placement) | No SC. Heuristic: an overlay's position must not depend on where its trigger sits, and it keeps a minimum edge margin. 1.4.10 applies only if content is actually cut off | no | **R-EDGE**: `eval "scrollTo(0, Y)"` so the trigger sits at the top, middle and bottom of the viewport → `click <trigger>` → `get box <card>` and `eval "innerHeight"` (bottom gap = innerHeight − (y+height)) → `screenshot /abs/NN-trigger-bottom.png` | yes | partly. `VariantVetrina.tsx:368` (`in-place`) and the clamp at `ExpandCard.tsx:100-107` show the mechanism. Judging it a defect needs the picture | Iteration 1 already had this evidence (`22-375x540-trigger-bottom-open.png`, card 16 px from the bottom) and judged it fine. The bar failed, not the tooling |
| LS-2 | On resize or rotation the open card keeps its opening width and left → too narrow, or off-screen | responsive | 1.4.10 Reflow (AA) at the new width, plus a heuristic: geometry follows the viewport | no | **R-RESIZE**: `set viewport 1280 800` → open the card → `set viewport 375 812` → `get box <card>` (x+width > `eval "innerWidth"`) → `screenshot /abs/NN-resized.png` | yes. The probe reproduced it: `x 220, width 840` at both 1280 and 375 | yes. Width and left are written only in `promote` | Iteration 1 **hit** it with exactly this recipe |
| LS-5 | **Motion.** The scrim appears in one frame (no fade-in), and under reduced motion it is cut mid-fade | motion (`design-engineer`) | Craft heuristic. 2.3.3 (AAA) for the reduced-motion part | no | **R-MOTION**: an rAF sampler of the scrim's computed `opacity` started by `eval` before `click <trigger>`, then `eval "JSON.stringify(window.__frames)"`. Plus `record start /abs/v.webm` … `record stop`, and a repeat after `set media light reduced-motion` | yes (headless frame timing is approximate). Not probed | yes. `proto.css:256-269` has no enter transition | Hand to `design-engineer` |
| LS-6 | **Motion.** The header grows ~45 px instantly (hub → warning/confirm) while the frame animates | motion (`design-engineer`) | Craft heuristic | no | **R-MOTION** (sample the header's `getBoundingClientRect().height` per frame) plus **R-JUMP** (a layout-shift observer lists the header among the shift sources) | yes. Not probed | yes. `VariantVetrina.tsx:358-359`, `MorphView.tsx:79-80` | Hand to `design-engineer` |
| LS-7 | The confirm buttons' focus ring is clipped right and bottom by `overflow:hidden` | focus visibility | 2.4.7 (AA) fails only if the ring is fully hidden. Partial clipping falls under 1.4.11 (indicator visibility) and 2.4.13 (AAA). In practice a heuristic: the ring is fully visible | no (no axe rule tests focus indicators) | **R-RING**: reach the button with `press Tab` (never `focus`) → `set viewport 1280 800 2` → `screenshot "<container>" /abs/NN-focus.png` → `eval --stdin < ring-clip.js` | yes. Probe: `clippedPx {right:4, bottom:4}`, and the 2× element shot shows the cut | yes. `proto.css:109-112` plus buttons flush to the edge | Iteration 1 found the same bug on the **trigger** only (partial). The miss is coverage: R-RING must run on every focusable control in every forced state |
| SS-1 | The «+N» chip wraps to a 3rd row at card widths 270–343 px (~1% of profiles) | responsive (wrapping) | No SC. Heuristic: the preview's two-row contract | no | **R-SWEEP** over viewports that give card widths of 270–343 (≥1024 for the 270 px card, and 300–375), **with worst-case data**: `eval` that replaces chip texts with long real names first, then counts row tops and the «+N» row | yes, but it depends on the data | partly. The row-fit math in `chips.tsx:57-72,96-101` ignores the width of «+N» | Iteration 1 swept 320–1280 in 24 steps with fixture names and got "always 2 rows" (partial). The sweep worked; the data was too kind |
| SS-7 | Safari and macOS Firefox: clicking a chip ✕ does not move focus to the next ✕ | device rendering (engine focus-on-click) | 2.4.3 (A) at a stretch. Mainly a heuristic | no | Chromium focuses buttons on click, which hides the bug. Untested emulation: `eval` adds a capture-phase `mousedown` listener that calls `preventDefault()` on buttons (Safari-like) → `click <✕>` → `eval "document.activeElement.outerHTML.slice(0,80)"` | no. Only partly, through emulation | yes, given the engine knowledge: `focus.ts:17-18` reads `activeElement` after the click | MDN: «Safari does not, by design» focus clicked buttons. Iteration 1 and the baseline each had a keyboard-only partial |
| SS-8 | On touch devices, opening moves focus into the input, and the virtual keyboard covers the suggestions and Salva | device rendering | No SC. 2.4.11 concerns author-created content, not the OS keyboard. Heuristic: no text-field autofocus on touch | no | Chromium shows only the precondition: open → `eval "document.activeElement.tagName"` gives INPUT. `set device` gives **no touch** (probe: `maxTouchPoints 0`, `pointer: coarse` false). The keyboard never renders. `-p ios`: see §4. Its taps are JS clicks, so the keyboard probably does not appear | no (precondition only) | yes. Autofocus at `skills-section.tsx:336-341,139` and `chips.tsx:268-272` | The baseline **hit** it from reasoning alone (P8). Iteration 1 left it as a manual check (partial) |
| SS-9 | Mobile: the centered modal jumps on every height change, and Salva can sit under the iOS toolbar | geometry + device rendering | Heuristic, no SC | no | **R-JUMP**: `get box "[role=dialog]"` and `get box <Salva>` before and after a decision. A layout-shift observer lists the moved nodes. `diff screenshot --baseline /abs/before.png -o /abs/diff.png`. Toolbar half: `-p ios screenshot` (full screen including Safari's bars) | partly. The jump: yes (probe: top 310.2 → 320.7). The toolbar: no | yes. `ui/dialog.tsx:48` (translate centering) | Iteration 1 measured the jump at 1280 (partial). The toolbar half needs Mobile Safari |
| SS-10 | The modal's ✕ is announced in English and is reached last in Tab order | accessible name + order | Localization: 2.4.6/3.1.2 at a stretch. Order: 2.4.3 (A) at a stretch. Mainly a heuristic | no (`button-name` passes: a name exists) | `snapshot -i -s "[role=dialog]"` gives `button "Dismiss"` as the last item. Tab walk: `press Tab` ×N with `eval "document.activeElement.outerHTML.slice(0,80)"` after each | yes. Probe: `button "Dismiss" [ref=e19]` listed last | yes. `ui/dialog.tsx:54-71` | Iteration 1 got the English name and not the order (partial) |
| SS-11 | The «+N» accessible name does not contain the visible «+28» | accessible name | 2.5.3 Label in Name (A) | **needs explicit run.** `label-content-name-mismatch` is tagged `experimental` and off by default, and the `wcag21a` tag does not include it. Even when run, it **passes** a name that contains the digits ("Mostra altre 28 competenze"), because punctuation is stripped. It flags only a name with no "28" | `snapshot -s <card>` shows the name next to its visible text: `button "Mostra altre 28 competenze"` → `StaticText "+28"` | yes | yes. `chips.tsx:113-115` | The evidence is trivial. Whether it is a defect depends on the bar (strict label-in-name versus axe's normalization). Iteration 1 judged the name against the action, not against the visible text (partial) |
| SS-12 | The «30/30» counter in amber-600 is ~3:1 and fails AA at 12 px | contrast | 1.4.3 (AA) | **yes**: `color-contrast` (default, serious), once the 30/30 state is forced | Force 30/30 → `eval --stdin < node_modules/axe-core/axe.min.js` → `axe.run(...)` (**R-AXE**). On ≥0.33 it is `a11y --selector <scope>` | yes. Probe: `#p3-counter :: 3.18 (#d97706 on #ffffff, 9.0pt (12px))` | yes, from the token values | Iteration 1 **hit** it with axe from cdnjs, run in the forced state |
| AS-1 | Only the name/% label and the 16 px box toggle. The row's padding and gap are inert though the whole row highlights. ~20 px target versus 40 px claimed | target size | 2.5.8 (AA) **passes** through the spacing exception (axe agrees). So a heuristic: the hit area equals the hover area, and the project claims 40 px | no. `target-size` runs only with the `wcag22aa` tag and **passed** the 16 px box in the probe | **R-HIT**: `get box <row>`, `get box <label>`, `mouse move X Y`, `mouse down left`, `mouse up left`, `is checked <box>` at points in the padding; `hover <row>` and the computed background; `eval --stdin < hit-grid.js` | yes. Probe: padding clicks give `false` and the label click `true`. Toggle coverage of the row is 0.20 | yes. `checkbox-row.tsx:29-41` (the label wraps only the text) | Iteration 1 **hit** it with coordinate clicks plus label and row boxes |
| AS-2 | The focus ring surrounds only the 16 px box, not the row | focus visibility | No SC fails: 2.4.7 is met, and 2.4.13 (AAA) is measured on the checkbox. Heuristic: the ring matches the hit and hover area | no | **R-RING** on the checkbox (`press Tab`), then compare the ring rect with the row rect | yes. Probe: ring `[24,198,24,24]` against row `[16,192,340,36]`, `ringEnclosesRow:false` | yes. `checkbox-row.tsx:45` | Iteration 1 missed it: nothing in the charter treated "ring ≠ target" as a finding |
| AS-3 | The accessible name runs together, «Docker58%», with no separator and no «delle ricerche» | accessible name | 1.3.1, 2.4.6 and 4.1.2 (a name that does not say what 58% is). Not 2.5.3: the name contains the visible text | no (`label` passes) | `snapshot -s <row>` gives `checkbox "<name>"` | yes for the missing context. **The run-together form depends on the engine and on CSS** (probe, §3) | yes. `checkbox-row.tsx:72-73` | Iteration 1 **hit** it and reported «Docker 58%» with a space, the Chromium form for flex children |
| AS-4 | The tick SVG has `<title>Selezionata</title>` and is not hidden → an extra announcement | accessible name | Heuristic: a decorative state icon is redundant next to `checked`. No SC fails (1.1.1 is met) | no. `svg-img-alt` applies only to `role=img` SVGs and checks only that a name exists | Full `snapshot -s <row>` (not `-i`) gives `image "Selezionata"` beside the checkbox | yes. Probe: `image "Selezionata"` | yes. `checkbox-row.tsx:54-59` | Iteration 1 missed it: the image node is visible only in a full snapshot, and nobody read the row for it |

## 2. What iteration 1 and the baseline caught on the UI subset, and how

**Iteration 1: 4 hits out of 16.**

| ID | Verdict | How it got the evidence |
|---|---|---|
| LS-2 | hit | Open at 1280, then resize to 375 (`set viewport`), then measure the card: «stays 840 px wide at x=220» (shot `18-resize-1280-to-375-open.png`). Plus code: «Geometry is set only in `promote`» |
| SS-12 | hit | **axe-core 4.10.2 injected from cdnjs** (a download; it was not in `node_modules`), run in the forced 30/30 state: «axe color-contrast … «30/30» in amber-600, 3.2:1 (chips.tsx:213)» |
| AS-1 | hit | **Coordinate clicks plus geometry**: «The label is 694–988 × 276–296 inside a 660–996 × 270–302 row. Clicks at (663,286), (990,286) and (800,272) do not toggle, yet the whole row highlights on hover» |
| AS-3 | hit | **The accessibility tree** (`snapshot`): «Checkbox names read «Docker 58%» with nothing saying what the percentage is». It saw a space, not the run-together form, and was scored a hit on the missing «delle ricerche» |

Partials, which show where the evidence existed but the bar or the coverage failed:
- **LS-1:** the shot existed, and the card was judged fine.
- **LS-7:** the clipped ring was found on the wrong element.
- **SS-1:** the sweep ran with fixture names.
- **SS-7:** the check covered the keyboard path only.
- **SS-8:** it was left as a manual check, because «Touch emulation did not take here (`navigator.maxTouchPoints=0`)».
- **SS-9:** the jump was measured at desktop width only.
- **SS-10:** the English name was found, not the Tab order.
- **SS-11:** the name was judged against the action, not against the visible text.

Misses: LS-5, LS-6 (motion), AS-2, AS-4.

How it worked: the iteration-1 `ux-advisor` charter (`benchmark/iter1/agent-diff.patch`) added:
- `set device "iPhone 14"` for touch emulation, which was ineffective;
- a full `snapshot`;
- «screenshot the focused control to check that its ring is visible and not clipped»;
- a width sweep from 320 to 1280 in ~40 px steps;
- «Move the trigger»;
- axe «in every state you force», from `node_modules`, else «a pinned CDN build».

**Old baseline (`FLOW.md`): 1 hit out of 16 (SS-8)**, from reasoning, with no browser. Its own header says «senza nessuna misura nel browser». The hit is P8, «Sugli schermi touch l'apertura non apre la tastiera». It is a requirement derived from the design, so it is a hit with zero runtime evidence. Its 9 partials (LS-1, LS-2, LS-5, LS-6, SS-1, SS-7, SS-9, SS-12, AS-1) came from spec-level rules (for example «si ferma alla larghezza disponibile meno i margini» and FR-FB7 «supera il minimo AA (24 px) a ~32 px»).

## 3. Probe results (`probe/index.html`, served on 127.0.0.1:8765, session `uiprobe`)

The probe page reproduces these patterns:
- P1, the LS-7 ring clipped by `overflow:hidden`;
- P2, the AS-1 to AS-4 checkbox row;
- P3, the SS-12 12 px amber counter;
- P4, the SS-11 label-in-name variants;
- P6, the SS-1 chip preview;
- P7, the LS-2 overlay with geometry fixed at open;
- P8, the SS-9 re-centering modal with an English «Dismiss» last;
- P9, accessible-name concatenation variants (injected).

### 3.1 Evidence recipes (all tested unless marked)

These are exact commands. **Always pass absolute output paths, and wrap every `eval` in an IIFE** (see the surprises below).

- **R-RING (focus ring visibility and clipping).** Run `press Tab` (or `Shift+Tab`) until `eval "document.activeElement.id"` names the target. Then run `set viewport 1280 800 2`, then `screenshot "<container selector>" /abs/NN-focus.png`, then `eval --stdin` with:
  ```js
  (() => { const el = document.activeElement, cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const ext = parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth);
    const ring = {left: r.left-ext, top: r.top-ext, right: r.right+ext, bottom: r.bottom+ext};
    let a = el.parentElement, clip = null;
    while (a) { const s = getComputedStyle(a); if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { const b = a.getBoundingClientRect(); clip = {left: b.left+parseFloat(s.borderLeftWidth), top: b.top+parseFloat(s.borderTopWidth), right: b.right-parseFloat(s.borderRightWidth), bottom: b.bottom-parseFloat(s.borderBottomWidth)}; break; } a = a.parentElement; }
    const cut = clip && {left: Math.max(0, clip.left-ring.left), top: Math.max(0, clip.top-ring.top), right: Math.max(0, ring.right-clip.right), bottom: Math.max(0, ring.bottom-clip.bottom)};
    return JSON.stringify({outline: cs.outlineStyle+' '+cs.outlineWidth+' offset '+cs.outlineOffset, ring, clip, clippedPx: cut}); })()
  ```
  The outline math covers `outline` rings. A `box-shadow` ring (Tailwind `ring-*`) needs the shadow spread parsed from `cs.boxShadow` instead. That case is untested. The screenshot covers both.
- **R-HIT (hit area against hover area).** Run `get box <row>`, `get box <label>` and `get box <input>`. For each point in the row's padding and gaps, run `mouse move X Y`, `mouse down left`, `mouse up left` and `is checked <input>`. Then `hover <row>`, then `eval "getComputedStyle(document.querySelector('<row>')).backgroundColor"`. For a coverage figure, `eval` an IIFE that samples `document.elementFromPoint` on a 4 px grid over the row and counts the points that land in the `<label>` or `<input>`.
- **R-NAME (accessible names).** Run a full `snapshot -s "<scope>"` (not just `-i`: images and StaticText children only appear in the full tree). Read each control's name next to its visible StaticText.
- **R-AXE.** On 0.27.1: `eval --stdin < <project>/node_modules/axe-core/axe.min.js`, then `eval --stdin` with `(async () => JSON.stringify((await axe.run(document, {runOnly: {type:'rule', values:[…]}})).violations))()`. Re-inject after any navigation, reload or `vitals`. On ≥0.33: `a11y --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa --selector <scope> --json`.
- **R-SWEEP.** For each width `w`: `set viewport w 800`, then `eval` an IIFE that returns the distinct `Math.round(getBoundingClientRect().top)` values of the container's children, the row index of the target and `document.documentElement.scrollWidth > innerWidth`.
- **R-RESIZE.** Open at 1280, then `set viewport 375 812` (or swap the width and height for a rotation), then `get box <overlay>` and `eval "innerWidth"`.
- **R-JUMP.** First `eval` an IIFE that starts a `PerformanceObserver({type:'layout-shift'})` pushing `{value, hadRecentInput, sources:[node, previousRect.y, currentRect.y]}` into `window.__shifts`. Then act. Then `eval "JSON.stringify(window.__shifts)"`. Add `get box` before and after the action, and `diff screenshot --baseline /abs/before.png -o /abs/diff.png`.
- **R-EDGE.** `eval "scrollTo(0, Y)"` (or `scrollintoview <trigger>`) to put the trigger at the top, middle and bottom. Then open, run `get box <overlay>` and `eval "innerHeight"`, and take a screenshot.
- **R-MOTION** (not probed). `eval` an IIFE that starts an rAF loop recording `getComputedStyle(el).opacity` or `el.getBoundingClientRect().height` with `performance.now()` into `window.__frames`. Then act, `wait 600`, and read the frames back. `document.getAnimations()` lists the running animations and their timing. Use `record start/stop` for a video, and repeat under `set media light reduced-motion`.

### 3.2 Outputs (trimmed)

- **`snapshot`** (full):
  - `checkbox "Docker 58%" [checked=false, ref=e16]`, then `StaticText "Docker"` and `StaticText "58%"`;
  - **`image "Selezionata"`** for the tick SVG (AS-4 is visible);
  - `button "Mostra altre 28 competenze"` → `StaticText "+28"`, and `button "Mostra altre competenze"` → `StaticText "+28"`.
- **`snapshot -i -s "#modal"`**:
  - `heading "Competenze"`
  - `button "rifiuta"` (twice)
  - `button "Salva"`
  - `button "Dismiss"`, listed last
- **`get box`:**

  | Element | Box (x, y, width × height) |
  |---|---|
  | checkbox | `28, 202.17, 16×16` |
  | label | `28, 200.38, 118.06×19.59` |
  | row | `16, 192.38, 340×35.59` |
  | an element with `display:none` | `0,0,0,0`, with no error |
- **`get styles`** dumps all ~400 computed properties, about 10 kB per element. The counter's `background-color: rgba(0, 0, 0, 0)` is its own background, not the effective one. Unusable for contrast without an ancestor walk. `color: rgb(217, 119, 6)` and `font-size: 12px` are correct.
- **R-HIT:** `{"row":[16,192,340,36],"label":[28,200.4,118.1,19.6],"box":[28,202.17,16,16],"toggleCoverage":"0.20"}`.

  | Click at | `is checked` |
  |---|---|
  | (300,210), in the row's padding | `false` |
  | (20,196), in the row's padding | `false` |
  | (100,210), on the label | `true` |

  After `hover`, the row background goes from `rgba(0, 0, 0, 0)` to `rgb(241, 245, 249)`.
- **R-RING (P1):** `{"outline":"solid 2px offset 2px","clipAncestor":{"sel":"shell",…},"clippedPx":{"left":0,"top":0,"right":4,"bottom":4}}`. The element screenshot at DPR 2 (`shot-p1-focus-el.png`) shows the ring present on the left and top and cut on the right and bottom.
- **R-RING (P2):** `{"ring":[24,198.17,24,24],"row":[16,192,340,36],"ringEnclosesRow":false}`, shot `shot-p2-focus.png`.
- **axe 4.11.1, default `axe.run`:**
  - `color-contrast`, on `#p3-counter`: 3.18 (#d97706 on #ffffff, 12px);
  - `color-contrast`, on `#p1-cancel` and `#p1-confirm`: 4.1 (#f8fafc on #1e77eb, 14px);
  - nothing else UI-relevant.
- **Which rules run under which option:**
  - The default run includes neither `target-size` nor `label-content-name-mismatch`.
  - `runOnly` with tag `wcag22aa` ran **only** `target-size`, with 0 violations.
  - Tag `wcag21a` does **not** include `label-content-name-mismatch`.
  - Explicit rule run:
    - `target-size` **passes** `#p2-box` (16 px, spacing exception);
    - `label-content-name-mismatch` flags `#p4-b` (name without "28") and `#p4-c` («Modifica competenze» named «Apri modifica»);
    - `label-content-name-mismatch` **passes** `#p4-a` ("+28" named "Mostra altre 28 competenze").
- **Accessible-name concatenation in Chromium (P9).** Visual separation by a CSS margin on inline spans gives **`checkbox "Docker58%"`**. Flex, inline-block or grid children give `checkbox "Docker 58%"`. In P2 (inline-flex label) the `LabelText` node read "Docker58%" while its checkbox read "Docker 58%".
- **R-SWEEP (P6):**

  | Viewport | Card width | Chip rows | «+N» on row |
  |---|---|---|---|
  | 280 | 248 | 4 | 4 |
  | 300 | 268 | 3 | 3 |
  | 340 | 308 | 3 | 3 |
  | 360 | 328 | 3 | 3 |
  | 375 | 343 | 3 | 3 |

  Horizontal overflow `true` below 360, caused by the probe's fixed-width P1/P2 blocks. The technique works.
- **R-RESIZE (P7):** `get box "#overlay"` gives `x 220, width 840` at 1280 and again at 375 (`innerWidth` 375). This is the iteration-1 LS-2 finding, reproduced.
- **R-JUMP (P8):**
  - The modal moves from `y 310.16, h 179.67` to `y 320.66, h 158.67`, and Salva from `y 455.84` to `y 445.34`.
  - The layout-shift observer recorded `{"v":0.0001,"recentInput":true,"nodes":["LI [399.8→389.3]","LI [420.8→410.3]","m-save [455.8→445.3]","m-close [455.8→445.3]"]}`.
  - `diff screenshot --baseline …` reported `✗ 0.57% pixels differ … 5878 different / 1024000`. The diff image outlines the whole modal shifted.
- **`vitals`:** `cls: 0` (and `{"cls":{"entries":[],"score":0.0}…}` with `--json`).
- **`set device "iPhone 14"`:** `{"w":390,"h":844,"dpr":3,"mtp":0,"coarse":false,"hoverNone":false,"touchEvt":false, ua: "…iPhone OS 16_0…"}`. `iPhone 15` gives 393×852, also with no touch. A reload does not change this.
- **`--args "--touch-events=enabled"`** (separate session): `ontouchstart` becomes `true`, but `maxTouchPoints` stays 0 and `pointer: coarse` stays `false`.
- **`set media dark reduced-motion`:** both match. A later `set media light` also resets reduced motion to `false`.

### 3.3 Surprises

1. **`focus <sel>` does not trigger `:focus-visible`** (`fv=false`, while `press Tab` gives `fv=true`), so no ring is painted. A reviewer that uses `focus` before screenshotting will report "no visible focus" falsely. Use `press Tab`.
2. **`vitals` reloads the page.** After it, the injected axe was gone, the injected P9 section was gone and the open modal was closed. CLS also ignores shifts within 500 ms of input, so it can never see an interaction-triggered jump. Use the layout-shift observer from `eval` (it reports `hadRecentInput:true` entries with their sources).
3. **Relative screenshot paths resolve against the daemon's working directory** (where the session was first started), not the caller's. Two probe shots landed in the repo root and were moved out. `ui-reviewer` must always pass absolute paths.
4. **`eval` keeps top-level `const` and `let` across calls** (`SyntaxError: Identifier 'el' has already been declared` on the second call). Wrap every script in an IIFE.
5. **`set device` is not touch emulation.** It sets the viewport, DPR and user agent only. Iteration 1's charter line «touch emulation: where focus lands, what the keyboard would cover» cannot deliver; iteration 1 noticed this itself (`maxTouchPoints=0`, `pointer: fine`).
6. **`get styles` reports the element's own background** (often transparent) and is 10 kB of noise. Contrast needs axe or an ancestor walk.
7. **`snapshot -i` does not mark the focused element.** Use `eval "document.activeElement…"`.
8. **`diff screenshot -s <sel>` against a full-viewport baseline** reports "100.00% pixels differ" instead of a dimension error. The baseline and the current shot must have the same scope.
9. **The accessible name is engine- and CSS-dependent** (P9). Chromium's tree can show «Docker 58%» where another engine, or a different `display`, gives «Docker58%». Chromium is not proof of what VoiceOver reads.
10. **axe ran fine from a local file through `eval --stdin`** (560 kB, `axe.version` gave 4.11.1), so no CDN is needed when the project has `axe-core` in `node_modules`. Iteration 1 used cdnjs instead.

## 4. The iOS provider and the a11y/axe question

**The `-p ios --device "<name>"` provider (0.27.1 README, upstream docs, upstream source).**
- **What it needs.** «macOS with Xcode installed», iOS Simulator runtimes, and «Appium with XCUITest driver» (`npm install -g appium && appium driver install xcuitest`). The binary's own doctor string reads «iOS: appium binary not found on PATH».
- **This machine.** Xcode is at `/Applications/Xcode.app`, and `agent-browser device list` shows iOS 26.2 and 27.0 simulators (two are already booted by something else and were left alone). **Appium is not installed**, so the provider cannot run here.
- **Do not try it in a no-download context.** Upstream launches Appium as `npx appium … --relaxed-security`, with a fallback to a global binary, and the 0.27.1 binary has the same strings. A first `-p ios` run could therefore fetch Appium from npm.
- **What it drives.** It drives **real Mobile Safari** in the Simulator (`browserName: Safari`, `automationName: XCUITest`, `noReset: true`), or a real device over USB once WebDriverAgent is signed.
- **What is unsupported.** Tabs, PDF, screencast, `--annotate`, and every action in `WEBDRIVER_UNSUPPORTED_ACTIONS`: `a11y`, trace, profiler, `route`, `network`, HAR, `addinitscript`.
- **What is supported.** `evaluate` (W3C `execute/sync`), so `getBoundingClientRect` and `getComputedStyle` through `eval` work. Also `screenshot`, `click`/`tap`, `fill`, `swipe`, and `snapshot -i`, which is documented. `get box` and `get styles` on WebDriver are unverified.
- **Screenshots.** An XCUITest screenshot captures the **entire screen**, status bar and Safari's top and bottom panels included. That is what SS-9's «Salva under the iOS toolbar» needs.
- **The virtual keyboard.** By default Appium **forces the software keyboard on** in simulators (`forceSimulatorSoftwareKeyboardPresence` defaults to true). But agent-browser sends no `nativeWebTap`, so its taps are JS clicks in the web context. iOS Safari shows the keyboard on `focus()` only inside a trusted user gesture (WebKit bug 195884). So SS-8 will **probably not** reproduce through `-p ios tap`. It needs native taps: Appium `nativeWebTap`, which agent-browser does not expose, or the Simulator's own HID input.
- **What the snapshot shows.** On WebDriver the snapshot is built from the DOM, not WebKit's accessibility tree, so it will not show what VoiceOver reads (AS-3). This is inferred from the backend design and is unverified.

**The `a11y`/axe question.** Yes, there is one, but not in 0.27.1.
- **0.33.0** added «axe-core accessibility audits with `agent-browser a11y [url]`, WCAG tag filtering, selector scoping, iframe-aware text and JSON results, an embedded offline and CSP-safe audit engine». The latest version is **0.38.2**.
- The flags are `--tags`, `--selector` and `--json`. Default output lists violations **and incomplete** checks.
- «Accessibility audits require a CDP browser and are not available with Safari or iOS WebDriver sessions.»
- Whether `--tags experimental` reaches `label-content-name-mismatch` is unverified.

Caveats for any axe route, verified in the probe with axe 4.11.1:

| Rule | Status | Effect on the 14 non-motion defects |
|---|---|---|
| `target-size` | `enabled:false`. Runs only through the `wcag22aa` tag or by explicit name | Passes 16 px controls that have spacing, so it misses AS-1 |
| `label-content-name-mismatch` | `experimental`. Not in the default run or the `wcag21a` tag | Strips punctuation, so it passes "+28" against a name containing "28" |
| `svg-img-alt` | Applies only to `role=img` SVGs | Does not see AS-4 |
| Focus indicators (2.4.7, 2.4.11, 2.4.13) and 1.4.11 | No axe rule tests them | — |

Of the 14 non-motion defects, **axe catches 1 by default (SS-12)**, and at most one more (SS-11) with an experimental rule and an unlucky implementation.

## 5. Detectability ceiling (14 non-motion defects)

| Tier | Defects | Count |
|---|---|---|
| Shown with evidence in **desktop Chromium** (0.27.1, no new installs) | LS-1, LS-2, LS-7, SS-1 (worst-case data), SS-10, SS-11, SS-12, AS-1, AS-2, AS-3 (missing context; the run-together form is engine-dependent), AS-4 | **11** |
| Half in Chromium | SS-9 (the jump yes, the iOS toolbar no) | +1 partial |
| Added by the **iOS provider** (once Appium and XCUITest are installed) | SS-9 toolbar (full-screen Mobile Safari screenshot). SS-7 is *possible*: Safari does not focus clicked buttons, but WebDriver clicks may focus through atoms (unverified) | **+1, maybe +2** |
| **Only from code** (or a real device or Simulator with native taps) | SS-8 (the keyboard covering Salva: JS taps do not raise the keyboard), and SS-7 for desktop Safari and Firefox for certain (`focus.ts` plus engine knowledge). Chromium shows only SS-8's precondition (focus lands in the input) and SS-7 through an eval emulation | **1–2** |

Ceiling: **11 of 14** in Chromium, **12–13 of 14** with the iOS provider, and **1–2 only from code**. Iteration 1 hit 4. At least 7 of the gaps were evidence-reachable with the commands iteration 1 already ran: LS-1, LS-7, SS-1, SS-10, SS-11, AS-2 and AS-4. **The bottleneck is the charter, the bar and the coverage, not the tooling.**

## Sources

- agent-browser 0.27.1: the local README, `--help`, `skills get core --full`, `skills get dogfood`, and the binary strings at `~/Library/pnpm/global/5/.pnpm/agent-browser@0.27.1/node_modules/agent-browser/`
- The bundled skill `assets/skills/agent-browser/` (`SKILL.md`, `references/commands.md`) is **stale against 0.27.1**. It describes a «Node.js fallback» and does not mention the iOS provider, `vitals`, `diff screenshot`, `a11y` or the `focus`/`:focus-visible` pitfall.
- Changelog: https://github.com/vercel-labs/agent-browser/blob/main/CHANGELOG.md (0.33.0 `a11y`, latest 0.38.2)
- Command docs: https://agent-browser.dev/commands
- iOS docs: https://agent-browser.dev/ios
- WebDriver backend: https://raw.githubusercontent.com/vercel-labs/agent-browser/main/cli/src/native/webdriver/backend.rs
- Appium launch: https://raw.githubusercontent.com/vercel-labs/agent-browser/main/cli/src/native/webdriver/appium.rs
- Appium XCUITest capabilities: https://appium.github.io/appium-xcuitest-driver/latest/reference/capabilities/
- Safari screenshot is full screen: https://discuss.appium.io/t/screenshot-on-ios-safari-browser-only/27250
- Programmatic focus without a gesture does not raise the keyboard: https://bugs.webkit.org/show_bug.cgi?id=195884
- Safari does not focus clicked buttons: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button (Clicking and focus)
- axe rule list: https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
- axe `target-size` rule: https://raw.githubusercontent.com/dequelabs/axe-core/develop/lib/rules/target-size.json
- axe `label-content-name-mismatch` rule: https://raw.githubusercontent.com/dequelabs/axe-core/v4.10.2/lib/rules/label-content-name-mismatch.json
- axe API: https://github.com/dequelabs/axe-core/blob/develop/doc/API.md
- WCAG 2.2 Understanding:
  - https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
  - https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
  - https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
  - https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
  - https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
  - https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
  - https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
  - https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html
  - https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
  - https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
- 1.4.12 Text Spacing maps to none of the 16 defects. The `eval` technique (inject the spacing CSS, then look for clipping) is noted but was not probed.
