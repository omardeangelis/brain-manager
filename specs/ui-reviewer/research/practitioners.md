# Practitioner survey: rendered-UI / visual / accessibility review (for `ui-reviewer`)

Date: 2026-10-06. Desk research only. Nothing was installed or run.

**Method.** Every repo below was opened through the GitHub API (`gh api .../contents`, `.../readme`, `.../git/trees`). The raw copies stayed in the session scratchpad and are not kept in the repository. Star counts and licences are the values the GitHub API returned today, which match the repo page. Vendor product pages (Deque, Accessibility Insights, Chromatic, Polypane, Storybook) were opened with WebFetch. Anything I could not open is marked. Agent prompts are paraphrased throughout, with at most one short quote per source.

**Popularity vs quality.** Star counts tell you about reach, not about how good the reviews are. Only two sources publish anything that resembles a measured evaluation:
- plugin87: self-run blind briefs scored by its own gates.
- impeccable: a fixture corpus for its deterministic detector.

None of the LLM review agents publishes precision or recall for its findings.

## Overview

| # | Source | Stars | Licence | Opens a browser? | Evidence it gathers | Measured eval |
|---|---|---|---|---|---|---|
| 1 | OneRedOak/claude-code-workflows `design-review` | 3,897 | MIT | Yes (Playwright MCP) | Screenshots at 1440/768/375, a11y snapshot, console | None |
| 2 | pbakaus/impeccable (audit/adapt/polish/harden/layout, finish-reviewer, detector) | 77,534 | Apache-2.0 | Detector: yes (URL scan with installed Chrome). Finish-reviewer: no (parent captures) | Rendered DOM + computed layout (detector); desktop+mobile captures | Detector fixture corpus (236 antipattern fixtures, recall tests). No LLM-review eval |
| 3 | vercel-labs/web-interface-guidelines | 942 | MIT | No (code review) | Reads files | None |
| 4 | wshobson/agents (ui-visual-validator, accessibility-expert, /accessibility-audit, /design-review) | 40,245 | MIT | Validator: unspecified. Audit command: sample Puppeteer + axe code | Screenshots (assumed); illustrative scripts | None |
| 5 | VoltAgent/awesome-claude-code-subagents (ui-designer, accessibility-tester, ui-ux-tester) | 25,532 | MIT | Only ui-ux-tester (chrome-mcp, computer-use) | Mostly none; promises AT testing | None |
| 6 | nextlevelbuilder/ui-ux-pro-max-skill (checklist; `stack/` design-review agent + `design-audit.mjs`) | 133,548 | MIT | Agent: yes (Playwright/CDT MCP). Script: Playwright Chromium | 5–6 fixed viewports, computed styles, screenshots | None (one example report) |
| 7 | github/accessibility-scanner (Action) | 380 | MIT | Yes (Playwright) | axe, optional accesslint, reflow plugin at 320px, screenshots | None |
| 8 | Deque axe MCP Server / axe-core | 8 (public repo) / 7,604 | Proprietary, paid / MPL-2.0 | Yes ("real browser" via axe DevTools) | axe rules + AI guided tests | Vendor claim: axe finds ~57% of WCAG issues on average |
| 9 | Microsoft Accessibility Insights for Web (FastPass) | 955 | MIT | Extension in the user's browser | axe automated checks + assisted Tab-stops visualisation | None published |
| 10 | ChromeDevTools/chrome-devtools-mcp (+ `a11y-debugging` skill) | 53,034 | Apache-2.0 | Yes (Chrome) | a11y tree, console "issue" audits, Lighthouse, computed CSS with source lines, emulation | None |
| 11 | GoogleChrome/lighthouse (a11y category) | 30,865 | Apache-2.0 | Yes | axe-based audits + a list of manual audits | None for a11y |
| 12 | pa11y/pa11y | 4,570 | LGPL-3.0 | Yes (Puppeteer) | HTML_CodeSniffer and/or axe, pre-test actions | None |
| 13 | IBMa/equal-access | 780 | Apache-2.0 | Yes (extension / Node checker) | IBM rule engine, keyboard visualisation, baselines | None |
| 14 | Anthropic: anthropics/skills, claude-code plugins, claude-plugins-official | 179,881 / 149,604 / 37,465 | none shown / none shown / Apache-2.0 | `webapp-testing` drives Playwright | Generic screenshots/DOM | No UI-review skill exists |
| 15 | Community-Access/accessibility-agents | 421 | MIT | Yes (Playwright MCP tools) | Tab walk, state scan + axe, viewport widths, computed contrast, a11y tree | "Fifteen gates" on the package itself; nothing on review quality |
| 16 | plugin87/ux-ui-agent-skills (gate, a11y-audit, design-qa, evals) | 1,539 | MIT | Yes (headless Chromium scripts) | Alpha-composited contrast, default/hover/focus contrast, 280/320/414 + 1.25x font | **Yes, partially**: blind-subagent briefs scored by 14 render gates (self-run, n=8 runs) |
| 17 | ibelick/ui-skills (`improve-ui`, `fixing-accessibility`, `baseline-ui`) | 9,430 | MIT | No by default; rendered evidence only if the user supplies it | Source tracing | None |
| 18 | addyosmani/web-quality-skills (`web-quality-audit`, `accessibility`) | 2,897 | MIT | Yes (Lighthouse / CDT MCP) | Lighthouse, a11y tree, traces | None |
| 19 | github/awesome-copilot `accessibility-runtime-tester` | 39,743 | MIT | Yes (prefers Chrome DevTools MCP) | Keyboard-first runtime testing | None |
| 20 | openai/skills `playwright-interactive` | 27,902 | none shown at repo level | Yes (persistent Playwright) | Viewport + native-window passes, mobile context with touch | None |
| 21 | Dammyjay93/interface-design `/design-review`; julianoczkowski/designer-skills `design-review`; Owl-Listener/designer-skills `accessibility-audit` | 5,772 / 576 / 2,846 | MIT / Apache-2.0 / MIT | Optional / yes (screenshots mandatory) / no | Screenshots at 1280/768/375 (julianoczkowski) | None |
| 22 | vercel-labs/agent-browser (our existing driver) | 43,567 | Apache-2.0 | Yes; **also real Mobile Safari in the iOS Simulator** | snapshot, `get box`, `get styles`, `a11y` (embedded axe), `set viewport/device/media`, `diff screenshot` | n/a (tool) |
| 23 | microsoft/playwright-mcp | 37,874 | Apache-2.0 | Yes (Chromium, Firefox, **WebKit**) | a11y snapshot, device emulation, optional vision caps | n/a |
| 24 | Storybook a11y addon / Chromatic a11y | 91,203 / 339 (CLI) | MIT / MIT CLI, paid service (pricing not verified) | Yes (Vitest browser mode; Chromatic cloud Chrome) | axe per story, per viewport and per mode | Repeats the axe 57% claim |
| 25 | Polypane | n/a (commercial) | Commercial, 14-day trial | It *is* a browser | Multi-viewport panes, a11y panel, focus order, emulations; mentions an MCP server | Not verified |

### Coverage of the reference project's slipped defects

This is my own mapping from what each tool documents. I ran none of them.

