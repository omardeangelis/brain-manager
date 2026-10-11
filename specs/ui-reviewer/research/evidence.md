# Evidence review: what detects static-UI defects, and how well

For the `ui-reviewer` subagent design (brain-manager). Compiled 2026-10-06.

**How sources were read.** For each source I state how I checked it:
- **[full text]**: I read the paper PDF or HTML. PDFs were extracted to text locally and searched.
- **[abstract]**: I read only the arXiv or publisher abstract page.
- **[official doc]**: the vendor or standards document itself, such as rule JSON or W3C Understanding pages.
- **[vendor claim]**: a number published by a company that sells the tool.
- **[unverified]**: taken only from a search snippet or from memory.

Read the direction of the results, not the decimals. Most samples are small, and several of the 2025–26 items are preprints.

---

## A. Deterministic detection of layout, responsive and cross-browser failures

### A1. ReDeCheck: responsive layout failures (Walsh, Kapfhammer, McMinn, ISSTA 2017) [full text]
Source: https://eprints.whiterose.ac.uk/id/eprint/116989/ (accepted version PDF: https://eprints.whiterose.ac.uk/id/eprint/116989/10/c50-3.pdf)

- **Taxonomy.** Five responsive layout failure types (RLFs):
  1. *Element collision*: siblings overlap as the viewport narrows.
  2. *Element protrusion*: a child overflows its container, often invisibly because of `overflow:hidden`, which leaves links unclickable.
  3. *Viewport protrusion*: content leaves the horizontally visible body.
  4. *Small-range layout*: a layout that exists only for a few pixels of width, usually from clashing `min-width`/`max-width` media queries at the same breakpoint.
  5. *Wrapping*: a row of horizontally aligned children drops an element onto an extra line.
- **Model.** It renders the DOM at many widths. For each element pair it records alignment, containment, sibling, overlap and visibility constraints, each annotated with the width range where it holds (the "responsive layout graph"). The detectors look for changes in those relationships between adjacent widths, so no design oracle is needed.
- **Sweep.**
  - Range: 320–1400 px.
  - Samples: every 60 px, plus every breakpoint parsed from the page's CSS.
  - Localisation: binary search between two adjacent samples whose layout differs, to find the exact width where it changes.
  - Small-range threshold: 5 px or less.
  - Driver: Firefox via Selenium.
- **Results.** 26 real production pages; failures on 16 of them; 33 distinct failures. Report counts by type:

  | Type | TP | FP | NOI |
  |---|---|---|---|
  | Collision | 8 | 0 | 24 |
  | Element protrusion | 3 | 0 | 36 |
  | Viewport protrusion | 24 | 0 | 23 |
  | Small-range | 152 | 43 | 0 |
  | Wrapping | 10 | 5 | 0 |

  "NOI" means non-observable issue: overlap or protrusion exists at the coordinate level but cannot be seen, because of transparent padding or `overflow:hidden`.
- **Deduplication.** The 328 reports collapsed to 137 distinct viewport ranges and only 33 distinct failures. The extreme case was one grid glitch that produced 147 small-range reports. The authors argue that developer effort scales with the number of distinct *ranges*, not reports.
- **Preset widths miss failures.** Checking only the preset widths of five popular responsive-testing tools would have revealed 66–81% of the 33 failures; 21 random widths revealed 72%; all methods together revealed 85%. Run time was 60 s or less for most pages and about 4.5 min at most.
- **Implications for the agent:**
  - A width sweep finds failures that device presets miss.
  - Raw box-overlap checks produce many invisible "failures".
  - The two FP sources are coincidental alignment (small-range) and misclassified rows (wrapping).

### A2. VISER / VERVE: visual confirmation of DOM-reported RLFs (Althomali, Kapfhammer, McMinn, ICST 2019; STVR 2021) [full text, STVR version]
Source: https://eprints.whiterose.ac.uk/165542/ (CC-BY PDF: https://eprints.whiterose.ac.uk/165542/8/stvr.1756.pdf)

- **Method.** For each reported failure, set the opacity of the implicated elements to 0, screenshot, restore, screenshot again, and diff the images. No visible difference means NOI; a difference means a true positive (TP). Small-range failures are classified with histogram image comparison.
- **Agreement with manual classification:**

  | Subjects | Collision/protrusion | Wrapping | Small-range |
  |---|---|---|---|
  | Original 25 pages | 86.3% | 78.6% | 98.5% |
  | 20 new pages (143 failures) | 91.8% | 64.7% | 73.6% |

  About 4 s per classification, across 469 failures.
- **Where humans and the tool disagreed.** VISER disagreed with humans on 28 failures, and 3 of those were later reclassified as FPs. Many disagreements were differences of about 2 px that humans called invisible.
- **Implication.** "Measure in the DOM, then confirm with an opacity-toggle screenshot diff" is cheap and directly executable with JS eval plus screenshot diff.

