# Static-UI review: company onboarding, "Tutto in uno" (control run)

Route `http://localhost:3104/prototypes/company-onboarding`, session `ui-control-company-onboarding` (closed at the end).
Scope is the static UI only: placement, widths and wrapping, contrast, how visible the focus indicator is, target size and hit area, accessible-name markup, browser and device rendering, and instant re-layouts. UX, motion and aesthetic direction are left to their owners and listed under "Handed off".

## Setup and the bar I applied

The project has no UI bar (`brain/chore/ui-review.md` is absent), so these defaults applied:

- **Contrast:** WCAG 2.2 AA. Text needs 4.5:1 (3:1 for large text). Non-text needs 3:1: control boundaries, state indicators and focus indicators.
- **Reflow:** nothing may scroll horizontally at 320 CSS px.
- **Text spacing (1.4.12):** must not cause loss or overflow.
- **Focus:** must be visible and not obscured.
- **Targets:** at least 24×24, or the 2.5.8 spacing exception. On touch, 44×44 is advisory.
- **Names:** name, role and value must be exposed. Visible labels must be programmatically tied to their controls.
- **Widths:** 320, 360, 375, 390, 414, 430, 480, 560, 640, 768, 1023, 1024, 1280 and 1440, with heights from 568 to 1024. I also tried landscape 812×375, `prefers-reduced-motion: reduce` and `prefers-color-scheme: dark` (dark has no effect: the app has no colour-mode provider).
- **Engine:** headless Chromium 149 only. `agent-browser` offers no WebKit or Firefox engine here (see D15).
- **States covered:**
  - S1 and S1b.
  - S2: 320 only, because it lasts 1.9 s.
  - S3 with all three fixtures F1, F2 and F3.
  - S3a (text row and select row, including the open popovers), S3b, S3c.
  - S4 mid-build and in reduced motion.
  - S5 from the LinkedIn path and from the manual path.
  - M1 to M6.
- **Tools, all in this folder:**
  - `probe.js`: overflow, truncation, targets, composited text contrast and missing names.
  - `sweep.sh`: resizes across widths, runs the probe and takes a screenshot.
  - `text-spacing.js`: the 1.4.12 overrides.
  - Results are in `data/` and `shots/`. Full-page shots draw fixed elements (the progress bar and the picker) at the wrong offset, so I read fixed elements from viewport shots only.
- **Excluded as not the variant:**
  - The harness picker.
  - The TanStack devtools button.
  - The global app footer, except where its interaction with the variant's shell matters (D12).

## Decisions the project must make

They are ordered by impact. Each one cites what I observed.

### D1. How a closed review row lays out when its value does not fit (S3, M6)

On phones, the values the user is asked to confirm are the ones that disappear, and at 320 the page scrolls sideways.

- **The cause** (`review-list.tsx` L169–200): one line holds the label (`shrink-0`), the "da confermare" pill, the LinkedIn glyph, the value (`truncate`) and the pencil. Only the value can shrink.
- **F3 Netflix**, visible width / needed width of each value (`data/s3f3-value-visibility-by-width.txt`):

| viewport | Settore | Sede principale | Indirizzo | Paese P.IVA | page width |
|---|---|---|---|---|---|
| 320 | 27/161 | **0/187, pencil outside the list** | **0/217, pencil outside** | **0/11, pencil outside** | **332 (horizontal scroll)** |
| 375 | 82/161 | 29/187 ("Lo…") | **2/217** | 9/12 ("I..") | 375 |
| 414 | 121/161 | 68/187 | 41/217 | ok | 414 |
| 480 | ok | 134/187 | 107/217 | ok | 480 |
| ≥560 (column capped at 512) | ok | ok | **187/217, never fully visible** | ok | — |

- **F1 Rossi:**
  - At 320 the address is 0 px wide and the page is 332 px wide.
  - At 375 the address is 2/217 px.
  - At 1280 it is 187/217 px.
  - Shots: `shots/s3f1-320.png`, `shots/s3f1-375.png`, `shots/s3f3-320.png`, `shots/s3f3-375-billing-2x.png`.
- **F2:** "Da aggiungere" itself truncates to "Da ag…" at 320 (`shots/s3f2-320.png`).
- **M6:** the address shows 50/217 px at 320 and 105/217 px at 375.
- **With text spacing** at 375, the F3 page grows to 400 px wide (`data/s3f3-textspacing-375.json`).

**Decide:**
- The narrow-width row pattern: stack the value under the label, let the value wrap to 2 lines, or move the pill to the label side.
- Whether a "da confermare" value must always be readable in full at 320.