| Slipped defect | Closest existing check | Gap |
|---|---|---|
| Chip row wraps to a 3rd line only at card widths 270–343px | None directly. Page-overflow checks (github reflow at 320px, uupm/CA/plugin87 `scrollWidth > clientWidth`) do not fire, because wrapping is not overflow. Impeccable `adapt` advises starting narrow and stretching until it breaks, but only as builder guidance | Needs a **continuous width sweep** that measures each component's line count and height, plus awareness of the card's own width (container width ≠ viewport width) |
| Expanded card keeps its opening width after resize or rotation | Nothing. openai `playwright-interactive` treats a mode switch as a context reset and checks the as-launched size before any resize (adjacent idea) | Needs a **state × resize** check: open at width A, resize to B, compare with a fresh load at B |
| Focus ring clipped by `overflow: hidden` | WIG rule (rings must be visible and unobscured) is code-only. Scripts in uupm, wshobson and CA only test that an `outline`/`box-shadow` exists, so they never see clipping. axe has **no** rule for 2.4.7 or 2.4.11. IBM Equal Access has `style_focus_visible` and `element_tabbable_visible` (2.4.7), but both are CSS-declaration or visibility heuristics that return *potential* findings, not clip geometry. Accessibility Insights Tab stops relies on a human eye | Needs real Tab presses plus a crop of each focused element, plus a geometric test of the ring's extent against ancestor clip boxes and sticky overlays |
| ~20px checkbox row with inert padding | axe `target-size` (WCAG 2.2, **off by default**, 24px with a spacing exception). uupm `design-audit` flags `<44px` boxes on mobile (counts only, no locations). WIG "no dead zones" rule is code-only | Needs **hit-area probing**: `elementFromPoint` or a click on the padding, to show whether the padding activates the control |
| 12px counter at ~3:1 contrast | axe `color-contrast` (solid backgrounds; anything uncertain goes to "incomplete"); CDT console "Low contrast" issues; plugin87 `measure_render.mjs` (alpha-composited ancestor stack) | Covered when the deterministic layer runs. Naive scripts (wshobson, CA) read only the element's own `backgroundColor` and miscompute it |
| Accessible name runs two words together | Nothing automated. axe `label-content-name-mismatch` compares visible text with an *author-supplied* label, not with a name computed from content | Needs an **a11y-tree name dump** that the LLM proofreads |
| Tick SVG `<title>` announced redundantly | axe `svg-img-alt` checks only that a name exists. WIG and uupm checklist say decorative icons should be hidden | Same a11y-tree proofread: decorative graphics that are exposed, and names repeated next to visible text |
| Virtual keyboard covers Save on touch devices | Nothing in Chromium emulation (I believe device emulation does not draw an on-screen keyboard; not verified in a source). **agent-browser `-p ios`** drives real Mobile Safari in the iOS Simulator. Impeccable says Chromium is not Safari and that untested hardware is reported, not assumed | Real Safari pass when the Simulator is available; otherwise an explicit "untested on real touch keyboard" line |

---

## Source sections

### 1. OneRedOak/claude-code-workflows — `design-review` agent + `/design-review`

- **URL:** https://github.com/OneRedOak/claude-code-workflows/tree/main/design-review
- **Stars / licence:** 3,897 / MIT. Files read: `design-review-agent.md`, `design-review-slash-command.md`, `design-principles-example.md`, `design-review-claude-md-snippet.md`, `README.md`.
- **Checks:** Seven phases.
  - Interaction states (hover/active/disabled) and destructive-action confirmations.
  - Responsiveness at 1440, 768 and 375: no horizontal scroll, no overlap.
  - Visual polish: alignment, spacing, type hierarchy, palette consistency.
  - Accessibility (WCAG 2.1 AA): Tab order, visible focus, Enter/Space activation, semantic HTML, labels, alt text, 4.5:1 contrast.
  - Robustness: invalid input, content overflow, loading/empty/error states.
  - Code health: component reuse, design tokens.
  - Content and console errors.
- **Evidence:** A live browser through Playwright MCP, starting at 1440×900. Screenshots per viewport, `browser_snapshot` for the DOM/a11y tree, console messages. The slash command inlines `git status`, `git diff` and `git log` from the merge base and points the agent at `/context/design-principles.md` and `/context/style-guide.md`.
- **Output:** Markdown with a positive opening, then four buckets: Blocker, High-Priority, Medium-Priority, Nit. Screenshots are required for visual issues. No cap. No location format (no selector, viewport or file:line).
- **Measured eval:** None. There is a YouTube walkthrough.
- **Copy:**
  - "Live environment first": assess the rendered experience before reading code.
  - The four-level triage, with nitpicks prefixed "Nit:".
  - Describe the problem and its impact rather than prescribing pixel values.
  - Project principles held in a separate file that the agent reads.
- **Avoid:**
  - Contrast is promised with no instruction on how to measure it, even though `browser_evaluate` is allowed.
  - Only three fixed viewports.
  - The reviewer is granted `Edit`, `MultiEdit`, `Write` and `NotebookEdit`.
  - A mandatory positive opening adds filler.
  - Output is unbounded.
  - The README claims the process turns subjective reviews into "objective assessments", with no evidence.

### 2. pbakaus/impeccable — UI-side modes, finish reviewer, deterministic detector

- **URL:** https://github.com/pbakaus/impeccable
- **Files read:** `.claude/skills/impeccable/reference/{audit,adapt,polish,harden,layout,craft-floor,component-review}.md`, `.claude/agents/impeccable-finish-reviewer.md`, `README.md`, `crates/core/src/checks/rules.rs`, `crates/browser/tests/recall_and_gates.rs`, plus the fixture tree.
- **Stars / licence:** 77,534 / Apache-2.0.

**`audit`.** A code-level technical audit across five dimensions: A11y, Performance, Theming, Responsive, Implementation Integrity.
- Responsive covers fixed widths, touch targets under 44×44, broken touch gestures, horizontal scroll, text scaling and missing breakpoints.
- Each dimension is scored 0–4, totalled as an Audit Health Score out of 20 with rating bands.
- Findings use P0–P3, each with location (component, file, line), category, impact, WCAG reference, recommendation and a suggested follow-up command.
- It tells the agent to keep deterministic findings separate from visual judgment and to call out detector false positives.

**`adapt`.** Responsive and device adaptation.
- Breakpoints: start narrow and widen until the design breaks. Container queries, `clamp()`, pointer/hover media queries.
- Safe areas: `env(safe-area-inset-*)`, `viewport-fit=cover`.
- Gesture checks: a swipe across a control along the page's scroll axis should scroll; a drag on the control should move it.
- Evidence provenance rule: say whether evidence came from emulation, synthesized touch, which engine ("Chromium is not Safari") or a physical device. Screenshots prove layout, not gestures. Unreachable hardware is a reported gap, not a blocker.

**`polish`, `harden`, `layout`.**
- `polish` and `layout` both treat a detector result as defect evidence, not proof of quality. `layout` says a clean scan cannot prove hierarchy or rhythm.
- `polish` gathers evidence at representative desktop and mobile sizes and triages in this order: broken tasks, missing states, flow/responsive drift, visual, cleanup.
- `harden` covers long text, roughly 30% longer translations, RTL, and `min-width: 0` on flex children.

**`craft-floor`.** A verify list for the built result:
- Contrast: body and placeholder ≥4.5:1, large text ≥3:1.
- Spacing read from computed values.
- Every breakpoint run with the real copy.
- Hover, disabled, loading, error and empty states.
- Browser-drawn surfaces (focus rings, selection, scrollbars, caret) themed.

**`impeccable-finish-reviewer` agent.**
- Tools: `Read, Bash, Glob, Grep`. It has no browser; the parent captures `desktop.png` and `mobile.png`.
- Check 0, before anything else, validates the captures:
  - every required viewport is present;
  - no blank or black regions;
  - the content matches what the filename claims;
  - the dimensions make sense.
  If any capture fails, the whole return is `disposition: recapture` and a list of what to recapture. It never reviews broken evidence.
- The disposition vocabulary is fixed (`recapture | rebuild | fix | ship`). The word is derived from the findings rather than from impression, and the parent may not soften it.
- Output: at most eight ordered `material_fixes`, plus one `keep` line. No praise, no summary prose.
- Verdict pass: scores each earlier fix as resolved, partial or unresolved, and names at most three regressions. It does no new hunting, and it ignores the builder's narration of what was fixed.
- It also sets a reading budget, because a turn ceiling would otherwise end the run before it writes anything.