### A3. X-PERT and XFix: cross-browser inconsistencies (Roy Choudhary, Prasad, Orso, ICSE 2013; Mahajan et al., ISSTA 2017)
- **X-PERT [abstract only; preprint link is 404].** Source: https://2013.icse-conferences.org/content/x-pert-accurate-identification-cross-browser-issues-web-applications.html
  - Categories: behaviour, layout ("structure") and content (text or visual) inconsistencies.
  - Layout is compared through relative-layout alignment graphs across browsers; content through visual comparison of matched elements.
  - Reported precision of 76% and recall of 95% on 14 pages: **[unverified]**, from a search snippet only; the paper could not be opened.
- **XFix [full text].** Source: https://eprints.whiterose.ac.uk/116990/7/c48.pdf
  - Layout inconsistencies appear in over 56% of sites that have cross-browser problems (citing X-PERT).
  - XFix repaired 86% of the layout inconsistencies X-PERT reported on 15 pages.
  - The authors chose subjects manually, not with X-PERT, because X-PERT reported many subjects whose inconsistencies were difficult to observe. That is again a precision gap between DOM detection and human visibility.

### A4. XBIDetective: VLM screenshot comparison for cross-browser inconsistencies (Grewal et al., Mozilla; ICSE-SEIP 2026, arXiv 2512.15804) [full text, HTML]
Source: https://arxiv.org/html/2512.15804v1

- **Setup.** Firefox and Chrome screenshots compared by Gemini 2.0 Flash (base, thinking and fine-tuned variants) on 1,052 WebCompat/Bugzilla reports.
- **Results:** thinking model accuracy 77%, precision 69%, recall 48%; fine-tuned model accuracy 79%, precision 72%, recall 59%.
- **Top false-negative cause.** Missed *layout* differences (34), then pop-ups (24), dynamic elements (15) and images not rendering (13).
- **Prompting effect.** Telling the model to identify ads and dynamic elements first, then ignore them, was essential. Without the ad pre-pass, "significant-visual" false positives rose from 5 to 56.
- **Implication.** Screenshot-only VLM comparison misses about half of real inconsistencies, mostly the layout ones.

### A5. WebCompat / XCompat: cross-environment rendering of generated pages (Guo et al., arXiv 2608.12518, Aug 2026, preprint) [full text, HTML]
Source: https://arxiv.org/html/2608.12518

- **Dataset.** 2,032 annotated instances: pages from 8 generators rendered on 9 BrowserStack real device and browser combinations, including iPhone 13 Safari.
- **Symptoms.** 68% of generated pages had at least one compatibility issue (human-written pages: 40%, 24 of 60). Most symptoms were page-level, such as a shrunken layout with tiny fonts or scale mismatches that cut content off.
- **Detection on the test set (F1):**

  | Detector | F1 |
  |---|---|
  | XCompat (rules over DOM geometry plus screenshots) | 0.903 (P 0.917, R 0.889) |
  | ReDeCheck | 0.45 (precision 0.34) |
  | GPT-5.5, DOM only | 0.851 |
  | GPT-5.5, DOM plus screenshots | 0.779 |
  | Claude Opus 4.8, DOM only | 0.856 |
  | Claude Opus 4.8, DOM plus screenshots | 0.728 |

  **Adding screenshots made both LLMs worse.** The authors attribute this to visual noise drowning the clearer DOM signals: viewport size, overflow flags and element geometry.
- **Robustness.** XCompat's thresholds (viewport 800 px, content-fill 0.75, mobile wide-content 2.0) were insensitive to ±5–10% changes.

### A6. Other deterministic lines
- **MFix (Mahajan et al., ICSE 2018) [full text].** Source: https://eprints.whiterose.ac.uk/127563/8/paper.pdf
  - Uses Google's Mobile-Friendly Test as its oracle, with three problem types: font size, tap-target spacing, and content wider than the viewport.
  - Repaired 95% of subjects.
  - That deterministic oracle is now retired; note this from memory, **[unverified]**.
- **Visual regression (pixel diff) [official doc].** Source: https://playwright.dev/docs/test-snapshots
  - Playwright warns that rendering varies with OS, version, settings, hardware, power source and headless mode. Baselines must come from the same environment, and the `maxDiffPixels` tolerance is the knob.
  - Pixel diff needs a baseline, so it detects change, not defects.
  - No precision or recall figures found.
- **Not found.** No published precision/recall for "layout dumping" beyond the alignment-graph tools above (X-PERT, ReDeCheck).

### A7. What an LLM agent with a browser CLI can execute cheaply (derived from A1–A5; my synthesis)
1. **Geometry dump per width.** One `eval` returns, for visible elements:
   - `getBoundingClientRect`;
   - computed `overflow`, `position`, `opacity` and `visibility`;
   - the parent chain's clip rects;
   - `document.documentElement.scrollWidth` against `clientWidth`.

   Flag:
   - viewport protrusion (`right > innerWidth`, `left < 0`, horizontal page scroll);
   - child outside a clipping ancestor (element protrusion);
   - sibling intersection (collision);
   - minimum distance from text or controls to the viewport edge, a house threshold for "pressed against the edge" (no paper defines this);
   - row count for flex or inline rows (wrapping).