### D2. Descrizione: a multi-sentence value in a one-line control

- **Closed row:** truncated to one line at every width (343 of 1202 px for F1, 343 of 1344 px for F3).
- **Opened:** it becomes a single-line `<input>` (`OpenRow` uses `Input` for every non-select row). At 375 the input is 293 px wide for a 184-character text that is 1212 px long, so about 24% is visible and only the tail shows: "zati su React, Shopify e integrazioni ERP" (`shots/s3a-descrizione-open-375-2x.png`).
- **The same field in M4** is a 4-row textarea.

**Decide:**
- The control for long text in the review: a textarea or an auto-growing field.
- How much of the value the closed row previews: one line or a 2–3 line clamp.

### D3. The "yellow rows" cue cannot be seen

- **The tint:** `bg-amber-50/40` composites to rgb(255,253,247), which is **1.02:1 against white**. Yet the S3 subtitle tells the user "conferma le righe in giallo" or "Completa le righe in giallo".
- **F2:** the only required-and-empty row (Indirizzo) has no pill. Its only cues are:
  - the 1.02:1 tint;
  - "Da aggiungere" in gray-400, at **2.56:1** on that tint, truncated at 320.
- **The red error tint** `bg-red-50/50` is about 1.04:1. It is backed by the error text line, so it matters less.

**Decide** what marks a row "waiting for you" with at least 3:1 against its surroundings and without relying on colour alone (1.4.1, 1.4.11). Options: a stronger fill, a left rule, an icon, or a pill for required-empty rows too.

What the copy means is UX's call. Whether the cue can be seen is the static-UI question.

### D4. Row hit area and affordance (S3, M6)

- **The button is a strip:** the closed-row button is **20–22 px tall inside a 44–47 px row**. Probes at the row's top padding, bottom padding and left padding all land on the `li`; only the middle strip opens the row (`data/m6-row-hit-area-375.json`).
- **No pointer affordance:** `cursor: default`, and no hover state.
- **Against the bar:** 2.5.8 passes only through the spacing exception. The row is under 44 px on touch.

**Decide:**
- Make the whole row the button (move `py-3` from the `li` into the button).
- The project's touch-target bar: 24 or 44 px.

### D5. Accessible names of review rows (S3, M6)

- **What is announced:** each row is `aria-label="Modifica <label>"`, so a screen reader announces only "Modifica Indirizzo di fatturazione, button" (`data/s3f1-a11y-tree.txt`).
- **What is lost:**
  - the value;
  - the "da confermare" state;
  - the LinkedIn source;
  - the VAT error line, which sits outside the button with no `aria-describedby` (S3b, S3c).

**Decide** the name and description contract. For example, the name is label plus value, "Modifica" is visually hidden, and the state and error go through `aria-describedby`.

### D6. Labels and descriptions not tied to controls (shared field primitives)

- **Select names:** `ProtoSelectField` (`shared.tsx` L72–90) renders a `<label>` with no `for` and does not use Kobalte's `Select.Label`. Each trigger is named only by its value or placeholder:
  - S3 rows: "Tecnologia e software", "Los Gatos, CA, United States".
  - M3: "IT".
  - **M4: two buttons both named "Seleziona…"**.
  - M5: "Seleziona…".
- **M4 textarea:** no label at all. Its name comes from the placeholder.
- **Required fields:** the name includes the asterisk ("Nome azienda *"), and there is no `required` or `aria-required`.
- **Help text and hints:** none have an id or are referenced by `aria-describedby`. I measured `null` on the S3 open-row inputs and the M2 fields; the S1 URL help is the same per the code.
- **S2:** its only heading is an `h3`. The screen has no `h1`.
- **ImportedBadge:** reads "LinkedIn 9 dati da LinkedIn" (the SVG label plus the text).

**Decide:**
- Wire labels and hints in the shared primitives (this carries over into production if they are ported).
- How required is expressed.
- The heading level on S2.

### D7. One focus indicator, with at least 3:1 contrast

- **Two treatments coexist on the same page** (`data/s3f1-tab-order-1280x900.txt`):
  - Design-system controls (`Button`, `Input`, `Select` trigger, `TextArea`) draw a **1.5 px ring in rgb(154,194,254): 1.82:1 against white** (`--ring: 216 98% 80%`) (`shots/s1-focus-ghost-2x.png`).
  - Review rows, the suggestion button and footer links get the browser's default outline: rgb(0,95,204), offset 0. It hugs the 20 px strip and overlaps the label's first glyph (`shots/m6-row-focus-375-2x.png`).