**Detector (`npx impeccable detect`).**
- 60 deterministic rules. The UI-relevant ones include `low-contrast`, line length, cramped padding, small touch targets, skipped headings, text overflow, and clipped overflow containers.
- A URL scan uses an installed Chrome and reads the rendered DOM, computed layout and accessible stylesheets.
- Exit codes: 0 clean, 2 findings, 1 scan failure. `--json` is available.
- The README says a clean run is evidence, not proof, of visual or accessibility quality.

**Measured eval.**
- The detector has a fixture corpus: 236 HTML files under `tests/fixtures/antipatterns/`, for example `clipped-overflow-container.html`, `low-contrast-near-threshold.html`, `covered-text-contrast.html`, `undersized-ui-text-focus-and-code.html`. Browser-rendered recall tests run over it.
- No measured evaluation of the LLM modes.

**Copy:**
- The evidence-provenance line and its "untested" gap reporting.
- Capture validation before review, with recapture as a disposition.
- A fixed, derived verdict vocabulary.
- A hard cap on fixes (8) and on regressions (3).
- Deterministic and judgment evidence kept apart.
- A seeded-fixture corpus for the deterministic layer.

**Avoid:**
- The audit's 0–4 per dimension, the /20 health score and the rating bands. These are invented metrics, and the prompt tells the user to re-run the audit to watch the score rise, which invites score-chasing.
- `audit` mixes performance and theming into a UI review.
- Its 44px rule is a single number for every context. Vercel uses 24px on desktop and 44px on mobile.

### 3. vercel-labs/web-interface-guidelines

- **URL:** https://github.com/vercel-labs/web-interface-guidelines. Files read: `README.md`, `AGENTS.md`, `command.md`.
- **Stars / licence:** 942 / MIT.
- **Checks (layout/focus/target subset):**
  - Every focusable element shows a visible, *unobscured* ring. Prefer `:focus-visible`; use `:focus-within` for groups. Sticky headers, footers and overlays never cover the focused element.
  - Hit target ≥24px (≥44px on mobile); expand the hit area when the visual is smaller. "No dead zones" on checkbox/radio plus label.
  - Mobile `<input>` font size ≥16px (avoids iOS zoom on focus). Never disable zoom. `touch-action: manipulation`.
  - Safe-area variables. No excessive scrollbars (test with macOS "always show scrollbars").
  - Responsive coverage including ultra-wide (zoom out to 50%).
  - Let the browser size things; `min-w-0` on flex children so text can truncate. Handle short, average and very long content.
  - Non-breaking spaces for glued terms. `translate="no"` on brand and product names.
  - Nested radii: the child radius is ≤ the parent's.
  - APCA preferred over WCAG 2 contrast. Interaction states have more contrast than the rest state.
  - `color-scheme: dark`. Explicit colours on Windows `<select>`.
  - Accurate accessible names; decoration hidden and verified in the accessibility tree; icon-only buttons named.
- **Evidence:** None at runtime. `/command.md` reads files that match a glob.
- **Output:** Grouped by file, `file:line - finding`, terse; "✓ pass" for clean files; no preamble.
- **Measured eval:** None.
- **Copy:** The rule content, which is the best compact rule source for our static-UI scope. The terse, clickable location format. An explicit "pass" line for files that were checked.
- **Avoid / note:**
  - Code-only, so it cannot see clipping, wrapping or real hit areas.
  - The README contradicts itself. Its mobile-input rule offers `maximum-scale=1` as an alternative, while the same README says never disable zoom and `AGENTS.md` lists `maximum-scale=1` as forbidden.
  - The APCA preference conflicts with WCAG 2.x conformance thresholds. We should pick one and say so.

### 4. wshobson/agents — `ui-visual-validator`, `accessibility-expert`, `/accessibility-audit`, `/design-review`

- **URL:** https://github.com/wshobson/agents. Files read:
  - `plugins/accessibility-compliance/agents/ui-visual-validator.md`
  - `plugins/accessibility-compliance/commands/accessibility-audit.md`
  - `plugins/ui-design/agents/accessibility-expert.md`
  - `plugins/ui-design/commands/design-review.md`
- **Stars / licence:** 40,245 / MIT.

**`ui-visual-validator` (model: sonnet, no `tools:` line).**
- Strengths:
  - Assumes the change has *not* achieved its goal until visual proof shows it has.
  - Describes what is observed before judging.
  - Looks actively for evidence of failure ("reverse validation").
  - Refuses to infer visual results from code.
  - Does not accept a visible difference as proof that the change is correct.
  - Measures position and size changes.
- Weaknesses:
  - Lists Chromatic, Percy, Applitools, BackstopJS and others as capabilities with no instructions or tools to run them.
  - "Pixel-perfect" screenshot analysis and contrast measurement from screenshots, which a model cannot do reliably.
  - Never says how screenshots are obtained.

**`/accessibility-audit`.**
- Illustrative Puppeteer + `@axe-core/puppeteer` code.
- `calculateScore` = 100 minus weighted impacts. This is an invented metric.
- The contrast analyzer reads each element's own computed `backgroundColor`. That is `rgba(0,0,0,0)` for most text, which it parses as black, so the ratios are wrong.
- The focus-indicator test is `outline !== "none"`, which misses box-shadow rings and clipping.

**`accessibility-expert`.** A capability list that includes testing with real assistive technologies, with no tool to do it.

**`/design-review` (ui-design).**
- Code review that asks one question per turn.
- Writes `.ui-design/reviews/{id}.md` with Critical/Major/Minor/Suggestion, `file:line`, Problem/Impact/Recommendation and before/after code.

**Measured eval:** None.
- **Copy:** The skeptical stance ("not achieved until proven") and the observation-first rule.
- **Avoid:** Capability lists of tools never invoked, weighted 0–100 scores, naive contrast and focus scripts, and contrast "measured" from images.

### 5. VoltAgent/awesome-claude-code-subagents — `ui-designer`, `accessibility-tester`, `ui-ux-tester`

- **URL:** https://github.com/VoltAgent/awesome-claude-code-subagents. Files read:
  - `categories/01-core-development/ui-designer.md`
  - `categories/04-quality-security/accessibility-tester.md`
  - `categories/04-quality-security/ui-ux-tester.md`
- **Stars / licence:** 25,532 / MIT.

**`accessibility-tester`.**
- Tools: `Read, Grep, Glob, Bash`; model: haiku. No browser.
- Promises "NVDA testing procedures", JAWS, VoiceOver and Narrator verification, and zero critical violations.
- Begins by querying a context-manager agent that does not exist.
- Its sample completion message reports an automated score rising from 67 to 98.
- **These are checks the agent cannot run, plus an invented metric.**

**`ui-designer`.** Tools include `Write` and `Edit`. Lists browser testing with no browser.

**`ui-ux-tester`.**
- Tools: `chrome-mcp`, `computer-use`, plus `Write`/`Edit`.
- Exhaustive coverage of every micro-detail, a frustrated-user persona, extra attention to white space, severity scoring and screenshots.
- No cap and no stop condition.

**Measured eval:** None.
- **Copy:** Nothing specific. The `ui-ux-tester` messy-input persona is already covered by our `ux-advisor`.
- **Avoid:** Promises of AT and screen-reader testing without the tooling, sample score-improvement claims, exhaustive unbounded scope, and write tools on testers.

### 6. nextlevelbuilder/ui-ux-pro-max-skill — pre-delivery checklist, `stack/` design-review agent, `design-audit.mjs`

- **URL:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill. Files read:
  - `.claude/skills/ui-ux-pro-max/SKILL.md`
  - `.../references/pro-rules.md`
  - `stack/.claude/agents/design-review.md`
  - `stack/scripts/design-audit.mjs`
  - `stack/.github/workflows/design-review.yml`
- **Stars / licence:** 133,548 / MIT. The largest audience in this set; that says nothing about review quality.

**Main skill.** A searchable rules database (`search.py --domain ux|web|icons`) used *while building*. Its priority table puts Accessibility and Touch first (44×44, 8px spacing).