2. **Sweep.** Use ReDeCheck's recipe: 60 px steps plus the CSS breakpoints ±1 px, and binary-search any width pair whose geometry signature changes. Report width *ranges*.
   - Go below 320 px. WCAG 1.4.10 Reflow uses a 320 CSS px reference, and folded phones are narrower; the fold-phone width is **[unverified]** from memory.
   - The user's "3rd line only between 270 and 343 px" case is a wrapping RLF inside one range, which a 60 px grid plus binary search will catch only if a sample lands inside it. Use a finer step (for example 16–20 px) below 480 px.
3. **Confirm visibility, VISER-style.** Toggle `opacity:0` on the implicated element, take a cropped screenshot diff, and drop NOIs. Do not let a VLM judge the full page.
4. **Recompute check for resize/rotation (my proposal; no literature found).** Compare the geometry signature after a fresh load at width W with the signature after resizing to W, or after an orientation change and back. Any difference is a "stale geometry" defect.

---

## B. Vision-language / LLM detection of UI display issues

### B1. Pre-LLM CNN detectors (mobile)
- **OwlEyes (Liu et al., ASE 2020) [abstract].** Source: https://arxiv.org/abs/2009.01417
  - Covers text overlap, blurred screen, missing image and similar issues.
  - Detection: 85% precision, 84% recall. Localisation: 90% accuracy.
  - Trained on 4,470 labelled Android screenshots.
- **Nighthawk (Liu et al., TSE 2022) [abstract].** Source: https://arxiv.org/abs/2205.13945
  - Detection: 0.84 precision and 0.84 recall. Localisation is much weaker: AP 0.59, AR 0.60.
  - Found 151 new issues, 75 of them confirmed or fixed.
- **Caveat.** Both are supervised on Android display-bug classes; they do not transfer as-is to web pages.

### B2. UI-Lens: general MLLMs on UI display defects (Xiang et al., CVPR 2026) [full text]
Source: https://openaccess.thecvf.com/content/CVPR2026/html/Xiang_UI-Lens_Assessing_General_MLLMs_Potential_to_Automate_UI_Display_Quality_CVPR_2026_paper.html

- **Setup.** 4,759 expert-annotated pages (Chinese-language apps), balanced 1:1, covering 6 defect types. Models: GPT-5, GPT-4.1, GPT-4o, Gemini-2.5-Pro, Qwen3-VL and others; **Claude was not tested**.
- **Accuracy on boundary tasks is near a coin flip:** text overflow 50%, cropped content 54%, container overlap 54%.
- **Task-average F1:**

  | Task | F1 |
  |---|---|
  | Text overflow | 22% |
  | Container overlap | 34% |
  | Cropped content | 42% |
  | Undisplayed content | 58% |
  | Abnormal ellipsis | 75% |
  | Cross-screen text inconsistency | 11% |

  The abstract gives slightly different figures (20%, 31%); the table values are used here.
- **Best models** reach only about 64–66% average F1.
- **Polarised precision–recall trade-off.** Gemini-2.5-Pro had recall 81% but precision 57%. Seed1.5-VL had precision 76% but recall 27%.
- **Prompting** strategies changed F1 by only +0.1 to +2.5 points.
- **Error analysis (Gemini-2.5-Pro).** The largest share is "minor defect", 29.5%: missed pixel-level truncation. The others:
  - hallucinated defects, such as intentional spacing read as a blank;
  - inability to infer design intent;
  - "normal edge truncation", where clipped carousels are flagged because the model does not know the region scrolls.

### B3. "Vision language models are blind" (Rahmanzadehgervi et al., arXiv 2407.06581, revised 2025) [abstract]
Source: https://arxiv.org/abs/2407.06581

- Seven trivial geometry tasks, including whether two circles overlap, line intersections and circled letters.
- 2024 VLMs averaged 58% accuracy; Claude 3.5 Sonnet, the best, scored 78%; humans score about 100%.
- Failures concentrate where shapes overlap or sit close together, which is exactly the overlap and edge-proximity judgement in classes 1 and 4.
- Older models, but the same direction as UI-Lens.

### B4. Grounding small elements on high-resolution screens: ScreenSpot-Pro (Li et al., arXiv 2504.07981) [abstract]
Source: https://arxiv.org/abs/2504.07981

- The best model at release located only 18.9% of small targets.
- A planner-guided search that crops the search area reached 48.1%.
- **Implication.** Send cropped, element-centred screenshots, not full pages.

### B5. UIClip (Wu et al., UIST 2024, arXiv 2404.12500) [full text, HTML]
Source: https://arxiv.org/html/2404.12500