**Decide** a single focus style for the flow (and the `--ring` token) that reaches at least 3:1, with an offset.

### D8. Token-level contrast failures (all states)

Ratios are measured on the composited background (`data/*.json`, `contrastFails`):

| Element | Ratio | Needed |
|---|---|---|
| Step counter "1 / 2", "n / 6" (gray-400, 14 px) | 2.60 | 4.5 |
| "Facoltativa", "Da aggiungere" (gray-400) | 2.60 / 2.56 | 4.5 |
| "premi Invio ↵" (gray-400, 12 px, ≥ sm) | 2.60 | 4.5 |
| Primary button label (`--primary-foreground` on `--primary` #1e77eb) | 4.10 (3.54 on hover) | 4.5 |
| Outline "Cerca i freelance" (primary on white) | 4.29 | 4.5 |
| "N dati da LinkedIn" badge (primary on primary/10, 12 px) | 3.77 | 4.5 |
| Suggestion "Parti dalla sede…" (primary on the amber row) | 4.22 | 4.5 |
| Destructive alert title and body (S1b, S3c) | 3.29 | 4.5 |
| VAT error line (S3b) | 3.58 | 4.5 |
| Required asterisk | 3.76 | 4.5 |
| Input and select border `--input` #e2e8f0 on white | 1.23 | 3 (non-text) |
| Idle build-log row at opacity .45 (S4) | 1.83 | 4.5 |

**Decide** which tokens change (`--primary` used as text or background, `--destructive` used as text, `--ring`, `--input`), or where gray-400 stops being used for text. The brand owner picks the colours. This review only records the compliance gap.

### D9. The success card at narrow widths and with long sizes (S4/S5)

- **Horizontal scroll at 320:** the page is 333 px wide.
  - The grid column's min-content is 306 px. The cause is the industry skeleton `w-44` (176 px), which stays mounted after reveal: 64 + 16 + 176 + padding.
  - The card and the success copy are cut on the right (`shots/s5-320.png`, `shots/s5-manual-320-top-2x.png`).
- **Dimensione slot** (`h-7` with an absolutely positioned value):
  - **"501-1000 persone" wraps at every width, including 1280.** It overlaps the "Dimensione" label by 5 px and spills 22 px below the slot (`data/s5-manual-card-slot-overflow.txt`, `shots/s5-manual-card-1280-2x.png`).
  - Widths measured with the page fonts (my canvas calculation, not each one rendered):

| Size | Needed (px) | Fits a 160 px column (card 384) | Fits a 131 px column (vw 375) |
|---|---|---|---|
| 1-10 | 116 | yes | yes |
| 10-50 | 132 | yes | about at the limit |
| 51-200 | 148 | yes | no |
| 201-500 | 163 | **no** | no |
| 501-1000 | 179 | **no** | no |
| 1000+ | 134 | yes | about at the limit |

  - Observed: "10-50 persone" wraps at 320 and collides with the label.
- **Tags slot (`h-7`):** at 320, three tags ("Dal 2015", "Full remote", "rossidigital.it") wrap and spill 24 px onto the divider.

**Decide:**
- Whether the slots keep fixed heights (stable while revealing) but are sized for 2 lines, or are content-sized.
- How the size reads, for example with "persone" as a caption.
- Relative skeleton widths.

### D10. Minimum gap between header and content

- **Zero gap:** `main` has `pb-24` but no top padding. When the content is taller than the viewport, it starts right at the header's bottom edge (y = 64): S3 at all phone widths, and S1 in landscape 812×375.
- **On S5 the live card goes over the header:**
  - Card top: **54.7 px**, against a header bottom of 64.
  - "Attiva" badge top: 43.4 px, against a logo bottom of 44.
  - This happens at 320×568 and 375×812 (`shots/s5-320-top-2x.png`). At 414×896 there is room.
  - It is the resting state, not a frame of the animation. In reduced motion the lift applies instantly: card top 64 → 55.

**Decide** a guaranteed top gap in the shell that leaves room for the badge and the lift.

### D11. Scroll position carried across screen swaps

- **S3 → S4 at 375×812**, after scrolling down to the CTA:
  - `scrollY` goes from 589 to a clamped 158 on the 970 px-tall S4.
  - The header and the top of the card sit at −94 px (`shots/s4-start-375-after-scrolled-s3.png`).
  - On S5 the card top is at −103 px while focus is on "Vai alla dashboard".
- **At 1280×900**, S4 opens scrolled by 53 px, with the logo hidden (`shots/s4-mid-1280.png`).

**Decide** whether a swap resets to the top or scrolls the card into view. This overlaps with UX (where attention goes): flagged to both.

### D12. The global footer against the `min-h-screen` shell

- **Every screen scrolls:** the shell is `min-h-screen` and the global footer (`TrackerProvider`) follows it in normal flow. The overflow is 53 px on desktop: S1 at 1280×900 is 953 px tall. On phones the four links stack: S1 at 375×812 is 961 px tall.

**Decide:**
- Whether onboarding shows the global footer.
- If it does, whether the shell's height accounts for it.

### D13. Field sizing and widths in the manual flow and the open rows

- **M3, side by side** (`shots/m3-320-2x.png`):
  - The select is 40 px tall and the input 48 px (bottom edges at 384 and 392).
  - At 320 the `8rem 1fr` grid makes Numero 128 px wide, with 94 px of content space. An 11-digit Partita IVA needs 101 px, so it is clipped: the placeholder shows "1234567890".
- **Mixed sizes:**
  - M1 stacks an h-12 / 16 px field over an h-10 / 14 px one.
  - S3 open rows use h-10 / 14 px.
  - Input padding is 16 px, but textarea and select padding are 12 px.
- **S1 placeholder:** it needs 354 px but has 293 px at 375, so the example URL loses "rossi-digital".

**Decide** the field size scale (heights, font size, padding) for the flow, and the M3 column split at narrow widths.

### D14. Instant re-layouts with nothing animating (S3)

- **VAT check line:** the pre-check result appears **450 ms after the last keystroke** and pushes everything below it down by 22 px while the field is still open. The CTA row moves 1092 → 1114 at 1280. The user did not cause the shift at that moment.
- **Opening a row** grows the page by 67 px (address at 1280) or 83 px (at 375). This is expected for inline editing.

**Decide:**
- Whether to reserve the error line's space or render it in a stable slot.
- Whether the row-open growth is accepted.

### D15. Which engines and devices are in the bar

- **Engines:** only Chromium was available. WebKit and Firefox are unverified.
- **iOS Safari risk:** iOS Safari zooms the page when an input under 16 px gets focus. Affected fields:
  - Measured at 14 px: S3 open-row inputs and select triggers.
  - 14 px from the classes, not measured in the browser: M1 Sito web, M5 Sede and Anno, the M4 textarea.

**Decide:**
- The supported engines and the real-device pass.
- Whether touch inputs have a 16 px minimum.

### D16. Smaller placement items, each a yes/no

- **Baseline in rows with the LinkedIn glyph:** the label sits 2 px below the value (`items-baseline` with an SVG as the first flex child). Row heights vary from 44 to 47 px across the two lists (`data/s3f1-row-geometry-1280.json`).
- **S3 heading and badge:** below 480 px the `h1` wraps to 2 lines and the "N dati da LinkedIn" pill wraps too, making a 36 px-tall rounded pill (`data/s3-heading-badge-wrap.txt`).
- **Suggestion button:** at 320 it wraps and its text centres (the button's default `text-align`), while the rest of the row is left-aligned (`shots/s3f2-addr-open-320-2x.png`).
- **Ghost buttons at the start of a row** ("Non è su LinkedIn", "Cambia link", "Indietro"): their text starts 16 px to the right of the column edge that the labels align to (384 against 400 at 1280).
- **S2 at 320×568:** the last status line ends 7 px below the fold.

## Handed off (observed, not static UI)

- **To `ux-advisor`: where focus lands.**
  - On BODY after opening a select row.
  - On BODY on entering M1.
  - On BODY after S3c returns.
  - S3b and S3c errors are not announced.
  - The meaning of "righe in giallo" (see D3 for the visibility part).
  - "Modalità di lavoro" is missing from the M6 review.
- **To `design-engineer`:**
  - How long the idle build-log rows stay dimmed (their contrast is in D8).
  - The S4 → S5 swap itself.
- **Harness only, not a project decision:**
  - The picker (z-index max, bottom-centre) covers content, including the focused "Paese della Partita IVA" row at 1280×900 and the bottom of open popovers.

## Not checked

- WebKit, Firefox and real devices (D15).
- Forced colours / Windows high contrast.
- Browser zoom itself (approximated with CSS widths).
- S2 at widths other than 320.
- Whether the S3 subtitle swap (complete ↔ incomplete) changes line count.