**Pre-delivery checklist (`pro-rules.md`).** Explicitly scoped to native/mobile app UI. Items include:
- touch targets ≥44pt (iOS) / ≥48dp (Android);
- pressed states that do not shift layout bounds;
- contrast checked in both light and dark independently, and modal scrims measured against the real background;
- safe areas, and scroll content not hidden behind fixed bars;
- small phone, large phone and tablet, in portrait and landscape;
- decorative icons next to text hidden from the a11y tree; icon controls named, with state;
- sticky UI must not obscure focus;
- dynamic type / largest text without layout breakage.

It is a self-check list for the builder, with no tooling attached.

**`stack/` design-review agent.**
- Tools: `mcp__playwright`, `mcp__chrome-devtools`, `Read`, `Grep`, `Glob`, `Bash`.
- Live-first; it reads code only to explain an observed defect.
- Phases at 375/768/1024/1440/1920. Tap targets under 44 on mobile. WCAG 2.1 AA (4.5:1 body, 3:1 large text/UI) using the MCP a11y snapshot.
- Output: verdict (Ship / Ship with fixes / Needs work), viewports checked, Blockers/High/Medium/Nit, "What's working".
- Each finding runs observation → principle → fix, with evidence.
- If the page cannot be opened, it says so and reports only the script results. It must not invent findings.

**`design-audit.mjs`.**
- Playwright Chromium at 360, 390, 768, 1024, 1440 and 1920. Writes `report.md` + `report.json` + screenshots.
- Checks:
  - horizontal overflow, naming the widest offenders;
  - unsized `<img>`;
  - tap targets under 44 at ≤480px;
  - focus visibility on 25 sampled focusables;
  - nameless buttons and links;
  - h1 count;
  - viewport meta and `lang`;
  - console errors;
  - approximate contrast against the nearest opaque ancestor, labelled "a lead, not a verdict".
- Deduplicates findings across viewports and lists "seen at: <viewports>".

**Measured eval:** None. There is one example report (`examples/juniper-audit`).

**Copy:**
- The script-plus-agent split (CI catches mechanical defects; the agent judges).
- Deduplication across viewports with a "seen at" list.
- Honest labelling of approximate checks.
- Degrade to script-only rather than inventing findings.
- The checklist content on dark mode, scrims, safe areas and orientation.

**Avoid:**
- Script findings are *counts* with no element locations ("N targets < 44px").
- The focus check passes any element with any `box-shadow` (a card shadow counts as a ring) and cannot detect clipping.
- The 44px rule is applied to inline links.
- Fixed viewport tiers.

### 7. github/accessibility-scanner (GitHub Action)

- **URL:** https://github.com/github/accessibility-scanner. Files read: `README.md`, `FAQ.md`, `.github/scanner-plugins/reflow-scan/index.ts`.
- **Stars / licence:** 380 / MIT. Public preview.
- **Checks:** axe by default; `accesslint` optional; plugin scans. The built-in `reflow-scan` plugin sets a 320×256 viewport and flags `scrollWidth > clientWidth + 1`.
- **Evidence:**
  - Playwright against listed URLs, with optional login or auth context.
  - `url_configs` per URL with `waitForSelectors` and `excludeSelectors`.
  - `reduced_motion` and `color_scheme` options.
  - Optional screenshots.
- **Output:**
  - GitHub issues, one per finding, per rule, or per rule+URL, optionally assigned to Copilot to fix.
  - Separate toggles for best-practice and experimental findings.
  - A closed issue reopens on recurrence unless labelled `wontfix`.
  - `dry_run` mode.
- **Measured eval:** None.
- **Copy:**
  - The plugin finding wording "needs review: …" with a WCAG understanding link and the measured numbers (scroll width vs client width). It says what is known and what a human must decide.
  - Separating hard failures from best-practice and experimental findings.
  - Restoring the viewport after a plugin so later scans are unaffected.
- **Avoid:** Using it as a gate for things it cannot see. It is axe plus one reflow check.

### 8. Deque — axe MCP Server and axe-core

- **URLs:** https://github.com/dequelabs/axe-mcp-server-public (README), https://www.deque.com/axe/mcp-server/, https://docs.deque.com/devtools-server/4.0.0/en/axe-mcp-server, https://github.com/dequelabs/axe-core (`doc/rule-descriptions.md`, README).
- **Stars / licence:** MCP public repo 8, proprietary, **requires a paid axe DevTools for Web subscription**, Docker or npx. axe-core 7,604, MPL-2.0.

**axe MCP Server.**
- Tools: `analyze` (scans a page in a real browser via the axe DevTools extension; local or remote URL; viewport, partial scans, pre-scan interactions, screenshots) and `remediate` (AI fix guidance, consumes AI credits).
- `analyze` can also run three AI "Intelligent Guided Tests": Keyboard, Interactive Elements and Modal Dialog.
- Vendor pages give no accuracy numbers for the MCP.

**axe-core.**
- README claim: finds on average 57% of WCAG issues. Uncertain cases go to "incomplete" for manual review. It claims zero false positives, bugs aside.
- Relevant rules: `color-contrast` (WCAG AA text), `label-content-name-mismatch` (2.5.3), `svg-img-alt`, `role-img-alt`, `nested-interactive`, `aria-hidden-focus`, `scrollable-region-focusable`, `meta-viewport`, `link-in-text-block`.
- `target-size` (2.5.8) sits in the WCAG 2.2 group, which is **disabled by default**.
- I found **no rules tagged** `wcag1411` (non-text contrast), `wcag247` (focus visible), `wcag2411` (focus not obscured) or `wcag1410` (reflow).

**Measured eval:** Only the vendor's 57% claim.
- **Copy:** Run axe as the deterministic floor with the WCAG 2.2 tags enabled. Treat `incomplete` as "needs review" leads for the LLM, not as failures. Keep remediation advice out of a read-only reviewer.
- **Avoid:** Paying for the MCP. `agent-browser a11y` already embeds axe-core and returns `violations` and `incomplete` as JSON.

### 9. Microsoft Accessibility Insights for Web — FastPass

- **URLs:** https://github.com/microsoft/accessibility-insights-web (README), https://accessibilityinsights.io/docs/web/getstarted/fastpass/
- **Stars / licence:** 955 / MIT (Action repo: 98).
- **Checks:** FastPass has two steps:
  1. Automated checks, powered by axe-core.
  2. Assisted **Tab stops**: the extension draws numbered circles along the tab order as the tester presses Tab and Shift+Tab, and the tester looks for five defects:
     - unreachable elements;
     - traps;
     - missing visible focus;
     - order that does not match the layout;
     - unexpected focus moves.
  - An optional **Needs review** step covers cases automation cannot decide, such as text over images or gradients.
- **Evidence:** The user's own browser, with a human looking.
- **Output:** Extension UI, exportable report.
- **Measured eval:** None. It claims high-impact issues are found "in less than five minutes".
- **Copy:** The five-defect Tab-stops checklist, as the structure of our focus pass. The explicit needs-review bucket for automation-undecidable contrast.
- **Avoid:** Nothing in particular. The tool is clear about where human judgment is required.

### 10. ChromeDevTools/chrome-devtools-mcp (+ `skills/a11y-debugging`)

- **URL:** https://github.com/ChromeDevTools/chrome-devtools-mcp. Files read: `docs/tool-reference.md`, `skills/a11y-debugging/SKILL.md`, `skills/a11y-debugging/references/a11y-snippets.md`.
- **Stars / licence:** 53,034 / Apache-2.0.
- **Tools (relevant):**
  - `take_snapshot`: the a11y tree.
  - `take_screenshot`.
  - `evaluate_script`.
  - `get_css_styles`: matched rules and the cascade, with source line numbers and overridden declarations marked.
  - `emulate`: viewport as `WxHxDPR[,mobile][,touch][,landscape]`, colour scheme, CPU and network throttling.
  - `resize_page`.
  - `press_key`.
  - `lighthouse_audit`: a11y, SEO and best practices; excludes performance; desktop/mobile; navigation or snapshot mode.
  - Performance trace and insights.
  - `list_console_messages` with `types:["issue"]`.