- **Training data.** Synthetic "jitter" defects, including text-contrast reduction, background-colour shifts, spacing noise and layout-flow changes.
- **General VLMs on pairwise design-quality judgement:** GPT-4V 51.6%, roughly random, and it refused about 10% of items. UIClip reached 75%.
- **Naming the injected defects.** Gemini and GPT-4V recall fell to about 49% and 47% once inflated "flag everything" answers were corrected for.
- **Caveat.** 2024 models; use for direction only.

### B6. LLM-based GUI bug oracles (mobile, functional)
- **Trident / VisionDroid (Liu et al., arXiv 2407.03037) [abstract].** Source: https://arxiv.org/abs/2407.03037
  - Multi-agent MLLM over screenshot sequences, tested on 590 non-crash bugs.
  - Reports +14–112% recall and +108–147% precision over the best baseline. Only relative numbers are given in the abstract.
- **Ju et al. (arXiv 2407.19053) [abstract].** Source: https://arxiv.org/abs/2407.19053
  - MLLMs as oracles detected 49% of 71 documented non-crash bugs.
  - Flags randomness and false positives as limitations.

### B7. DesignRepair (Yuan et al., ICSE 2025, arXiv 2411.01606) [full text, HTML]
Source: https://arxiv.org/html/2411.01606v2

- **Method.** Hybrid: LLM component extraction, plus Playwright extraction of rendered properties (XPath, colour, spacing, clickable size), plus a Material Design knowledge base.
- **Guideline-violation detection:** precision 90–94%, recall 88–93%, on 196 issues from v0-generated pages and 115 from GitHub projects. Ground truth was labelled by the authors.
- **Rule-based screenshot baseline.** UIS-Hunter, a screenshot-plus-OCR rule tool, scored recall 23–32% and precision 48–55% in that setting; OCR errors drove its false positives.
- **Authors' claim.** Rendered-property access catches small left/right padding asymmetries "which purely visual-based methods may miss".

### B8. Contrast from screenshots
- **No study found** that measures VLM accuracy on *near-threshold* text contrast, such as 4.3:1 against 4.5:1, or on small text.
- **One tiny PDF benchmark (arXiv 2509.18965) [full text, HTML]:** https://arxiv.org/html/2509.18965
  - GPT-4o got the colour-contrast criterion right on about 15 constructed documents.
  - Claude 3.5 and Gemini 1.5 hallucinated colour codes when the evidence was insufficient. Claude defaulted to "pass" and Gemini to "fail".
  - **Too small to rely on.** Its main use is as evidence of hallucinated measurements.
- **Inference (not tested).** A VLM cannot measure luminance ratios or pixel distances, so contrast should come from computed styles or pixel sampling, not from model judgement. This follows from B2–B4.

---

## C. Automated accessibility tooling for the target success criteria

### C1. axe-core 4.14 rule coverage [official doc]
Sources: https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md; rule and check JSON under `lib/rules` and `lib/checks`

| SC | axe rule(s) | Default state | Notes |
|---|---|---|---|
| 1.4.3 | `color-contrast` | on | Returns *incomplete* ("needs review") for background image, gradient, image node, overlap by another element, partly obscured or obscuring, alpha foreground, complex text-shadow, pseudo-element background, outside viewport, short text or icon glyphs, and empty input value. |
| 1.4.11 | **none** | n/a | No rule tagged `wcag1411`. |
| 2.4.7 | **none** | n/a | No rule tagged `wcag247`. |
| 2.4.11 / 2.4.13 | **none** | n/a | No rules. |
| 2.5.8 | `target-size` (24 px, plus a `target-offset` spacing check) | **disabled by default** (the rule list says WCAG 2.2 rules stay off until wider adoption) | Skips inline widgets. Incomplete for negative-tabindex neighbours, content overflow and "too many overlapping rects". Exceptions (equivalent, essential, user agent) are not modelled. |
| 2.5.3 | `label-content-name-mismatch` | in the WCAG 2.1 set | Checks only elements named through their content. Incomplete when text may be value text. |
| 4.1.2 | `button-name`, `link-name`, `aria-*-name`, `label`, `select-name`, `nested-interactive`, `aria-hidden-focus`, etc. (29 rules tagged `wcag412`) | on | Strongest-covered SC. |
| Decorative SVG title | `svg-img-alt` checks only that `role=img` SVGs *have* a name | on | **Nothing flags redundant or duplicated announcements.** |

- **Design stance.** The axe README claims zero false positives (bugs notwithstanding). Uncertain cases go to `incomplete`, described as needing "further testing".

### C2. Lighthouse, IBM Equal Access, pa11y [official doc / source]
- **Lighthouse** (`core/config/default-config.js` on GitHub `main`):
  - Runs an axe subset: 66 automated accessibility audits, including `color-contrast`.
  - **Enables `target-size` and scores it** (weight 7).
  - Keeps `label-content-name-mismatch` at weight 0 and hidden.
  - Has no focus-visible audit. Focus appears only in *manual* items: focusable controls, focus traps, managed focus, visual order follows DOM.