- **a11y-debugging skill:**
  - Start with Lighthouse.
  - Parse the JSON report with `node -e`/`jq` instead of reading it whole.
  - Use Chrome's native "issue" audits, which include Low Contrast.
  - Treat the a11y tree as the source of truth for semantics, and compare its order with a screenshot.
  - Use Tab via `press_key`, then a snapshot, to track focus.
  - Snippets for orphaned inputs, tap-target measurement (48px per web.dev), contrast, and global page checks.
  - It admits models cannot measure exact contrast ratios from images, only judge obvious legibility.
- **Measured eval:** None.
- **Copy:**
  - Native "issue" audits as a free deterministic signal.
  - Filter big reports with a script instead of loading them into context.
  - `get_css_styles` to map a rendered defect back to a source line.
  - The honesty about contrast from images.
  - `emulate` with `,touch,landscape` for the orientation pass.
- **Avoid:** Lighthouse `scores` as a pass/fail signal (see 11). 48px is the web.dev number; WCAG uses 24px and Apple uses 44pt, so we must state which one we apply.

### 11. GoogleChrome/lighthouse — Accessibility category

- **URL:** https://github.com/GoogleChrome/lighthouse (`core/config/default-config.js`).
- **Stars / licence:** 30,865 / Apache-2.0.
- **Checks:**
  - axe-derived audits weighted by axe impact. `color-contrast` and `target-size` have weight 7. `label-content-name-mismatch` is hidden at weight 0 and labelled experimental.
  - A separate list of *manual* audits:
    - logical tab order;
    - focusable controls;
    - interactive element affordance;
    - managed focus;
    - focus traps;
    - visual order follows DOM;
    - offscreen content hidden;
    - custom controls labels and roles;
    - landmarks.
- **Evidence:** Headless Chrome, mobile or desktop presets.
- **Output:** A 0–100 category score plus per-audit details. The category description says automatic detection covers only a subset of issues and manual testing is still needed.
- **Measured eval:** None for a11y.
- **Copy:** The manual-audit list, a ready-made inventory of what automation cannot decide. Those items are exactly what an LLM-with-browser reviewer should own.
- **Avoid:** The weighted score. A 100 does not mean accessible, and awesome-copilot explicitly warns against treating a Lighthouse pass as proof.

### 12. pa11y/pa11y

- **URL:** https://github.com/pa11y/pa11y (README).
- **Stars / licence:** 4,570 / LGPL-3.0.
- **Checks:** HTML_CodeSniffer (default) and/or axe runners. WCAG2A, AA or AAA.
- **Evidence:** Puppeteer headless Chrome. Configurable viewport, `actions` before the test (click, set field, wait), `hideElements`, `rootElement`.
- **Output:** Issues typed error, warning or notice. Exit code 2 on the chosen level. `--threshold` and ignore codes. `--level-cap-when-needs-review` (axe only) caps the severity of any issue that needs manual review.
- **Measured eval:** None.
- **Copy:** Cap the severity of anything that needs review, so uncertain findings cannot block. Scripted pre-test actions to reach a state.
- **Avoid:** Thresholds that turn "N errors allowed" into normalised debt.

### 13. IBMa/equal-access (IBM Equal Access Accessibility Checker)

- **URL:** https://github.com/IBMa/equal-access (README, `accessibility-checker/README.md`, `accessibility-checker/src/README.md`).
- **Stars / licence:** 780 / Apache-2.0.
- **Checks:** IBM's own rule engine.
  - Report levels: `violation`, `potentialviolation`, `recommendation`, `potentialrecommendation`, `manual`.
  - Default failure levels: violation and potentialviolation.
  - Rules that cover what axe does not (read in `accessibility-checker-engine/src/v4/rules/`):
    - `style_focus_visible` (2.4.7): compares `:focus` outline and border declarations with the normal state, including colour contrast. Returns *potential* findings.
    - `element_tabbable_visible` (2.4.7): a tabbable element should be on-screen when focused. Potential.
    - `label_name_visible` (2.5.3): the accessible name must contain the visible label.
    - `target_spacing_sufficient` (2.5.8): passes on size, spacing, inline or default; potential overlap otherwise.
  - The extension adds keyboard-checking visualisations.
- **Evidence:** Browser extension, or a Node checker under Selenium, Puppeteer or Playwright; also scans local files.
- **Output:** Reports, plus **baselines**: once a scan is captured as a baseline, later scans fail only on differences. The repo also has an `AGENTS.md` and `docs/agents/`, which I did not read in depth.
- **Measured eval:** None.
- **Copy:** The *potential* vs *confirmed* distinction is a good model for our evidence labels. The 2.4.7 and 2.5.8 rules are a second engine that fills axe gaps (licence is compatible, but it would be an extra dependency). Baselines let a second review report only new issues.

### 14. Anthropic: skills, Claude Code plugins, official plugin directory

- **URLs:** https://github.com/anthropics/skills, https://github.com/anthropics/claude-code/tree/main/plugins, https://github.com/anthropics/claude-plugins-official
- **Stars / licence:** 179,881 (no SPDX shown) / 149,604 (no SPDX shown) / 37,465 (Apache-2.0).
- **What exists:**
  - `skills/webapp-testing`: Python Playwright with a "reconnaissance-then-action" pattern (wait for `networkidle`, screenshot or inspect, then act). Generic, with no UI-review criteria.
  - `frontend-design` (skill and plugin): aesthetic direction for building, not review.
  - The official directory has an external `playwright` plugin.
  - No design-review, a11y-review or visual-review agent in any of the three repos.
- **Measured eval:** n/a.
- **Copy:** Wait for the app to settle before inspecting.
- **Note:** There is no first-party precedent to align with.

### 15. Community-Access/accessibility-agents

- **URL:** https://github.com/Community-Access/accessibility-agents. Files read:
  - `README.md`
  - `skills/playwright-scanner/SKILL.md`
  - `skills/playwright-verifier/SKILL.md`
  - `mcp-server/tools/playwright-tools.js`
  - `docs/guides/playwright-high-impact-checks.md`
  - `skills/a11y-core/schemas/findings.schema.json`
- **Stars / licence:** 421 / MIT.
- **Shape:** 108 skills behind 6 routers (about 1,100 tokens until a router dispatches), an MCP server with 39 tools, and a hook that blocks edits to user-facing files until the "accessibility lead" has reviewed.
- **`playwright-scanner`:**
  - Read-only.
  - Keyboard flow (Tab sequence, traps, unreachable elements).
  - State scan: clicks triggers and runs axe per revealed state.
  - Viewport scan at 320/768/1024/1440. The code actually runs 320/768/1024/1280 and checks only horizontal scroll.
  - Computed-style contrast scan and a11y tree.
  - **Graceful degradation:** reports "degraded" when Playwright or axe is missing, so the caller falls back to static analysis.
- **`playwright-verifier`:** Compares post-fix with pre-fix results and returns `PASS | FAIL | REGRESSION`, then generates a Playwright test encoding the assertion.
- **Output:** JSON per `findings.schema.json`. Required fields: `rule`, `wcag`, `severity` (critical/serious/moderate/minor), `location`, `summary`, `fix`; optional `confidence` (high/medium/low). A script renders the report, computes a score and shows the delta.
- **Measured eval:** "Fifteen gates" check the package's own conformance. Nothing measures review quality.
- **Copy:** The structured findings schema with a `wcag` field and a `confidence` field. Per-state axe scans. Explicit degraded status. The PASS/FAIL/REGRESSION re-check vocabulary.
- **Avoid:**
  - **Promised but not executed.** The skill says the viewport scan detects undersized touch targets and maps it to 2.5.5/2.5.8, and the MCP tool is titled "Viewport / Zoom Reflow Test", but the tool code checks only horizontal scroll at four widths. No targets, no zoom.
  - The contrast tool uses the element's own `backgroundColor` (transparent parsed as black), samples only the first 100 elements, and builds selectors from tag, id and first class.
  - The keyboard scan reads only `outlineStyle`.
  - Computed scores.

### 16. plugin87/ux-ui-agent-skills — `gate`, `a11y-audit`, `design-qa`, render scripts, `evals/`

- **URL:** https://github.com/plugin87/ux-ui-agent-skills. Files read:
  - `.claude/skills/{gate,a11y-audit,design-qa,design-review}/SKILL.md`
  - `scripts/{verify_responsive,verify_states,measure_render}.mjs`
  - `evals/README.md`, `evals/HARNESS.md`, `evals/RESULTS.md`
- **Stars / licence:** 1,539 / MIT.
- **Checks:**
  - `a11y-audit` requires a P0 set per component:
    - keyboard;
    - focus visible at ≥3:1;
    - name, role and state;
    - contrast 4.5:1 for text and 3:1 for UI;
    - target size ≥24×24;
    - no colour-only signalling.
    It also covers WCAG 2.2 Focus Not Obscured (2.4.11), Target Size (2.5.8) and Accessible Authentication (3.3.8). Its rule: measure, don't eyeball; never state a ratio you did not measure.
  - `verify_responsive.mjs`:
    - fails on horizontal overflow at 280/320/414;
    - `--scale=1.25` renders with a larger root font as a proxy for wider fallback fonts on other platforms and for users with larger text (the author saw a label tip over at 280px on Linux Chromium);
    - fails loudly in CI when Playwright is missing instead of reporting green.
  - `verify_states.mjs`: contrast for every interactive element in default, hover and focus, walking up ancestors for the effective background.
  - `measure_render.mjs`: every text element against the alpha-composited ancestor background stack, light and dark.
- **Evidence:** Headless Chromium on HTML harness files. Plus "render-and-look": screenshot, park the pointer off the page, inspect each state, click each control.
- **Output:** One all-or-nothing `N/N` line from the gate. The a11y findings table is WCAG criterion · P0/P1/P2 · what fails · fix, with passes confirmed explicitly.
- **Measured eval (the only one of its kind here):**
  - Briefs are given to **blind subagents** in scaffolded projects, with no design hints or gate coaching.
  - Output is scored by 14 objective render gates (hardcodes, WCAG light/dark, state contrast, axe, responsive at 280/320/414 and again at 1.25x, target size, keyboard, reduced motion, content overflow, "interactive truth"…), then a manual requirements read.
  - `RESULTS.md` records 8 runs, all 14/14, with provenance (in-session "contaminated" vs blind).
  - `--self-test` scores the kit's reference app with the same gates. That self-test found an overflow at 280px and a false positive on screen-reader-only text in their own gate.
  - Caveats: this measures the *builder kit's* output against *its own* gates, not reviewer precision or recall. n is small.
- **Copy:**
  - Never state a measurement you did not take.
  - Alpha-composited contrast, state-aware contrast, and the 1.25x font-scale pass.
  - A missing browser fails loudly instead of passing.
  - The eval-results table reading: objective fail = kit bug; objective green but requirements fail = a judgment gap.
  - When a requirement fails repeatedly, promote it to a deterministic gate.
- **Avoid:** All-or-nothing `N/N` as a review output (fine for CI, wrong for advisory review). Fixed tiny widths without a sweep.

### 17. ibelick/ui-skills — `improve-ui`, `fixing-accessibility`

- **URL:** https://github.com/ibelick/ui-skills (`skills/improve-ui/SKILL.md`, `skills/fixing-accessibility/SKILL.md`, `skills/baseline-ui/SKILL.md`).
- **Stars / licence:** 9,430 / MIT.

**`improve-ui`.** Read-only on product source; it writes plans only. It uses rendered evidence only when the user supplies or requests it. A candidate becomes a finding only with three proofs:
1. **Contract:** a cited binding design decision, or a direct contradiction.
2. **Runtime:** proven to reach the surface.
3. **Correction:** exactly one change, with no invented intent.

Further rules:
- Source alone cannot prove hierarchy, prominence or usability; those need rendered or user evidence.
- A falsification pass re-opens every cited source and deletes candidates that are mismatched, ungoverned, ambiguous, invented or duplicated.
- **Stop at three findings.** "No supported findings" is a valid output.
- A fixed table: Problem | Evidence | Proposed change | Scope | Confidence.

**`fixing-accessibility`.**
- Priority-ordered categories, with names, keyboard and focus as critical.
- Each finding quotes the snippet, gives one sentence on why it matters, and proposes a minimal fix.
- "Tool boundaries": no unrelated refactors, no ARIA where native semantics work.

- **Measured eval:** None.
- **Copy:** The proof gate, adapted for rendered evidence (contract = a cited rule or WCAG criterion; runtime = observed at viewport/state X; correction = one change). The falsification pass. A low cap. An explicit "no supported findings".
- **Avoid:** Its default exclusion of accessibility findings (the reverse of our scope).

### 18. addyosmani/web-quality-skills — `web-quality-audit`, `accessibility`

- **URL:** https://github.com/addyosmani/web-quality-skills (`skills/web-quality-audit/SKILL.md`, `skills/accessibility/SKILL.md`).
- **Stars / licence:** 2,897 / MIT.
- **Checks:** Lighthouse categories plus manual checks. The a11y skill covers WCAG 2.2.
- **Evidence:**
  - Live baseline first (Lighthouse or CDT MCP `lighthouse_audit`, `take_snapshot`, traces), then source inspection localised by runtime failures.
  - Use snapshot mode to preserve authenticated state.
  - Static analysis is only a smoke test.
- **Output:**
  - An Evidence table (signal | scope/conditions | result | source).
  - Findings each tagged with **evidence type**: measured failure, runtime observation, or source hypothesis.
  - Critical/High/Medium/Low.
  - A Verification section listing what was re-run, what manual checks were done, and what field validation is still pending.
- **Measured eval:** None.
- **Copy:** The three-way evidence tag. Scope and conditions recorded for each measurement. A section for what still needs human or field validation.
- **Avoid:** Reporting the aggregate Lighthouse score as a result line (it is in their template).

### 19. github/awesome-copilot — `accessibility-runtime-tester`

- **URL:** https://github.com/github/awesome-copilot/blob/main/agents/accessibility-runtime-tester.agent.md (also `accessibility.agent.md`).
- **Stars / licence:** 39,743 / MIT.
- **Checks:**
  - Keyboard-first runtime testing: initial focus, focus not lost on route change, dialog trap and return.
  - Forms: names, instructions, error association.
  - Dynamic updates announced.
  - Composite widget key patterns.
- **Evidence:** Prefers Chrome DevTools MCP; Playwright only for repeatable keyboard automation. Inspect the DOM *after* runtime testing, not instead of it.
- **Output:** Per issue: impacted flow, repro steps, expected, actual, WCAG, severity (Critical/High/Medium/Low), likely fix direction.
- **Measured eval:** None.
- **Copy:** The repro / expected / actual finding shape. "Passes Lighthouse" is not proof. DOM inspection after runtime, not in place of it.
- **Note:** This overlaps with `ux-advisor` (focus after action, announcements). The static-UI reviewer should take only the *visibility* half of focus.

### 20. openai/skills — `playwright-interactive`

- **URL:** https://github.com/openai/skills/blob/main/skills/.curated/playwright-interactive/SKILL.md
- **Stars / licence:** 27,902 / no SPDX licence shown at repo level (not verified per skill).
- **Checks:** A visual QA pass kept separate from functional QA. Its rules:
  - Build a shared QA inventory of requirements, features, controls, states and claims.
  - Verify each user-visible claim *in the state where it is perceived*.
  - Inspect the initial viewport before scrolling.
  - Inspect the densest realistic state.
  - Run a separate pass at the minimum supported (or a smaller realistic) viewport.
  - Treat an affordance that is present but weak, occluded or clipped as a failure.
  - Clipping is a bug even if page-level scroll metrics look fine. When screenshots and numeric checks disagree, investigate; **visible clipping in a screenshot cannot be overruled by metrics**.
  - Prefer viewport screenshots over full-page ones; use focused crops for regions.
  - Before signoff, ask what has not been inspected yet and what defect would most embarrass the result.
  - End with a brief **negative confirmation** of the defect classes checked and not found.
  - `page.evaluate` may stage state but does not count as signoff input; use real keyboard, mouse or touch.