- **IBM Equal Access** (`accessibility-checker-engine` 4.0.34 help files):
  - `text_contrast_sufficient` (1.4.3): on graphic backgrounds it asks the user to verify against the lightest and darkest background colours.
  - `style_focus_visible` (2.4.7): a *potential* violation, raised only when CSS modifies `outline` or `border`. A static heuristic, not a visual check.
  - `element_tabbable_visible`: the focused element is on screen.
  - `target_spacing_sufficient` (2.5.8): 24 px or 12 px spacing, with inline and user-agent passes.
  - `label_name_visible` (2.5.3).
- **pa11y** (README): the default runner is HTML_CodeSniffer, and axe is optional. HTML_CodeSniffer's 2.4.7 sniff emits only a page-level *NOTICE*, and pa11y reports only errors by default. **In practice, focus visibility is untested.**

### C3. Published coverage numbers
- **Deque, "Automated Accessibility Coverage Report" [vendor claim].** Source: https://www.deque.com/automated-accessibility-coverage-report/ (also the axe README headline)
  - Data: 2,000+ first-time audits, 13,000+ pages, about 300,000 issues; WCAG 2.0/2.1 A/AA.
  - Headline: **57.38% of issues by volume** were found by axe.
  - Per SC:

    | SC | Issues | Automated |
    |---|---|---|
    | 1.4.3 contrast | 88,714 | 83% |
    | 4.1.2 name/role/value | 48,287 | 54% |
    | 2.4.7 focus visible | 7,312 | **0%** |
    | 1.4.11 non-text contrast | 4,539 | **0%** |

  - Caveats:
    - Template issues are counted once.
    - False positives are excluded.
    - 4.1.1 Parsing (34,488 issues, 90% automated) is obsolete in WCAG 2.2, so the headline would fall without it. That consequence is my inference.
- **GDS tool audit [full results page].** Source: https://alphagov.github.io/accessibility-tool-audit/results.html
  - Design: 142 planted barriers, 13 tools, last updated April 2018.
  - Best tool found 40% (SortSite); axe found 29%.
  - Small-text contrast at AA: found by 7 of 13 tools, including axe.
  - "Focus not visible": found by **0 of 13** (one "user to check").
  - "Keyboard focus is not indicated visually": found by 3 (SortSite, Siteimprove, ASLint), with axe missing it.
  - "Inadequately-sized clickable targets": found by **0 of 13**.
  - Old, and predates WCAG 2.2.
- **Evinced, January 2026 [vendor claim, competitor of Deque].** Source: https://evinced.com/blog/what-an-automation-company-learned-from-manual-audits
  - Against 35 manual audits, axe-core rules could detect 22.6% of reported issues; Evinced claims 62.8%.
  - No independent verification and no per-SC breakdown.