- **Evidence:**
  - Explicit viewport passes (deterministic); `deviceScaleFactor` for DPI.
  - A separate headed native-window pass, treated as a context reset.
  - A mobile context with `isMobile` and `hasTouch` at 390×844.
  - Screenshots normalised to CSS pixels so model-reported coordinates line up.
- **Output:** Signoff checklist. No severity scheme.
- **Measured eval:** None.
- **Copy:** Nearly all of the visual-QA rules above are directly usable. In particular: screenshot beats metric; the densest-state and minimum-viewport passes; negative confirmation; real input for signoff; CSS-pixel screenshots.
- **Avoid:** Its signoff item asking for an aesthetic-quality judgment. That is out of scope for us (taste belongs to the critique work already studied).

### 21. Smaller design-review skills

- **Dammyjay93/interface-design `/design-review`** (5,772 / MIT). File: `.claude/commands/design-review.md`.
  - A strict craft review: Blocker and lower severities, a "presumptive blockers" list, and an approval bar.
  - Renders only if a tool is available; otherwise reads the layout.
  - Taste-centric, so mostly out of scope.
  - Copy: the severity-then-false-positive filtering step ("separates a review from a wishlist").
- **julianoczkowski/designer-skills `design-review`** (576 / Apache-2.0). File: `design-review/SKILL.md`.
  - Screenshots are mandatory.
  - Tool fallback chain: Playwright MCP, then Cursor's browser, then **ask the user for screenshots at 1280, 768 and 375**, and wait.
  - Descriptive filenames (`review-<page>-<mode>-<width>.png`) in a fixed folder.
  - Copy: the fallback chain and the naming. Avoid: fixed tiers.
- **Owl-Listener/designer-skills `accessibility-audit`** (2,846 / MIT). File: `design-systems/skills/accessibility-audit/SKILL.md`.
  - A short POUR outline, a 4-level severity, and "test with real assistive technologies" with no tooling. Nothing to borrow.

### 22. vercel-labs/agent-browser (the driver `ux-advisor` already uses)

- **URL:** https://github.com/vercel-labs/agent-browser (README).
- **Stars / licence:** 43,567 / Apache-2.0.
- **Relevant capabilities:**
  - `snapshot` (a11y tree with refs).
  - `get box <sel>`, `get styles <sel>` (computed), `eval <js>`.
  - `set viewport <w> <h> [scale]`, `set device "<name>"`, `set media dark|light`.
  - `screenshot [--full] [--annotate]`.
  - `diff screenshot --baseline`, `diff snapshot`.
  - `a11y [--tags wcag2a,wcag2aa,…] [--selector] [--json]`, which embeds axe-core and returns `violations` plus `incomplete`.
  - `focus`, `keyboard`.
  - `-p ios --device "iPhone 16 Pro"` drives **real Mobile Safari in the iOS Simulator** on macOS with Xcode: snapshot, tap, fill, swipe, screenshot.
- **Limits:** `a11y` and `--annotate` are unavailable on the Safari/iOS WebDriver backend.
- **Copy:** This is the natural driver for `ui-reviewer`:
  - axe via `a11y` with the WCAG 2.2 tags;
  - geometry via `get box` and `eval`;
  - colour via `get styles`;
  - real Safari via `-p ios` for focus behaviour, the virtual keyboard and toolbars.
- **Note:** I verified these commands only from the README; I did not run them.

### 23. microsoft/playwright-mcp

- **URL:** https://github.com/microsoft/playwright-mcp (README).
- **Stars / licence:** 37,874 / Apache-2.0.
- **Relevant:** `--browser webkit` (closer to Safari than Chromium, but not Safari), `--device "iPhone 15"`, `--viewport-size`, `browser_resize`, `browser_snapshot` (a11y tree, "better than screenshot"), opt-in `--caps=vision` for coordinates. The README itself recommends the CLI + skills route (playwright-cli, 13,833 stars) for token efficiency.
- **Copy:** A WebKit pass as a cheap middle step when the iOS Simulator is unavailable, labelled as WebKit, not Safari.

### 24. Storybook a11y addon and Chromatic accessibility tests

- **URLs:** https://storybook.js.org/docs/writing-tests/accessibility-testing, https://chromatic.com/docs/accessibility. The Chromatic docs URL `/docs/accessibility-testing/` returned 404; `/docs/accessibility` opened.
- **Stars / licence:** storybookjs/storybook 91,203 / MIT; chromaui/chromatic-cli 339 / MIT. Chromatic is a hosted service; pricing not verified.
- **Checks:** axe per story. `parameters.a11y.test` is `off`, `todo` (warn) or `error` (fail). Runs in Vitest browser mode (Playwright Chromium).
- **Chromatic:**
  - Runs axe for every configured viewport and mode, in Chrome only.
  - Keeps a **per-story baseline** of violations and flags only new or changed ones, separating legacy debt from regressions.
  - Stated gaps: no `prefers-reduced-motion` checks, no custom rules, no iframes.
- **Measured eval:** Repeats axe's 57% claim.
- **Copy:** The baseline / new-only reporting for re-reviews. Running the deterministic layer per viewport and per mode (light/dark).

### 25. Polypane

- **URL:** https://polypane.app/docs/accessibility-panel/
- **Stars / licence:** commercial, 14-day trial; pricing not verified.
- **Checks:**
  - Multi-viewport panes, mobile to 5K, side by side.
  - An a11y panel on the same validators as Lighthouse.
  - Focus order and full a11y tree views.
  - Emulation: reduced motion, forced colours, prefers-contrast, colour-vision simulators, dark/light.
  - Rulers and layout debugging.
  - The docs mention an MCP server and a CLI, without detail.
- **Measured eval:** Not verified.
- **Copy:** The idea of viewing many widths *at once*, which matches the width-sweep need. Forced-colours and prefers-contrast as extra modes.

---

## Patterns to adopt / avoid for `ui-reviewer`

### Adopt

**1. Two evidence layers, labelled separately.**
- A deterministic probe layer produces candidates:
  - axe via `agent-browser a11y`, with the WCAG 2.2 tags so that `target-size` runs, and with `incomplete` treated as leads;
  - computed geometry and colour via `get box`, `get styles` and `eval`.
- The LLM judges what probes cannot.
- Tag every finding by evidence type: *measured* / *observed in screenshot* / *source hypothesis*.
- Never let a clean probe run stand in for a pass.
- Sources: impeccable `audit`/`layout`/README; addyosmani `web-quality-audit`; uupm `design-audit.mjs` + agent split; IBM potential vs confirmed; CDT a11y skill.

**2. Never state a number you did not measure.**
- Compute contrast against the alpha-composited ancestor background stack, never the element's own `backgroundColor`, and never from a screenshot.
- Measure in default, hover and focus states, and in light and dark.
- Uncertain backgrounds (images, gradients) go to "needs review", with the severity capped.
- Sources: plugin87 `measure_render`/`verify_states`/`a11y-audit`; CDT a11y skill; Accessibility Insights needs-review; pa11y `--level-cap-when-needs-review`. Anti-examples: wshobson `/accessibility-audit`, CA contrast tool.

**3. A width sweep, not three breakpoints.**
- Sweep from narrow (about 280px) to wide in small steps, and repeat at a 1.25x root font.
- At each width, record each component's line count and height, not only page `scrollWidth`.
- Report the *width range* where a defect appears (e.g. "3-line wrap at card width 270–343px").
- Record the component's own container width, because cards and columns are narrower than the viewport.
- Sources: impeccable `adapt` (start narrow, stretch until it breaks); plugin87 (280/320/414 + scale); github reflow plugin (320); uupm dedupe with "seen at". Anti-examples: OneRedOak and julianoczkowski fixed tiers.