### C4. Geometry-dependent SCs: what the Understanding docs require [official doc]
- **2.5.8** (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
  - Requires a 24×24 CSS px target, or that a 24 px circle centred on the target's bounding box intersects no other target or circle.
  - Exceptions: spacing, equivalent, inline, user-agent control, essential. These exceptions are what need judgement.
  - Platform rules are stricter: Apple HIG **44×44 pt** minimum on iOS and iPadOS ([official doc] via the HIG JSON), Android **48×48 dp** (https://developer.android.com/guide/topics/ui/accessibility/apps).
- **2.4.11** (https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
  - The focused *component* must not be *entirely* hidden by author content: sticky headers or footers, non-modal dialogs, cookie banners.
  - The indicator is excluded unless it is inside the component; an indicator that is hidden fails 2.4.7 instead.
  - Remedy: `scroll-padding`.
- **2.4.13 (AAA)** (https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
  - Indicator area at least a 2 CSS px perimeter, with **3:1 change-of-contrast between the same pixels focused vs unfocused**. That is inherently a two-screenshot measurement.
  - Says nothing about clipping by `overflow`.
- **1.4.11** (https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
  - 3:1 against *adjacent* colours for component boundaries, states and focus indicators.
  - Hard to automate: deciding which graphics are "required", which colours are adjacent, gradients, and anti-aliased thin lines that render fainter than their CSS colour.
- **2.5.3** (https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)
  - The accessible name must contain the visible label; best practice is that the name starts with it.
  - Case and punctuation are ignored.
  - Deciding which nearby text is "the label" needs judgement.

### C5. Focus-indicator detection by screenshot pair [vendor claim]
- Evinced, 2022: https://www.evinced.com/blog/automatic-detection-of-invalid-focus-indication/
- Method: capture each focusable element unfocused, with one page shot plus crops, and focused, then compare with computer-vision contrast and luminance measures.
- Claim: over 95% of flagged faulty indicators were real WCAG violations. Precision only; no recall given.
- **This is the only published automated method found for 2.4.7.** Its structure (Tab walk, crop before and after, compare) is directly executable with agent-browser.

### C6. LLM agents auditing accessibility in a browser (2025–26)
- **Agentic Web Accessibility Auditing (Mishra et al., arXiv 2609.09379, Sep 2026, preprint) [full text, HTML].** Source: https://arxiv.org/html/2609.09379
  - **Design.** One VLM worker per WCAG criterion, with tools: headless Chromium, accessibility tree, computed style, contrast measurement, axe, keyboard and pointer actions, screenshots. 40 workers.
  - **Results on 250 page-criterion rows** (78 positives, from expert audits of 11 scholarly platforms):

    | Detector | Recall | Precision |
    |---|---|---|
    | Workers | 0.86 | 0.56 |
    | axe-core | 0.36 | 0.90 |
    | Uncued VLM | 0.67 | 0.61 |

  - **Combining detectors.** The union of worker and VLM findings gives recall 0.95 at precision 0.54. The intersection gives 45 TP and 23 FP.
  - **Run-to-run stability.** A repeat GPT-5.5 run agreed on 96.4% of verdicts.
  - **Cost.** About USD 37–64 per 250 rows, roughly 78 s per row.
  - **Per-SC samples are tiny.**
    - 1.4.3: 5 positives (axe 1, VLM 4, workers 3).
    - 1.4.11: 1 positive.
    - 2.5.3: 1 positive (workers missed it).
    - 4.1.2: 17 positives (axe 16, workers 17).
  - **No worker existed for 2.4.7.** Interaction mattered most for keyboard SCs: workers found 7 of 8 Keyboard cases, while the VLM found 0.
  - **Prompt effect.** Enumerating the criteria raised the recall of Claude Code (0.60→0.77) and Codex (0.32→0.54), with more false positives.
- **ScreenAudit (Zhong et al., CHI 2025) [full text, HTML].** Source: https://arxiv.org/html/2504.02110v1
  - GPT-4o reads TalkBack transcripts plus metadata.
  - Against 163 expert-identified errors on 14 Android screens: recall 69.2% at precision 71.3%; Accessibility Scanner recall was 31.3%.
  - Explicitly catches **redundant or repeated labels** and internal-identifier labels. This is the closest evidence for the "decorative SVG title causes double announcement" class.
- **TaskAudit (Zhong et al., CHI 2026) [abstract].** Source: https://arxiv.org/abs/2510.12972
  - Agents execute tasks through a screen-reader proxy.
  - Found 48 interaction-only errors on 54 screens, against 4–20 found by existing checkers. Examples: label-function mismatch, cluttered navigation, inappropriate feedback.
- **A11yLTLNav (arXiv 2609.17959, preprint) [abstract].**
  - Uses temporal-logic properties over keyboard-exploration traces.
  - 274 of 309 reported failures were confirmed (88.7% precision) on 31 generated sites.
  - Deterministic monitors work for focus *behaviour*, not focus *appearance*.
- **GenA11y (He, Huq, Malek, FSE 2025) [project page only].** Source: https://ics.uci.edu/~seal/projects/GenA11y/
  - Criterion-specific element extraction plus an LLM.
  - Reported 94.5% precision and 87.6% recall. The covered SCs and dataset construction were not visible to me, so treat as **partly unverified**.
- **Gap.** No study evaluates LLM agents specifically on 2.4.7, 2.4.11 or 2.5.8 with geometry tools. The 2026 agentic paper skipped 2.4.7, and 2.5.8 is outside its WCAG 2.1 scope.

---

## D. Device-emulation limits

### D1. What desktop Chromium emulation does [official doc]
- **DevTools device mode** (https://developer.chrome.com/docs/devtools/device-mode)
  - Emulates viewport, DPR, touch events, user agent, and network and CPU throttling.
  - Calls itself a "first-order approximation" and recommends a real device when in doubt.
  - Names CPU architecture as a limit; says nothing about the on-screen keyboard or browser toolbars.
- **CDP Emulation domain**, tip of tree (`browser_protocol.json`):
  - `setDeviceMetricsOverride` covers mobile viewport-meta, overlay scrollbars, text autosizing, screen orientation and a viewport-meta mode.
  - `setTouchEmulationEnabled` and `setEmitTouchEventsForMouse` cover touch.
  - Three **experimental** overrides, each only changing CSS or API values:
    - `setSafeAreaInsetsOverride`: values for `env(safe-area-inset-*)`.
    - `setSmallViewportHeightDifferenceOverride`: the svh/lvh gap.
    - `setVirtualKeyboardGeometryOverride`: `navigator.virtualKeyboard` and `env(keyboard-inset-*)`.
  - None of these reproduces Safari's collapsing toolbar or iOS keyboard *behaviour*.
  - Whether agent-browser exposes these overrides was **not checked**.
- **Playwright** (https://playwright.dev/docs/emulation, https://playwright.dev/docs/browsers)
  - Emulation covers viewport, `isMobile`, `hasTouch`, DPR, user agent and colour scheme.
  - Playwright's WebKit is built from WebKit main, not Safari, and the docs say Safari-like fidelity is best when WebKit runs on macOS.

### D2. Behaviours emulation cannot reproduce
- **On-screen keyboard.** Source: https://developer.chrome.com/blog/viewport-resize-behavior
  - iOS Safari has always resized only the *visual* viewport and offset the layout viewport. Chrome on Android switched to the same behaviour in v108.
  - `interactive-widget` (`resizes-visual`, `resizes-content`, `overlays-content`) changes this in Chromium only.
  - Fixed-bottom controls stay in place but can be *covered* by the keyboard.
  - Desktop or headless Chromium shows no software keyboard. That claim rests on secondary sources, a Chrome extension listing that exists to fill the gap, so it is **[unverified as an official statement]**.
- **Safari toolbars and viewport units.** Source: https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/
  - `100vh` does not track Safari's dynamic toolbars; Safari 15.4 shipped svh, lvh and dvh.
  - Fixed bottom bars overlapping the iOS 15+ bottom tab bar, and `safe-area-inset-bottom` regressions on iOS 18, come from developer reports only, **[unverified]**: https://www.dev.to/samuelkraft/using-bottom-tab-bars-on-safari-ios-15-53fa, https://bugs.webkit.org/show_bug.cgi?id=281071
- **Focus on click** (MDN `button`, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button) [official doc + source]
  - MDN says Safari does not focus a clicked button, by design.
  - WebKit source (`HTMLFormControlElement::isMouseFocusable`) confirms that form controls are not mouse-focusable unless `tabindex` is set. The exception is the **GTK/WPE ports**, which do focus them.
  - So **Playwright WebKit on Linux likely does *not* reproduce Safari's behaviour; WebKit on macOS does.** This is my inference from the source plus Playwright's Linux builds.
  - Current MDN no longer mentions Firefox/macOS. The older Firefox-on-Mac behaviour is **[unverified]**.
- **Touch hit-testing.** Chromium once had "TouchAdjustment" (fuzzy snapping of taps to nearby small targets) and later removed it. That comes from code-review search snippets only, **[unverified]**.
  - Either way, CDP touch is a single exact point with no contact area, so emulation cannot show "fat-finger" misses. Measuring target size and spacing is the proxy.

### D3. What real-device options add
- **safaridriver on iOS 13+.** Sources: https://webkit.org/blog/9395/webdriver-is-coming-to-safari-in-ios-13/; Apple, "About WebDriver for Safari" via the developer docs JSON
  - Drives the real Mobile Safari engine on an attached device (Settings → Safari → Advanced → Remote Automation).
  - Touches are synthesised from mouse input.
  - One Safari instance and one session at a time, with a "glass pane" that blocks stray input.
  - The `safari:useSimulator` capability targets the Simulator; that comes from search snippets, **[unverified]**.
- **Appium XCUITest.** Source: https://appium.github.io/appium-xcuitest-driver/latest/guides/hybrid/
  - Switches into Safari or web-view contexts via the Web Inspector remote protocol, while also seeing native UI such as the keyboard and toolbars in the native context.
  - Caveats: W3C actions can wedge the WebKit connection, and window resizing works only in WebKit Automation sessions.
- **BrowserStack-type clouds.** Real iPhone Safari, used for example as the ground-truth rendering in the WebCompat study (A5).
  - The only "what emulators miss" evidence is vendor marketing, about performance and battery, not layout.
- **What real devices add for this agent:**
  - Safari toolbar collapse and expand, with real `dvh` and safe-area values.
  - Real keyboard covering, with `visualViewport` offsets.
  - Safari's click-focus semantics.
  - Real font rasterisation, which affects 1–2 px wraps.

---

## E. Severity and review output (UI-relevant only)

- **Tricorder (Sadowski et al., ICSE 2015) [full text].** Source: https://research.google/pubs/tricorder-building-a-program-analysis-ecosystem/
  - Defines an "effective false positive" as any report the developer chooses not to act on.
  - An analyzer whose NOT USEFUL rate reaches 10% or more goes on probation and must improve or be removed.
  - This sets a practical precision floor for any reviewer that posts findings.
- **Dedupe by range or root cause (ReDeCheck, A1).** 328 reports came down to 137 viewport ranges and 33 real failures. Effort tracks distinct ranges, so cap and group findings by (element, width range).
- **Severity bands help (XBIDetective, A4).** It graded no-issue, minor-visual, significant-visual and blocked. Merging "minor" into "no issue" raised accuracy to 85%, because developers prioritise significant and blocking issues.
- **Precision–recall knob.** Union of detectors means more findings and lower precision; intersection means fewer and higher precision (C6). UI-Lens models polarise between high-recall/low-precision and the reverse (B2). Pick explicitly per severity tier.
- **Evidence per finding.** The 2026 agentic-audit paper warns that "a model-generated explanation alone can overstate what was established", and archives every tool observation. Require the measured value (rect, ratio, width range, screenshot crop) with each finding.
- **LLM review in practice (Cihan et al., ICSE-SEIP 2025, arXiv 2412.18531) [search snippet, unverified].**
  - 73.8% of automated review comments were marked resolved.
  - Pull-request closure time rose from about 5 h 52 min to 8 h 20 min.
  - Practitioners complained about faulty and irrelevant comments.
  - Not UI-specific.
- **Not found.** No study measures how many *UI* findings reviewers act on, or the effect of finding caps, specifically for visual or accessibility reviews.

---

## Summary table: defect class → best detection method

| # | Defect class | Best method (in order) | Key evidence | Expected reliability |
|---|---|---|---|---|
| 1 | Placement and geometry (edge-pressed, overlap, protrusion) | **Geometry check via browser.** JS rect dump: viewport overflow, clip-ancestor overflow, sibling intersection, edge distance. Then **opacity-toggle crop diff** to drop invisible cases. VLM only for "does this look wrong" triage on crops. | ReDeCheck: collision/protrusion had 0 FP but 83 invisible NOIs. VERVE: 86–92% agreement with humans. VLMs near chance on overlap/overflow (UI-Lens F1 22–34%). Screenshots *lowered* LLM F1 (WebCompat 0.85→0.73–0.78). | **High** for the geometric fact. **Medium** for "is it a defect" (intent; the edge-distance threshold is a house rule). |
| 2 | Responsive widths and wrapping; stale geometry on resize or rotation | **Width sweep with box comparison**: 60 px steps plus CSS breakpoints ±1 px, binary search on changes, finer steps below about 480 px, report width ranges. Row-count signature for wraps. Fresh-load vs resized-geometry diff for stale layout. | ReDeCheck: 33 failures on 16 of 26 pages; presets alone miss 19–34%; FP sources are coincidental alignment (43) and misread rows (5). XCompat hybrid F1 0.90 vs ReDeCheck 0.45 on generated pages. | **High** recall when sampled finely. **Medium** precision, so dedupe and visually confirm. Stale-geometry check is untested (no literature). |
| 3 | Contrast: text (1.4.3) and non-text (1.4.11) | 1.4.3: **axe `color-contrast`**, then **pixel sampling on the element crop** for axe-incomplete cases (gradient, image, pseudo, overlap, alpha). 1.4.11: **computed border/background vs adjacent colour plus pixel sampling**, with LLM/human judgement on which parts are "required". | Deque: 83% of 1.4.3 issues automated; 0% for 1.4.11. axe has no 1.4.11 rule. No evidence VLMs can judge near-threshold ratios; they hallucinate colour codes. | 1.4.3: **high** (deterministic) except incomplete cases, which are **medium**. 1.4.11: **low–medium**. |
| 4 | Focus visibility (2.4.7 / 2.4.11 / 2.4.13) | **Scripted Tab walk plus focused/unfocused crop diff** (change-of-contrast, area). **Geometry**: indicator box vs `overflow` clip ancestors and vs fixed/sticky overlays (sample points with `elementFromPoint`). WebKit run for click-focus. | axe: no rules. IBM: CSS heuristic only. HTML_CodeSniffer: notice only. Deque: 0% automated. GDS: 0/13 tools caught "focus not visible". Evinced screenshot-pair method: about 95% precision (vendor). No academic LLM evaluation. | **Medium**: highest-value gap. Deterministic measurement, but needs keyboard interaction and pixel-diff tolerance. |
| 5 | Target size (2.5.8; platform 44 pt / 48 dp) | **Deterministic box measurement**: axe `target-size` (enable it explicitly; off by default), IBM `target_spacing_sufficient`, or an own rect check against 24 px or the house 44/48 rule. LLM/human for exceptions (inline, equivalent, essential). | Rule JSON and W3C Understanding. GDS 2018: 0/13 tools. Lighthouse now scores `target-size`. | **High** for measurement. **Medium** for exception handling. |
| 6 | Accessible-name markup (2.5.3, 4.1.2, redundant SVG titles) | **axe** (`label-content-name-mismatch`, `button-name`, `link-name`, `aria-*-name`, `nested-interactive`). Then **LLM reads the accessibility-tree snapshot** for redundancy and duplicates, such as a named button containing an SVG with `<title>` and no `aria-hidden`. | Deque: 54% of 4.1.2 automated. Agentic study: axe found 16 of 17 4.1.2 cases. ScreenAudit: LLM over screen-reader output catches redundant labels (R 0.69, P 0.71). No axe rule for redundancy. | 4.1.2 / 2.5.3: **high**. Redundancy: **medium**. |
| 7 | Browser and device-specific (Safari click-focus, keyboard covering, iOS toolbar over a bottom button, modal height jumps) | **Real engine or device**: iOS Simulator or device Safari via safaridriver or Appium, or a cloud real device. WebKit on macOS for click-focus. **Geometry check in Chromium** only for modal jumps (dialog rect before and after a content change). CDP safe-area, svh and keyboard overrides are a weak approximation. | WebKit source (form controls not mouse-focusable except GTK/WPE). Chrome and WebKit viewport docs. CDP overrides only change CSS values. Device-mode docs. | **Low** in Chromium emulation. **Medium–high** on Simulator or real Safari. Modal jump: **high** (deterministic). |