**4. State × viewport × resize matrix.**
- Inspect each enumerated state (expanded, error, densest realistic content) at each relevant width.
- Run a separate pass at the minimum supported viewport.
- Add a **resize-after-interaction** probe: open the state at width A, resize or rotate to B, and compare with a fresh load at B.
- Inspect the initial viewport before scrolling.
- Sources: openai `playwright-interactive` (state where perceived, densest state, minimum viewport, mode switch = context reset); CA state scan; CDT `emulate …,landscape`. The resize-after-interaction probe is **not found in any source**; it comes from the reference defect.

**5. A focus-visibility pass with the real Tab key.**
- Press Tab (and Shift+Tab) for real; do not call `el.focus()`.
- Crop a screenshot of each focused element.
- Test the ring's painted extent against ancestor clip boxes (`overflow` other than `visible`) and against sticky or fixed overlays.
- Use Accessibility Insights' five Tab-stop defects as the checklist.
- Stay out of `ux-advisor`'s lane: focus *after an action* is theirs.
- Sources: WIG (visible, unobscured; sticky never covers focus); Accessibility Insights Tab stops; CDT `press_key` + snapshot; openai (real input for signoff). Anti-examples: the `outline !== none` / any-`box-shadow` checks in wshobson, CA and uupm. axe has no 2.4.7 or 2.4.11 rule; IBM's `style_focus_visible` and `element_tabbable_visible` only return CSS-heuristic *potential* findings.

**6. Hit-area probing, not box size alone.**
- Measure the target box against an explicit standard: 24px under WCAG 2.5.8 / WIG desktop, 44pt Apple / WIG mobile, 48dp Android. Name the one you apply.
- Probe the label and padding area with `elementFromPoint` or a click, to tell whether the padding actually activates the control (inert padding, dead zones).
- Sources: WIG (24/44, no dead zones); axe `target-size` (off by default); uupm 44px check; ui-ux-pro-max checklist (44pt/48dp). Probing the padding is **my addition**; no source does it.

**7. Accessible-name proofreading from the a11y tree.**
- Dump role, name and state for every control and graphic.
- Have the LLM check:
  - label-in-name;
  - run-together words;
  - untranslated or placeholder strings;
  - empty names;
  - decorative SVGs that are exposed or whose `<title>` repeats adjacent text.
- axe covers only fragments: `label-content-name-mismatch` for author labels, and `svg-img-alt` for presence only.
- Sources: CDT a11y skill (tree as source of truth); WIG (hide decoration, verify in the a11y tree); uupm checklist (decorative icons hidden); axe rule list.

**8. Evidence provenance and named gaps.**
- Every report states:
  - the engine (Chromium / WebKit / real Mobile Safari);
  - emulated or real device, and DPR;
  - viewports and modes covered;
  - what stayed untested (for example "virtual keyboard overlap: untested, no iOS Simulator").
- Use `agent-browser -p ios` when the Simulator exists; otherwise WebKit via Playwright as a labelled middle step.
- An unreachable device is a reported gap, not a blocker and not an assumed pass.
- Sources: impeccable `adapt` and `audit` (responsive); agent-browser iOS provider; playwright-mcp `--browser webkit`; CA degraded status; julianoczkowski fallback chain.

**9. Validate captures before judging.**
- A blank, wrong-state, wrong-viewport or still-animating capture means recapture, not review.
- Normalise screenshots to CSS pixels so coordinates and box measurements agree.
- If screenshot and metric disagree, investigate. Visible clipping wins.
- Sources: impeccable `finish-reviewer` check 0; openai `playwright-interactive`.

**10. Bounded, ranked output with a derived verdict.**
- Use a fixed severity vocabulary and a fixed, *derived* verdict word.
- Cap the findings, somewhere between three and eight; overflow goes to a counted "also seen" line.
- No praise or summary filler.
- Each finding gives:
  - location (selector or a11y-tree path + viewport/width range + state);
  - evidence type;
  - repro;
  - expected vs actual;
  - the standard cited (WCAG SC or WIG rule);
  - one correction;
  - confidence.
- "No supported findings" is a valid result.
- End with a negative confirmation of the defect classes checked and not found.
- Sources: impeccable `finish-reviewer` (max 8, 4-word disposition, no praise); ibelick `improve-ui` (stop at 3, no-findings output, one correction); openai (negative confirmation); awesome-copilot (repro / expected / actual); CA schema (wcag, confidence); WIG (terse location, ✓ pass).

**11. A falsification pass before reporting.**
- Re-open the evidence for each candidate and try to disprove it: wrong state, emulation artifact, deliberate design, duplicate root cause.
- Default to assuming the goal is not achieved until the evidence proves it, and do not accept a visible difference as proof of correctness.
- Sources: ibelick `improve-ui`; wshobson `ui-visual-validator`; Dammyjay93 severity-then-false-positive filter.

**12. Measure the reviewer with seeded defects.**
- Build a fixture set from the reference project's slipped defects: chip wrap at 270–343, resize-width bug, clipped ring, inert padding, 3:1 counter, glued name, redundant SVG title, keyboard-covered Save. Plus clean controls.
- Score detection, false positives and evidence correctness.
- When the same defect recurs, promote it from an LLM check to a deterministic probe.
- Use blind runs with no coaching, and record provenance.
- Sources: plugin87 `evals/` (blind subagents, self-test, failures become gates); impeccable detector fixture corpus and recall tests; Chromatic and IBM baselines for re-runs.

### Avoid

**A1. Health scores and weighted 0–100 numbers.**
- Sources: impeccable audit (/20 score, rating bands, a prompt to re-run until the score rises); wshobson (100 − weights); CA (score + delta); VoltAgent (67→98 sample); Lighthouse score as proof (warned against by awesome-copilot and Lighthouse itself).

**A2. Promising checks that cannot run.**
- Sources: VoltAgent `accessibility-tester` (NVDA/JAWS/VoiceOver with Read/Grep/Bash on haiku); wshobson `ui-visual-validator` (Chromatic/Percy/Applitools never invoked; contrast "measured" from screenshots) and `accessibility-expert` (real-AT testing); CA viewport scan (claims touch targets and zoom, checks only overflow); OneRedOak (4.5:1 with no measurement step); Owl-Listener (real AT, no tooling).
- Rule for us: every check in the prompt maps to a named command, or it is listed as "judgment, from screenshot" or "untested".

**A3. Naive deterministic probes presented as truth.**
- Element-own background for contrast; `outline !== none` for focus; any `box-shadow` = focus ring; box-size-only targets; finding counts with no locations.
- Sources: wshobson, CA, uupm `design-audit.mjs`.

**A4. Fixed three-viewport tiers as the whole responsive story.**
- Sources: OneRedOak (1440/768/375), julianoczkowski (1280/768/375), uupm agent (5 tiers). These miss container-width bugs like the 270–343px wrap.

**A5. Write tools on a reviewer, and unbounded "exhaustive" scope.**
- Sources: OneRedOak agent (Edit/Write/MultiEdit); VoltAgent ui-designer and ui-ux-tester (Write/Edit, "every micro-detail").
- `ui-reviewer` should be read-only like `ux-advisor`, with impeccable `finish-reviewer`'s turn and reading budget.

**A6. Mandatory praise sections and positive openings.**
- Sources: OneRedOak, uupm agent ("What's working"), impeccable audit (positive findings).
- The impeccable `finish-reviewer` and ibelick show the alternative: one `keep` line at most.

**A7. Inconsistent standards.**
- WIG's README offers `maximum-scale=1` as an alternative to 16px inputs while also forbidding zoom-disabling. It also prefers APCA while WCAG 2.x is the conformance bar.
- Target-size numbers differ: 24 / 44 / 48.
- Pick one standard per check, cite it, and do not mix.
