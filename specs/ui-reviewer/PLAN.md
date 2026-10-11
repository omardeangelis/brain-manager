---
domain: compat
type: plan
links:
  - "[[specs/ui-reviewer/SPEC]]"
  - "[[specs/ui-reviewer/RESEARCH-ui-reviewer]]"
  - "[[specs/project-config-and-flow-modes/PLAN]]"
created: 2026-10-08
updated: 2026-10-08
---

# Plan: `ui-reviewer`, the `ui-review` skill, and the `agent-browser` stub

**Status:** done (2026-10-10): T1–T14 done; T14 accepted by the maintainer with the lean charter (SPEC D10). The record in `benchmark/` and the whole of `specs/ui-reviewer/` are not committed yet.
**Branch:** `feat/project-config-and-flow-modes`. It ships in 0.7.0 with that spec; the version is already bumped.
**Spec:** [SPEC.md](SPEC.md) (approved 2026-10-08) · **Evidence:** [RESEARCH-ui-reviewer.md](RESEARCH-ui-reviewer.md), with the full reports in [research/](research/).

## Before you start

1. **Read the docs:**
   - [SPEC.md](SPEC.md): the contract, AC1–AC15;
   - [RESEARCH-ui-reviewer.md](RESEARCH-ui-reviewer.md): parts B3 (driver traps), C (design rules) and D (benchmark);
   - [research/mapping.md](research/mapping.md): the exact `agent-browser` commands and recipes (R-RING, R-HIT, R-NAME, R-AXE, R-SWEEP, R-RESIZE, R-JUMP, R-EDGE), and what each returned on the probe page. Where this plan corrects a recipe (T4 focus ring, hit area; T3 output encoding), the plan wins;
   - `test/EVAL.md`: the release bar.
2. **The decisions D1–D9 are settled** (SPEC → Decisions). Do not reopen them. If one turns out unworkable, stop and ask the maintainer. Each lands in:
   - D1 (dedicated agent, target size moves) → T6, T7;
   - D2 (three moments) → T8, T10;
   - D3 (device route) → T5, T6, T11;
   - D4 (probes in a companion skill) → T3, T4, T5;
   - D5 (one case, maintainer labels) → T14;
   - D6 (axe source) → T4, T5;
   - D7 (`agent-browser` stub) → T1, T2, T11;
   - D8 (no UX replay re-run) → Log only;
   - D9 (winner only) → T8.
3. **Keep the repo conventions.**
   - Pure logic lives in `src/core/*`, with a co-located `*.test.ts`.
   - Filesystem effects live in `src/services/*` and `src/commands/*`.
   - Every new CLI behavior gets an integration case in `test/integration.test.ts` or an EVAL row.
   - Run `npm run build` and `npm test` after every task.
4. **Parallel tasks never share a tree.** The integration suite rebuilds `dist/` in its `beforeAll`. Two tasks that build and test in the same checkout collide:
   - one edits `src/` while the other's tests run;
   - or one deletes assets the other's build reads.

   Each task of a parallel wave runs in its own worktree. Before merging, rebuild and run the suite once on the merged tree. Without worktrees, run the wave one task at a time.
5. **Keep the package public.**
   - No reference-project names in `assets/` (the EVAL "no foreign tokens" rule). The fixture, the calibration examples and the [man] sample project are generic.
   - **`design-engineering` is a paraphrased rewrite of paid course material.** T7 only removes or redirects lines there.
   - **The overlap check:** every changed or added line in that skill is checked with a 10-word n-gram overlap against the course source files (`<course-source>`, the maintainer's local copy). Only curve and duration values may match. Without the source copy, the change stays a pure deletion plus pointer sentences written fresh, and the Log says the check could not run.
6. **Benchmark isolation (T14) starts now.** The session that writes the agent or the skill never reads:
   - the maintainer's notes;
   - the control output;
   - the pool or the judgments;
   - any artifact of `company/company-onboarding-redesign` dated after `e2442d09`: its spec, its review `REPORT.md`, its tech-debt pages, its later commits.

   Serving the prototype at `e2442d09` is allowed; studying its UI to tune the agent is not. T13 opens the reference project at a later commit, so it runs only after T14's scoring.

   **Breach, 2026-10-08.** The maintainer sent the notes in chat, so the orchestrating session has read them. The SPEC, RESEARCH and this plan up to plan-gate round 2 were written before that; their pre-notes SHA-256 are:
   - `PLAN.md`: `c8d27eb29ed66b9905a1260c0256f028ab6971b0f99ae560a344b6f54fb6b955`;
   - `SPEC.md`: `9d2eb33aeb2eb9b7f6a02fc6dca4ef480497a7ba806ffd8237a19a7274c68245`;
   - `RESEARCH-ui-reviewer.md`: `3a4e2d7446dc1eb7f3942a991bbf40ad5ffc8456faecf1cfac469e0f1b568737`.

   From here on:
   - **Sealed location:** the notes and their screenshot live in `specs/ui-reviewer/benchmark/` and stay uncommitted until T14 step 9, so the worktrees (made from `HEAD`) never contain them. No worker brief names that folder, except the pooler's, the counter's and the scorer's.
   - **The orchestrator writes no reviewer content.** T3–T6, and the reviewer-facing wording of T8 and T10, go to clean-context workers. Each brief is that task's plan text verbatim, plus the file paths and the shared phrasing; it holds no extra examples, calibration cases, hints or fixture ideas.
   - **Frozen task text:** the T3–T6 text of this plan does not change after the baseline above, unless a gate finding or a failing test forces it. Each such change is listed in the Log with its cause.
   - **Contamination audit** (T14 step 2b): before the freeze, a clean-context auditor compares the notes with the agent, the skill and the fixture.
   - **The maintainer may still choose a fresh case** instead of this one, at step 2b or before scoring (RESEARCH D's failure path).

## Shared phrasing (use verbatim across assets)

- **Ownership line** (for short mentions; the agent and the skill carry the full SPEC §Ownership table):
  > UX → `ux-advisor` · static UI of the rendered page → `ui-reviewer` (bar and probes: the `ui-review` skill) · motion and interaction craft → `design-engineer` (`design-engineering`)
- **Motion boundary:**
  > If it changes while an animation or transition runs on the surface, it is motion; an instant re-layout with nothing animating is UI.
- **Target size:**
  > Target size belongs to the `ui-review` bar: 24 px by default, 44 or 48 px when the project says touch-first (`brain/chore/ui-review.md` → Project bar).
- **Guide load:**
  > Before the first `agent-browser` command, run `agent-browser skills get core` and follow it: it is the usage guide for the installed version.
- **Script invocation:** always `bash <skillsDir>/ui-review/scripts/<script>.sh …`. Installed files are written without the exec bit (`src/services/fsx.ts` `writeText`), so a bare `./probe.sh` fails in projects.
- **Config read step** (unchanged from the previous plan):
  > Read `brain/brain.config.json` (keys in `brain/AGENTS.md` → Project configuration). If it is absent, use the defaults listed there.

## Decision ledger

| # | Decision | Source |
|---|---|---|
| 1 | Static UI review goes to a new agent `ui-reviewer`; `design-engineer` keeps motion and interaction craft | SPEC D1 |
| 2 | Moments: prototype review, live surface on request, UI pass in `adversarial-review` | SPEC D2 |
| 3 | Mobile Safari only when Appium with XCUITest is already installed; never install | SPEC D3 |
| 4 | Probes are tested script files in the `ui-review` companion skill | SPEC D4 |
| 5 | Benchmark on `company/company-onboarding-redesign` at `e2442d09`, labelled by the maintainer from a judged pool; the maintainer writes notes first (option A) on UI and motion; the RESEARCH D bar is approved | SPEC D5, 2026-10-08 |
| 6 | axe: `a11y` (≥ 0.33.0) → project `node_modules/axe-core` → none; never a CDN | SPEC D6 |
| 7 | The bundled `agent-browser` skill becomes the upstream stub now, not in a later release | SPEC D7 |
| 8 | No UX replay re-run | SPEC D8 |
| 9 | `ui-reviewer` reviews the winner only | SPEC D9 |

**Assumptions** (no question was needed; each is the safe reading of the spec):
- **A1 — Task fields.** This repo has no tracker, as in the previous plan.
  - **Backlog fields:** `backlog_item_id: none`, `backlog_item_url: none`, `relation_mode: none` for every task.
  - **`log` and `files edited/created`:** they live in the Log section, not per task, as the previous plan did.
  - **`assigned_skills: agent-browser`:** implied for every `browser` or `mixed` task (T3, T4, T8, T10, T14).
- **A2 — No `design-engineer` advisor pass.** The spec ships agents, skills and CLI behavior, not a product surface with motion, so `create-plan` step 10 does not fire. T7 edits `design-engineer`'s own docs under the spec's ownership rules.
- **A3 — `init` and a pre-existing `agent-browser` folder.**
  - **With no manifest entry:** a copy that differs from the bundled stub stays project-owned (`seed`), as today.
  - **With a manifest entry:** a copy whose files the existing manifest tracks as `managed`, unchanged since, stays `managed`. Today `init` rewrites the manifest from scratch and would turn an untouched 0.6 bundled copy into a project-owned one for good. T2 fixes this.
- **A4 — Probe contract.**
  - Each probe is one in-page script file plus, where it needs viewport changes, key presses or clicks, a step in the shell runner.
  - It is invoked with one `bash` command and prints one JSON document on stdout.
  - Arguments pass as JSON.
- **A5 — Probe tests.** They live in vitest and are gated on `agent-browser` being on `PATH`. Without the CLI, they skip with a note, and an EVAL row covers the manual run.
- **A6 — Benchmark runs.** They use clean-context general-purpose agents given the shipped charter and skill verbatim, as T17 did, because this session has no installed `ui-reviewer` subagent type.
- **A7 — No new devDependency.** Adding `axe-core` to the repo would be a download. The `node_modules` branch of `axe.sh` is tested when `AXE_CORE_DIR` points to a local `axe-core` folder, and otherwise by an EVAL [man] row.

## Codebase findings

- **Skills and agents are enumerated from `assets/`** (`src/services/Assets.ts:51-64`). A new `assets/skills/ui-review/` and `assets/agents/ui-reviewer.md` ship without a registry change. Every file under a skill folder ships, `.js` and `.html` included.
- **Installed files lose the exec bit.** `writeText` (`src/services/fsx.ts:43-49`) writes mode 644, hence the Script-invocation rule.
- **Companions** (`src/core/companions.ts`). An agent's frontmatter `skills:` list links it to its skills; `install-skill` and `upgrade --skill` carry the agent along.
- **Two callers of the upgrade planner.**
  - `planUpgrade` (`src/core/plan.ts:26-71`) is called by `upgrade.ts:188` and by `doctor.ts:122-142`, whose switch has `case "Orphan"`.
  - A `managed` entry with no bundled asset becomes `Orphan` before the disk is checked. `upgrade.ts:254-256` then says "left on disk" even when the file is missing.
  - A new bundled path is installed whatever the role of its skill folder (`plan.ts:57-68`). `doctor` reports it as `outdated` and exits 1.
  - `doctor.ts:143-155` reports files inside a bundled skill folder that are neither shipped nor tracked as `untracked`.
  - `ReportLine.status` is a plain string (`src/core/report.ts`). Only the `STATUS` maps need the new tags.
- **Hashes normalize advisor blocks away** (`src/core/hash.ts`, `src/core/advisors.ts`), so the orphan rule must inspect the raw content.
- **`init` rewrites the manifest** from the entries it computes (`init.ts:237-255`), and records a differing `agent-browser` copy as `seed` (`init.ts:140-152`).
- **The entry point is `dist/bin.js`** (`package.json` `bin`; `test/integration.test.ts:19`). `dist/Cli.js` only exports.
- **`agent-browser` 0.27.1 behaviour** (measured by the gate):
  - about 0.2 s per CLI call, and about 0.4 s per width step of a sweep;
  - `eval --stdin` awaits async functions;
  - a returned object prints as JSON, but a returned `JSON.stringify` string prints as a quoted literal;
  - `file://` pages open;
  - with `outline: none`, Chromium still reports `outlineWidth: 3px`.
- **Counts and ownership text to change:**
  - `test/EVAL.md:15`: 11 skills and 4 agents;
  - README: "Four advisor subagents" (`:116`); the release notes `:122` and the "Leftovers" bullet `:157-158`; the tree `:175`;
  - init-brain: `SKILL.md`; `advisor-detection.md:17` (exclusion list) and `:42` (the ux/design line); `verify.md:25` (skill list); `migration.md:89`;
  - Brain Schema `assets/brain/AGENTS.md` and its `CLAUDE.md` twin: `:19` (prototype runs only `ux-advisor`), `:26` ("UI … stays with `design-engineer`"), the advisor list `:24-29`, and the `ux-review.md` entry `:130`;
  - `prototype` `SKILL.md`: `:16-17`, `:99-117` (Phase 6), `:136`, `:145`, and the harness line `:79`.
- **44 px rules to remove:**
  - `assets/agents/design-engineer.md:77`;
  - `design-engineering`: `SKILL.md:56` (routing row), `references/review.md:20` and `:76`, `references/audit.md:38`, `references/accessibility.md:73`, `references/gestures.md:61`.
- **The verifier's read-only rule** (`assets/agents/adversarial-verifier.md:72`, "never … mutate … any external system") needs the UI-pass carve-out.
- **Motion-craft pass wiring.** `assets/agents/review-classifier.md:85` and `adversarial-review/references/verification-phase.md:22` are the pattern for the UI pass.
- **The probe page** (`research/probe/index.html`, 127 lines) reproduces the clipped ring, the checkbox row, the counter contrast, label-in-name and the chip preview. It grows into the fixture.
- **Upstream stub.** `vercel-labs/agent-browser` `skills/agent-browser/SKILL.md`, last changed in `021d9255` (2026-08-24), under Apache-2.0, with no NOTICE file. The installed 0.27.1 serves `skills get core` (478 lines; `--full` gives 2,438) and `skills list`. It lacks the `derive-client` and `protected-vercel-deployments` skills that the stub names.
- **`axe-core`** cannot be resolved from this repo.

## Task graph

```
Wave 1 (parallel, one worktree each)
  T1 upgrade + doctor: orphan rule, seed-skill rule (src/core/plan.ts, src/commands/{upgrade,doctor}.ts)
  T3 ui-review: fixture, runner, geometry probes (assets/skills/ui-review/, test/ui-review-probes.test.ts)
Wave 2 (parallel, one worktree each)
  T2 agent-browser stub + init rule (T1)
  T4 ui-review: focus, hit area, contrast, layout-jump probes, axe helper (T3)
Wave 3
  T5 ui-review SKILL.md (T3, T4) → T6 ui-reviewer agent (T5)
Wave 4 (assets, SEQUENTIAL — overlapping files)
  T7 ownership sweep → T8 prototype → T9 create-spec + Brain Schema → T10 adversarial-review UI pass
Wave 5
  T11 init-brain (T1, T2, T6, T9, T10) → T12 README, EVAL, full grep (all)
Wave 6 (validation)
  T14 benchmark (T12; maintainer steps) → T13 reference-project upgrade dry run (T12, after T14 step 8)
```

Wave 4 runs in order:
- T7 and T8 both touch `implement-spec` and `prototype`-adjacent wording;
- T9 and T10 both edit the Brain Schema twins.

## Tasks

### T1 — Upgrade and doctor: orphan removal and the seed-skill rule
- **depends_on:** —
- **location:** `src/core/plan.ts`, `src/core/plan.test.ts`, `src/commands/upgrade.ts`, `src/commands/doctor.ts`, `test/integration.test.ts`, `test/EVAL.md`
- **description:**
  - **`planUpgrade`: replace `Orphan` with three outcomes** for a `managed` entry the package no longer ships:
    - **`Remove`:** the disk hash equals the manifest hash, and the raw disk content holds no advisor block with content (non-placeholder, per `extractAdvisorsBlock` / `isPlaceholderBlock`).
    - **`OrphanModified`:** any other content on disk. Never deleted, even with `--force`.
    - **`OrphanMissing`:** nothing on disk.
  - **Two new `UpgradeInput` fields** keep the planner pure:
    - **`advisorContent`:** the paths whose disk content holds a non-placeholder advisor block;
    - **`seedSkillDirs`:** the skill folders that have at least one manifest entry, all of them `seed`. A folder with no entries (a brand-new bundled skill such as `ui-review`) is never in the set.

    A new bundled path under a seed-owned folder becomes `KeepLocal`-like `SkipSeed`, not `Install`.
  - **One helper for both callers.** Put the input computation in one helper in `src/core/` or `src/services/` (the two sets, from the manifest and the disk), shared by `upgrade.ts` and `doctor.ts`.
  - **`upgrade.ts`:**
    - **`Remove`:** delete the file, drop the entry, and report `removed`.
    - **Empty folders:** after the loop, remove each folder a removal left empty, deepest first, up to and including the skill folder.
    - **`OrphanModified`:** keep the file, drop the entry, and report "no longer shipped, locally modified, left on disk".
    - **`OrphanMissing`:** drop the entry and report "missing on disk and no longer shipped".
    - **`SkipSeed`:** report "kept: project-owned skill".
    - **`--dry-run`:** report `would remove` and delete nothing.
    - **Scoped `--skill` runs** keep planning only in-scope paths (`upgrade.ts:171-178`).
    - Add the new tags to `STATUS`.
  - **`doctor.ts`:**
    - same inputs;
    - `Remove` → `orphan` ("no longer shipped; `brain upgrade` removes it"), `OrphanModified` → `orphan` ("locally modified; delete it by hand if nothing references it"), `OrphanMissing` → `orphan`, `SkipSeed` → nothing;
    - none of them counts as a problem;
    - skip seed-owned folders in the `untracked` walk (`doctor.ts:143-155`).
  - **EVAL:** a row "orphan rule".
- **validation:**
  - **Unit tests** in `plan.test.ts`, one per outcome:
    - untouched orphan → `Remove`;
    - edited orphan → `OrphanModified`;
    - orphan with an advisor block holding content → `OrphanModified`;
    - missing orphan → `OrphanMissing`;
    - a new path under a seed-owned folder → `SkipSeed`;
    - a new path under a managed folder → `Install`.
  - **Integration tests:**
    - `upgrade` on a fixture whose manifest lists an untouched managed file the package no longer ships removes it and its empty folder;
    - `--dry-run` leaves both;
    - `--force` keeps an edited orphan;
    - a scoped `--skill other` run leaves another skill's orphan alone;
    - `doctor` exits 0 before and after the upgrade, with a seed-owned skill folder that lacks a newly shipped file.
- **status:** Done
- **tdd_target:** `plan.test.ts`: "an untouched managed file the package no longer ships is planned for removal".
- **review_mode:** cli

### T2 — The `agent-browser` stub, and `init` keeps an untouched bundled copy managed
- **depends_on:** T1
- **location:** `assets/skills/agent-browser/` (`SKILL.md`, new `LICENSE`; remove `references/`, `templates/`), `src/commands/init.ts`, `test/integration.test.ts`, `test/EVAL.md`
- **description:**
  - **Fetch** upstream `skills/agent-browser/SKILL.md` and the upstream `LICENSE` at commit `021d9255`, read-only with `gh api`. If the file changed later, use the latest commit and record it. Upstream has no NOTICE file (Apache-2.0 §4(d) adds nothing).
  - **`SKILL.md`** is the upstream text with exactly two changes:
    - drop `hidden: true`;
    - drop `Bash(npx agent-browser:*)` from `allowed-tools`.

    Under the frontmatter, add an HTML comment that names the upstream repo, path, commit, date, the license, and both changes (Apache-2.0 §4(b)).
  - **`LICENSE`:** the upstream Apache-2.0 text, verbatim.
  - **Delete** `references/` and `templates/`.
  - **`init.ts` (A3).** The skill loop (`init.ts:110-189`) visits only bundled paths, and the manifest is rebuilt from scratch (`:246-255`). So:
    - decode the previous manifest **before** the skill loop (today it is read only for `createdAt`, at `:239-245`), and map its paths from the old `skillsDir` to the new one with `rewriteSkillsDir`, so a legacy `.claude/skills` manifest still matches;
    - **bundled paths:** when the previous manifest tracks the file as `managed` and the disk still matches that entry's hash, keep the entry `managed` with the old hash, even when the disk differs from the bundled version, and report it with an `adopted`-style line ("tracked copy kept; run `brain upgrade`");
    - **paths the bundle no longer ships,** inside a bundled skill folder: carry over each previous `managed` entry whose disk hash still matches, so `upgrade` can remove it;
    - the project-owned rule applies only to copies the previous manifest does not track as managed.
  - **EVAL:** a row "agent-browser stub and upgrade".
- **validation:**
  - `init --providers claude` on an empty project installs exactly `agent-browser/SKILL.md` and `agent-browser/LICENSE`.
  - **Integration test "0.6 install → upgrade":**
    - write the old files with a manifest listing them `managed` with matching hashes, then run `upgrade`: the stub and license are installed, and the old files and folders are removed;
    - with one old reference edited, that file stays and is reported;
    - with the folder's entries `seed`, nothing changes, no `LICENSE` is added, and `doctor` exits 0;
    - re-running `init` on the 0.6 fixture keeps `SKILL.md` and the old `references/` and `templates/` entries `managed`; a following `upgrade` installs the stub and `LICENSE`, removes the old references and templates with their folders, and `doctor` then exits 0;
    - the same with the 0.6 manifest written under the legacy `.claude/skills` path.
  - **Frontmatter:** `name: agent-browser`; no `hidden`; no `npx` in `allowed-tools`.
- **status:** Done
- **tdd_target:** integration: "upgrade from a 0.6 install replaces the long agent-browser copy with the stub and removes its references".
- **review_mode:** cli

### T3 — `ui-review`: fixture, runner and geometry probes
- **depends_on:** —
- **location:** `assets/skills/ui-review/fixture/index.html`, `fixture/expected.json`, `scripts/probe.sh`, `probes/width-sweep.js`, `probes/resize.js`, `probes/edge.js`, `test/ui-review-probes.test.ts`
- **description:**
  - **Fixture.** Grow `research/probe/index.html` into `fixture/index.html`, with generic content and no project names. One section per probe, each with a defect case and a clean twin:
    - a chip row that wraps to a third line only in a narrow band of container widths;
    - an overlay that keeps its opening width after a resize;
    - a popover that opens against the viewport bottom;
    - a focus ring clipped by `overflow: hidden`, as an outline and as a `box-shadow` ring;
    - a checkbox row whose padding is inert while the whole row highlights, with a ring around the box only;
    - a 12 px counter at about 3:1, and its passing twin;
    - a modal that jumps on a content change with nothing animating, and a twin where the change happens during a `transition: height` (a layout property; a transform-only transition reports no shift);
    - an unrelated infinite spinner elsewhere on the page, so the instant jump must still report `animating: false`.
  - **Runner `scripts/probe.sh`.**
    - **Invocation:** `bash probe.sh <probe> '<json-args>' [--session <name>]`.
    - **In-page probes:** it wraps `probes/<probe>.js`, a single function expression that returns a **plain object** (never a `JSON.stringify` string, which `eval` prints as a quoted literal), as `((<file>)(<args>))` inside an IIFE, and pipes it to `agent-browser eval --stdin`.
    - **Arguments:** parsed in shell with `node -e`, never `jq`.
    - **Output:** exactly one JSON document on stdout.
    - **Screenshots:** absolute paths only.
  - **`width-sweep`** (R-SWEEP and the §2.3 recipe):
    - steps of at most 16 px below 480 and at most 60 px above, from `min` to `max`;
    - every breakpoint ±1 (given in `args`, or read from the stylesheets' media queries);
    - a binary search where the row count or box signature changes;
    - the whole sweep again at 1.25× root font size.
    - **Returns:** ranges `{from, to, rows, containerWidth, overflowX}` per target.
  - **`resize`** (R-RESIZE): open at the widest width, resize to the narrowest, and compare the overlay box with a fresh load at that width. **Returns:** both boxes and the delta.
  - **`edge`** (R-EDGE): put the trigger at the top, middle and bottom. Open, then measure the overlay against `innerHeight`. **Returns:** the three placements, with the distance to each viewport edge.
  - **`expected.json`:** each probe's expected result on the fixture, for the defect case and the clean twin.
  - **Test** `test/ui-review-probes.test.ts`:
    - install the skill with `install-skill ui-review --skills-dir <tmp>` and run the **installed** copy through `bash`, so that a missing file or the exec bit shows up;
    - open the fixture as a `file://` URL, run each probe, and compare with `expected.json` (±1 px);
    - `describe.skipIf(!agentBrowserOnPath)`, a per-test timeout of 180 s, and its own session name, closed in `afterAll`.
- **validation:**
  - On `agent-browser` 0.27.1, each of the three probes returns its expected result on the defect case and a clean result on the twin.
  - Without the CLI, the suite skips with a note.
  - `npm test` stays green either way.
- **status:** Done
- **tdd_target:** `ui-review-probes.test.ts`: "width-sweep reports the third row only in the fixture's narrow width band".
- **review_mode:** mixed

### T4 — `ui-review`: focus ring, hit area, contrast, layout jumps, axe
- **depends_on:** T3
- **location:** `assets/skills/ui-review/probes/focus-ring.js`, `hit-area.js`, `contrast.js`, `layout-jump.js`, `scripts/axe.sh`, `scripts/probe.sh`, `fixture/expected.json`, `test/ui-review-probes.test.ts`
- **description:**
  - **`focus-ring`** (corrects R-RING):
    - reach each focusable control with real `press Tab` (trap: `focus` paints no `:focus-visible`);
    - **the ring geometry:**
      - count the outline only when `outlineStyle` is not `none` (Chromium reports a width even with `outline: none`);
      - otherwise, parse the focus `box-shadow` spread;
      - otherwise, there is no ring;
    - test the ring rect against every clipping ancestor (`overflow` ≠ `visible`) and every fixed overlay;
    - check whether the ring encloses the hit area;
    - **crop diff:** take an element screenshot of the control's clipping ancestor (`screenshot "<sel>" /abs/focused.png`) while focused; reach the unfocused state with `eval "document.activeElement.blur()"` (focus moves to `BODY`, so no neighbour paints a ring in the crop); take the second element screenshot; compare the two with a small dependency-free PNG compare in `node` (`zlib` inflate, same size required). Scoped `diff screenshot -s` returns "Element not found" on 0.27.1, so it is not used.
    - **Returns,** per control:
      - `ringKind`: `outline`, `box-shadow` or `none`;
      - the ring rect;
      - `clippedFraction` and the clipping ancestor;
      - `enclosesTarget`;
      - `cropDiffPct`.
  - **`hit-area`** (corrects R-HIT):
    - **Coverage:** an in-page `elementFromPoint` grid over the hover box, with a 4 px step and no clicks. A point counts as responding when the element hit is the control, its `<label>`, or a descendant of either.
    - **Confirmation:** real `mouse move/down/up` at no more than 8 sampled points: inside and outside the responding region, and the box centre. Read the state after each click; when the state toggled, click again to restore it.
    - **Size:** compare the responding box with the target-size standard passed in `args` (default 24).
    - **Returns:** `coverage` (the share of the hover box that responds), the responding box size against the standard, and the sampled clicks with their results.
  - **`contrast`:**
    - compute the composited background by walking the ancestors and blending alpha (trap: `get styles` gives the element's own background);
    - run per state, and per theme passed in `args`.
    - **Returns:** the ratio, the colours, font size and weight, the required ratio, and `needsReview` for gradients and images.
  - **`layout-jump`** (R-JUMP):
    - **Action:** `args.action` is either `{cli: "<agent-browser subcommand>"}` or `{js: "<expression>"}`.
    - **Install:** a `layout-shift` observer whose callback, at each entry, counts the running animations whose `effect.target` contains, or is contained by, one of the entry's shift sources (an unrelated infinite spinner does not count), plus the boxes of the watched elements.
    - **Then:** run the action, wait `args.settleMs` (default 600), and read the shifts and the boxes.
    - **Returns:** the shifts, each with `animating: true|false`, and the box deltas. A shift recorded while an animation runs is motion, not UI (the boundary rule).
    - **Limit (goes into SKILL.md, T5):** the layout-shift API reports nothing for `transform` or `opacity` animations. A shift during an animation proves motion; a transform-only animation shows no shift at all, so "no shift" does not prove "no motion".
  - **`scripts/axe.sh`** (D6), in order:
    1. `agent-browser a11y` when `agent-browser --version` is 0.33.0 or later;
    2. else `<project>/node_modules/axe-core/axe.min.js` (or `$AXE_CORE_DIR/axe.min.js` when set) through `eval --stdin`, then `axe.run` on the scope;
    3. else `{ "source": "none" }`.

    It never fetches from the network. It prints the source, the violations and the "needs review" items.
  - **Add** the expected results to `expected.json` and the cases to the test.
  - **EVAL:** a row "ui-review probes", auto when the CLI is present, plus a [man] row for `axe.sh` with a local `axe-core`.
- **validation:** On 0.27.1, each probe returns its expected result on the fixture's defect case and a clean result on its twin:
  - **Focus ring:**
    - the clipped outline ring and the clipped `box-shadow` ring are each reported with their ancestor;
    - the checkbox row gives `enclosesTarget: false`;
    - an `outline: none` control with no shadow gives `ringKind: none`.
  - **Hit area:** the inert padding gives `coverage` ≈ 0.20, and the sampled clicks confirm it with the state restored.
  - **Contrast:** the counter gives ≈ 3.2:1.
  - **Layout jump:** the instant jump gives a shift with `animating: false` while the unrelated spinner runs, and the `transition: height` twin gives `animating: true`.
  - **Crop diff:** the focused and blurred element screenshots of the clipped-ring case differ by a non-zero `cropDiffPct`; an `outline: none` control with no shadow gives ≈ 0.
  - **axe:** `axe.sh` returns `source: none` in a folder without `axe-core`. With `AXE_CORE_DIR` set, it returns `source: node_modules` and the counter's `color-contrast` violation; that case is skipped when `AXE_CORE_DIR` is unset.
- **status:** Done (2026-10-09)
- **tdd_target:** `ui-review-probes.test.ts`: "focus-ring reports the fixture's box-shadow ring as clipped by its overflow-hidden ancestor".
- **review_mode:** mixed

### T5 — `ui-review` SKILL.md: the bar
- **depends_on:** T3, T4
- **location:** `assets/skills/ui-review/SKILL.md`, `assets/skills/ui-review/references/` (one file per class if `SKILL.md` would exceed about 250 lines), `test/integration.test.ts`
- **description:** Write the skill (SPEC §5):
  - **Frontmatter:** `name: ui-review`; a description that triggers on reviewing the static UI of a rendered page, and that names `ui-reviewer` and the verifier's UI pass as its users.
  - **The guide-load line,** the SPEC §Ownership table verbatim, and the motion boundary.
  - **The bar, one section per class:** placement and geometry; responsive widths and wrapping; contrast; focus visibility; target size and hit area; accessible-name markup; browser and device rendering. Each section has:
    - the rule and its source: the WCAG 2.2 criterion, or a named heuristic (for example, "the ring encloses the hit area", "the hit area equals the hover area");
    - what the project may override in `brain/chore/ui-review.md` → Project bar;
    - the probe or tree read that proves it, and the evidence a finding must carry.
  - **How to run the probes:**
    - `bash <skillsDir>/ui-review/scripts/probe.sh`, with its arguments, output and sessions;
    - the fixture self-check: run a probe on `fixture/index.html` when a result looks wrong.
  - **The traps,** each with its workaround (RESEARCH B3), plus the two the gate measured: an `outline: none` control still reports an outline width, and `eval` prints a returned string as a quoted literal.
  - **axe notes:** the D6 source order and its role; re-inject after navigation, reload or `vitals`.
  - **Device notes:**
    - the installed-check (`appium` on `PATH` and `xcuitest` in `appium driver list --installed`);
    - never `-p ios` without it;
    - the "not verified on device" format;
    - what the Simulator adds.
  - **The evidence gate and the falsification pass,** as a checklist (SPEC §2.6–2.7).
  - **The UI pass in `adversarial-review`:** how the verifier uses the same bar in case A and case B (SPEC §4.3).

  Write all text fresh; RESEARCH paraphrases its sources and nothing is copied from them.
- **validation:**
  - Every class has a rule source, an override and its evidence.
  - Every file in `probes/` and `scripts/` is documented with its arguments and invoked through `bash`.
  - Every trap has a workaround.
  - No reference-project names.
- **status:** Done (2026-10-09)
- **tdd_target:** integration: "the installed `ui-review/SKILL.md` has `name: ui-review` and documents every file in `probes/`". It fails until the skill exists and covers every probe.
- **review_mode:** cli

### T6 — The `ui-reviewer` agent
- **depends_on:** T5
- **location:** `assets/agents/ui-reviewer.md`, `test/integration.test.ts`, `test/EVAL.md`
- **description:** Write the agent (SPEC §1–§3, AC1–AC3):
  - **Frontmatter:**
    - `name`;
    - a description with two examples: a prototype winner, and an explicit live route;
    - `tools: Read, Grep, Glob, Bash`;
    - `skills:` listing `ui-review`;
    - no `Write`, no `Edit`, no `memory:`.
  - **Role and moments:** the SPEC §1 table, the third moment pointing to `adversarial-review`, and the three verdicts.
  - **Ownership:** the SPEC §Ownership table verbatim, the motion boundary and the target-size line.
  - **The method:** SPEC §2, steps 1–8, with the guide-load line first, and axe on each forced state when a source exists.
    - Bash runs only `agent-browser`, `bash <skillsDir>/ui-review/scripts/…` and read-only commands.
    - Screenshots go to an absolute temporary path.
    - Nothing is downloaded or installed.
  - **The output contract** of SPEC §3, verbatim, with the Engines line naming the axe source: at most 120 lines, no scores, no praise.
  - **Calibration examples,** generic:
    - kept: a clipped ring, an inert padding;
    - rejected: a UX finding (focus after an action), a motion finding (a header that grows during a transition), and a taste finding (colour preference).
  - **Project page:** read `brain/chore/ui-review.md` before every review; use the §2 defaults without it.
  - **EVAL:** a row "ui-reviewer agent".
- **validation:**
  - `install-skill ui-review` installs `ui-reviewer.md` with it.
  - `upgrade --skill ui-review` on an older install adds both.
  - `doctor` reports both as tracked.
  - `init --providers claude` now installs 5 agents (move the count assertion here from T12).
  - The agent contains the ownership table, every §2 step and the §3 sections in order.
- **status:** Done (2026-10-09)
- **tdd_target:** integration: "`init --providers claude` installs 5 agents, `ui-reviewer` among them, linked to `ui-review`".
- **review_mode:** cli

### T7 — One owner per concern (agents, `design-engineering`, `create-plan`, `implement-spec`)
- **depends_on:** T6
- **location:**
  - `assets/agents/ux-advisor.md`, `assets/agents/design-engineer.md`;
  - `assets/skills/design-engineering/SKILL.md`, and its `references/{review,audit,accessibility,gestures}.md`;
  - `assets/skills/create-plan/SKILL.md`;
  - `assets/skills/implement-spec/SKILL.md` and `references/lifecycle.md`;
  - `test/EVAL.md`.
- **description:** (SPEC §Ownership, AC9)
  - **`ux-advisor`:**
    - in its description (line 3), its owner table ("content that jumps" goes to `ui-reviewer` unless it animates) and its rejected UI example, name `ui-reviewer` instead of `design-engineer` for static UI;
    - remove "axe in the review pipeline";
    - add the guide-load line before its first `agent-browser` command.
  - **`design-engineer`:**
    - its description and precedence say "motion and interaction craft";
    - static UI review goes to `ui-reviewer`;
    - drop the tap-target size at line 77, and point to the `ui-review` bar.
  - **`design-engineering`:** drop the 44 px rule at `SKILL.md:56`, `review.md:20` and `:76`, `audit.md:38`, `accessibility.md:73` and `gestures.md:61`. Keep their other pointer rules (fine-pointer hover gating, the invisible hitbox technique). Run the overlap check (Before you start 5).
  - **`create-plan` step 10 and `implement-spec`'s advisor trigger** route "motion and interaction craft" to `design-engineer`. The spec's UI criteria become plan tasks, and static UI is verified by the UI pass (T10).
  - **`implement-spec`:** add the guide-load line where `browser` or `mixed` validation drives `$agent-browser`.
  - **EVAL:** a row "one owner per concern" (grep-based), written first.
- **validation:**
  - **Grep checks on this task's files only** (T12 runs the full grep):
    - no static-UI or target-size ownership by `design-engineer`;
    - no `44px`, `44×44` or `44 px` in `design-engineering` or `design-engineer.md`;
    - "axe in the review pipeline" is gone.
  - The overlap check result is in the Log.
- **status:** Done (2026-10-09)
- **tdd_target:** the EVAL "one owner per concern" grep, run on this task's files: it fails on the current assets.
- **review_mode:** cli

### T8 — `prototype` Phase 6: two reviewers, one loop
- **depends_on:** T7
- **location:** `assets/skills/prototype/SKILL.md`: Contract `:16-17`, harness `:79`, Phase 6 `:99-117`, `:136`, `:145`; `test/EVAL.md`
- **description:** (SPEC §4.1, AC6, D9)
  - **Contract lines** `:16-17`, the brain-flow line `:136` and the `keep` command `:145` name both reviewers.
  - **Spawn:** `ux-advisor` and `ui-reviewer` in parallel, on the winner only, each on its own `agent-browser` session. Brief `ui-reviewer` with the winner's route, the Phase 1 scope, the winner's values, what the prototype fakes, and the project's UI bar (`brain/chore/ui-review.md`).
  - **When an agent can't run:**
    - `ui-reviewer` missing → skip it and say so;
    - no subagents → run its charter inline.
  - **Verdict:** one combined verdict, the stricter of the two.
  - **Shared iterate loop:**
    - at most 3 changes per round, chosen by the user from both reviews, and at most 2 rounds;
    - the agent whose items changed re-reviews;
    - **both** run their regression pass, and the UI regression pass re-runs the probes on the changed elements and on the classes checked clean.
  - **On stop:** `UI-REVIEW.md` is saved verbatim next to `UX-REVIEW.md` and deleted with the surface.
  - **Harness check** (`:79`): add the guide-load line.
  - **EVAL:** a [man] row on the sample project (below).
- **[man] sample project:**
  - **Setup:** a scratch folder `<scratch>/ui-sample/`, initialized with `brain init --providers claude`, holding one Vite page that renders the `ui-review` fixture's checkbox row and clipped dialog as a prototype with one variant.
  - **Reuse:** T9 and T10 use it too.
- **validation:**
  - Phase 6 states each rule above.
  - `ux-advisor` is no longer the only reviewer named anywhere in the file.
  - The [man] row runs on the sample project.
- **status:** Done (2026-10-09; [man] rows run, see Log)
- **tdd_target:** EVAL row [man]: "after `keep`, both reviews arrive with one combined verdict, and an iterate round re-runs both regression passes".
- **review_mode:** browser

### T9 — `create-spec`, the project page, and the Brain Schema
- **depends_on:** T8
- **location:**
  - `assets/skills/create-spec/SKILL.md`, `references/flow-map.md`, `assets/SPEC-TEMPLATE.md` (if it lists review sources);
  - `assets/brain/AGENTS.md` and `assets/brain/CLAUDE.md`;
  - `test/EVAL.md`.
- **description:** (SPEC §4.2, §6, AC7, AC9, AC11)
  - **`flow-map.md`** gains the UI review: its source (context, or `UI-REVIEW.md` after an interrupted run) and the §4.2 mapping table.
  - **The merge rule:** a UX and a UI finding on the same element become one criterion. The UI wording carries the cause and the fix, the UX wording the consequence.
  - **A rejected UI finding** is offered for `brain/chore/ui-review.md` → Suppressed findings. The page is created on first use with four sections (Project bar · Component traps · Kept examples · Suppressed findings), the base frontmatter, `domain: _root`, `type: concept`. The Project bar is left for the user.
  - **`create-spec` never spawns `ui-reviewer`.**
  - **The Brain Schema** (both twins, which stay identical):
    - `:19`: `prototype` has `ux-advisor` and `ui-reviewer` review the winner;
    - `:26`: the `ux-advisor` bullet says static UI goes to `ui-reviewer` and motion to `design-engineer`;
    - add a `ui-reviewer` bullet to the advisor list `:24-29`;
    - list `ui-review.md` next to `ux-review.md` (`:130`).
  - **EVAL:** a [man] row on the sample project.
- **validation:**
  - The Brain Schema twins are byte-identical.
  - The flow-map table covers every §3 section.
  - The [man] row: a sample review's decisions become criteria, its device notes become constraints, and a rejected finding lands in `ui-review.md`.
- **status:** Done (2026-10-09; [man] row run, see Log)
- **tdd_target:** EVAL row [man]: "a UI finding and a UX finding on the same element become one criterion".
- **review_mode:** cli

### T10 — `adversarial-review`: the UI pass
- **depends_on:** T9
- **location:**
  - `assets/agents/review-classifier.md`, `assets/agents/adversarial-verifier.md`;
  - `assets/skills/adversarial-review/SKILL.md`, `references/verification-phase.md`, `references/classification-phase.md`, `assets/REPORT-TEMPLATE.md`;
  - `assets/brain/AGENTS.md` and `assets/brain/CLAUDE.md` (review-mode matrix);
  - `test/EVAL.md`.
- **description:** (SPEC §4.3, AC8)
  - **`review-classifier`:**
    - charter a **UI pass** when the change set contains rendered-UI code: markup, stylesheets or style props or utility classes, colour/spacing/type/radius tokens, ARIA, role or label attributes, inline SVG icons;
    - list the signals the way line 85 lists motion;
    - the motion-craft pass keeps motion and drops target size.
  - **Orchestrator** (`adversarial-review` `SKILL.md`), before the verification phase when a UI pass is chartered:
    1. start or locate the dev server from the root `AGENTS.md` dev command;
    2. map each changed surface to a route (the spec's prototype route, the `PLAN.md` task, the router);
    3. pass the URLs in the verifier's brief;
    4. stop the server afterwards, only if it started it.
  - **`verification-phase.md`:** a "UI pass only" paragraph, next to the motion-craft one.
    - **Rubric:** the `ui-review` skill. Case A runs the bar on the changed surface; case B runs the spec's UI criteria **and** the bar.
    - **Read-only contract:** driving `agent-browser` against the served route is within it, DOM injection and `network route` mocks included. No file, server or data changes.
    - Add the guide-load line.
  - **`adversarial-verifier.md:72`:** add the same in-contract sentence for the UI pass, and the guide-load line.
  - **Fallbacks** (in `REPORT-TEMPLATE.md` and the phase docs):
    - without a route → `DEGRADED`, with the reason in `REPORT.md`;
    - without the skill → no pass, and one line in `REPORT.md`.
  - **The Brain Schema matrix** gains the row "UI verifier pass | whenever a review runs | same | same", in both twins.
  - **EVAL:** a [man] row on the sample project.
- **validation:**
  - The twins are byte-identical.
  - The classifier's signals cover the §4.3 list.
  - **The [man] row:**
    - a stylesheet-only diff charters the UI pass and no motion-craft pass;
    - the orchestrator serves the route;
    - the verifier returns findings with the probe evidence;
    - a motion-only diff charters only the motion-craft pass.
- **status:** Done (2026-10-09; [man] rows run, see Log)
- **tdd_target:** EVAL row [man]: "a stylesheet-only diff charters a UI pass and not a motion-craft pass".
- **review_mode:** mixed

### T11 — init-brain
- **depends_on:** T1, T2, T6, T9, T10
- **location:** `skills/init-brain/SKILL.md`, `references/advisor-detection.md`, `references/verify.md`, `references/upgrade.md`, `references/migration.md`, `test/EVAL.md`
- **description:** (SPEC §6–§7, AC10–AC12)
  - **The shipped lists** include `ui-review` and `ui-reviewer`: 12 skills and 5 agents.
  - **`advisor-detection.md`:**
    - add `ui-reviewer` to the exclusion list (`:17`, "beyond these four" becomes five);
    - a project's own UI-review or visual-QA agents are legacy twins of `ui-reviewer`, and their knowledge goes to `brain/chore/ui-review.md` (component traps, kept and suppressed findings; the Project bar only as an offer to the user);
    - split the ux/design line (`:42`): UX → `ux-review.md`, static UI → `ui-review.md`, motion → `brain/chore/motion.md`.
  - **`verify.md`:**
    - add `ui-review` to the generic-tokens skill list (`:25`);
    - report `agent-browser` as needed for the reviews, with its installed version;
    - report Appium with the XCUITest driver as optional, adding Mobile Safari for the device classes;
    - never install either.
  - **`upgrade.md`:**
    - the orphan rule: what `removed` and "left on disk" mean, and `--dry-run` first;
    - the `agent-browser` stub and `skills get core`;
    - a project-owned copy stays;
    - re-running `init` keeps an untouched bundled copy managed.
  - **`migration.md:89`:** UI component traps go to `ui-review.md`, UX ones to `ux-review.md`.
  - **EVAL:** a row "init-brain verify".
- **validation:**
  - The lists and counts match `assets/`.
  - EVAL "no foreign tokens" passes (legacy names only in the alias table).
  - `doctor` on a fresh `init` is clean.
- **status:** Done (2026-10-09)
- **tdd_target:** EVAL row "init-brain verify reports agent-browser with its version and Appium as optional".
- **review_mode:** cli

### T12 — README, EVAL, the full grep
- **depends_on:** T1–T11
- **location:** `README.md`, `test/EVAL.md`, `test/integration.test.ts`
- **description:** (AC9, AC12, AC14, AC15)
  - **README:**
    - add a `ui-review` bullet next to `design-engineering`. It is a reference skill, so the "Nine process skills" line stays;
    - "Four advisor subagents" (`:116`) becomes five, with `ui-reviewer` described;
    - the `agent-browser` tool-skill line describes the stub, with the guide served by the CLI;
    - fix the ownership sentences at `:100` and in the release notes at `:122`;
    - the "Leftovers" bullet (`:157-158`) describes the orphan rule;
    - the tree (`:175`) says 5 agents and 12 skills;
    - the 0.7.0 release notes describe the agent, the split, the UI pass, the stub and the orphan rule.
  - **EVAL:**
    - `11 skills` → `12 skills`, `4 agents` → `5 agents`;
    - check that the rows added by T1–T11 are all present: orphan rule, stub, probes, agent, one owner per concern, prototype loop, `create-spec` mapping, UI pass, init-brain verify, and the benchmark row.
  - **Integration:** `init` installs `ui-review/` with its probes, scripts and fixture.
  - **The full grep** across `assets/`, `skills/` and `README.md`:
    - no static-UI or target-size ownership by `design-engineer`;
    - no pointer to the removed `agent-browser` references;
    - no reference-project names in `assets/`.
- **validation:**
  - `npm run build` and `npm test` are green.
  - Every EVAL row names its check.
  - The counts agree across README, EVAL and init-brain.
  - The full grep is clean.
- **status:** Done (2026-10-09)
- **tdd_target:** integration: "`init --providers claude` installs `ui-review` with `scripts/probe.sh` and `fixture/index.html`".
- **review_mode:** cli

### T13 — Reference-project upgrade dry run
- **depends_on:** T12, and T14 step 8 (scoring done; isolation, Before you start 6)
- **location:** a throwaway detached worktree of the reference project at the head of its brain-manager branch, never its working tree:

  ```bash
  git -C <reference-project> worktree add --detach <scratch>/ref-upgrade <branch-head>
  ```
- **description:**
  1. In the worktree, run `node <repo>/dist/bin.js upgrade --dry-run --json`, then `upgrade --json`, then `doctor --json`.
  2. Check the results:
     - the long `agent-browser` copy becomes the stub, unless it is project-owned;
     - the old references are `removed`, or reported as modified;
     - `ui-review` and `ui-reviewer` are installed;
     - the advisor blocks survive.
  3. Remove the worktree.
- **validation:**
  - `doctor` exits 0.
  - The `removed` lines match the old bundled files.
  - The Log has the run's summary.
- **status:** Done (2026-10-10; see Log)
- **tdd_target:** n/a (acceptance run)
- **review_mode:** cli

### T14 — Benchmark (accepts the agent; RESEARCH D)
- **depends_on:** T12 (agent and skill frozen)
- **location:**
  - the throwaway worktree of the reference project at `e2442d09` (`<scratch>/ui-bench-company-onboarding`), served on port 3104 with a stand-in API that answers 401 on 3199;
  - all run outputs outside the tree;
  - `test/EVAL.md` (benchmark row).
- **description:** Steps marked **[maintainer]** are the user's.
  1. **[maintainer] Notes.** *Done 2026-10-08, before any code.*
     - The maintainer wrote them on UI and motion, desktop and mobile, and sent them in chat (a breach of the planned isolation; see Before you start 6).
     - They are sealed in `specs/ui-reviewer/benchmark/maintainer-notes.md` with the screenshot `maintainer-notes-1.png`. Their hashes are in the Log.
     - Scope is decided by the maintainer at step 7, not here: notes that turn out to be UX count as out of scope and do not enter the independent set.
  2. **Freeze.**
     - Commit `assets/agents/ui-reviewer.md` and `assets/skills/ui-review/`, and record the commit in the Log. A content hash of the uncommitted files is allowed only if the maintainer accepts it.
     - Nothing in them changes until step 8 completes.
     - The freeze commit never stages `specs/ui-reviewer/benchmark/`.

     **2b. Contamination audit.** A clean-context auditor gets the notes, the frozen agent, the skill and the fixture, plus the pre-notes plan hash. It lists every rule, example, fixture case or probe argument that targets a specific note and has no source in the pre-notes SPEC, RESEARCH or plan. It returns only the list. If the list is non-empty, the maintainer decides: remove those items and re-freeze, or switch to a fresh case.
  3. **Prepare the run worktree** as T17 did:
     - drop `.claude/agent-memory/` and any legacy UX or UI agent;
     - add `brain/brain.config.json`;
     - nothing dated after `e2442d09` enters.
  4. **`ui-reviewer` run, first.**
     - A clean-context general-purpose agent, given `ui-reviewer.md` verbatim as its charter and the `ui-review` skill path.
     - It gets the Phase 6 brief: route, scope, values, what the prototype fakes, and no Project bar.
     - It has its own `agent-browser` session, and git is forbidden.
     - It writes the review, the probe JSON and the screenshots to `<scratch>/ui-bench/run-ui-reviewer/`, and returns only the path.
  5. **Control run.**
     - Same model and effort, same brief and same `agent-browser` version, run by a clean-context general-purpose agent.
     - Its prompt: "review the static UI", with the SPEC §Ownership table verbatim, but without the charter and without the skill. It may load `skills get core`.
     - It writes to `<scratch>/ui-bench/run-control/` and returns only the path.
  6. **Pooling.** A clean-context pooler gets the three paths and the notes' hash. It:
     - checks the hash;
     - merges duplicates by the rubric's hit definition;
     - rewrites every candidate in one uniform format and shuffles the order;
     - writes `pool.md`, for the maintainer, and a sealed `source-map.json`, outside the tree;
     - returns only the paths.
  7. **[maintainer] Judgment.**
     - The orchestrator gives the maintainer `pool.md` without reading it.
     - The maintainer marks each candidate as real, not a defect, out of scope (UX or motion) or can't tell, and may add defects.
     - The judgments go to `judgments.md` next to it.

     **7b. Size gate.** A clean-context counter reads the judgments and the source map, and returns only the size of the independent set (real non-motion UI defects found by the notes, the control or the judge). If it is below 4, the maintainer decides before scoring whether the case stands or a second prototype is added the same way.
  8. **Scoring.** A clean-context scorer gets `judgments.md`, `pool.md`, `source-map.json`, both reviews and both runs' probe outputs and screenshots. It:
     - applies `specs/project-config-and-flow-modes/benchmark/scoring-rubric.md` for hits;
     - uses RESEARCH D's definitions of a finding, "found", the independent set, recall and validity, which override the rubric's own counts;
     - computes every RESEARCH D bar item for `ui-reviewer`, and recall and validity for the control;
     - checks every measured value against the kept probe JSON and screenshots.
  9. **Record.**
     - The results table goes in the Log.
     - The notes, pool, judgments, source map and both reviews are committed to `specs/ui-reviewer/benchmark/`.
     - The EVAL benchmark row points to the results.
  10. **On failure:** RESEARCH D's path. Iterate on the fixture and the development material only. The case is not re-scored. A new version needs a fresh case or the maintainer's explicit acceptance.
  11. **Clean up:** stop the servers and remove the worktree.
- **validation:** every RESEARCH D bar item is met, or the maintainer's explicit acceptance is recorded.
- **status:** Done (2026-10-10): bar failed at step 8; the maintainer accepted a lean charter without re-scoring (SPEC D10). Record uncommitted (step 9); clean-up done (step 11).
- **tdd_target:** n/a (acceptance run)
- **review_mode:** browser

## Testing strategy

- **Pure logic:** unit tests in `src/core/plan.test.ts` for every new upgrade outcome (T1).
- **CLI behavior:** integration tests in `test/integration.test.ts`:
  - the orphan rule, the seed-skill rule and `doctor` (T1);
  - the 0.6 → 0.7 `agent-browser` upgrade and the `init` rule (T2);
  - the installed `ui-review` skill (T5, T12);
  - the companion agent and the 5-agent count (T6).
- **Probes:** `test/ui-review-probes.test.ts` runs every probe from the **installed** skill against the fixture, and skips without the CLI (T3, T4). The fixture's `expected.json` is the same contract the agent uses to check itself.
- **Assets and docs:**
  - grep-based EVAL rows: one owner per concern, no foreign tokens, twins identical, counts;
  - [man] EVAL rows on the `<scratch>/ui-sample/` project for the prototype loop, the `create-spec` mapping and the UI pass (T8–T10).
- **Acceptance:** T14, the benchmark, then T13, the reference upgrade.

## Validation gates (before opening the PR)

1. `npm run build` and `npm test` are green on the merged tree, and the probe suite ran (not skipped) on this machine.
2. Every EVAL row added by T1–T12 has been run, [man] rows included, and its result is noted in the Log.
3. The T12 full grep is clean, and the Brain Schema twins are identical.
4. T13 `doctor` exits 0.
5. T14 meets the RESEARCH D bar, or the maintainer's acceptance is recorded.

## Risks and how this plan handles them

| Risk | Handling |
|---|---|
| Probe results depend on the `agent-browser` version | The tests pin the fixture's expected results on 0.27.1. A later CLI that changes a result fails the suite visibly instead of drifting silently |
| The probe suite is skipped in CI, so regressions hide | Gate 1 requires a non-skipped run before the PR; an EVAL row covers it |
| Installed scripts are not executable | Every invocation goes through `bash`; the probe test runs the installed copy (T3) |
| Parallel tasks collide on `dist/` | One worktree per parallel task, and one merged rebuild (Before you start 4) |
| Two workers edit the same asset files | Wave 4 is sequential (T7 → T10) |
| The orphan rule deletes a project's file | `managed` and unchanged only; advisor blocks with content count as modified; `--force` never deletes; `--dry-run` lists first; T13 runs it on a real project before release |
| `doctor` fails for good on a project-owned `agent-browser` | `doctor` shares the seed-skill rule and does not count orphans as problems (T1, T2) |
| Editing `design-engineering` re-introduces course text | Removals and minimal fresh wording only; the overlap check runs on every changed line (T7) |
| The benchmark is contaminated by the writing session | Isolation rules in Before you start 6. Runs return only paths, the pool reaches the maintainer unread, and T13 waits for the scoring (T14) |
| The scratch worktree for T14 disappears with the session | Step 3 recreates it at `e2442d09`; the notes live in `specs/ui-reviewer/benchmark/`, outside the scratch folder |
| The orchestrator has read the notes (breach, 2026-10-08) | Pre-notes hashes, clean-context workers with verbatim task text, frozen T3–T6 text, the step 2b audit, and the fresh-case option (Before you start 6) |

## Unresolved questions

None. Assumptions A1–A7 above stand unless the maintainer says otherwise.

## Log

- 2026-10-08 — Plan written after the spec was approved.
  - The plan gate (`adversarial-verifier` charter, clean context) returned DO NOT SHIP on the first draft, with 1 BLOCKER, 9 MAJOR, 10 MINOR and 5 NIT. All are folded into this version:
    - `doctor` shares the planner;
    - the exec bit;
    - the hit-area and focus-ring probe design;
    - the T14 freeze, size gate and scorer inputs;
    - `dist/bin.js`;
    - worktrees for the parallel waves;
    - the missing ownership lines.
  - D8: the UX replay is not re-run, since `ux-advisor`'s method does not change, only owner names (T7).
- 2026-10-08 — T14 step 1 started. The prototype is served for the maintainer's notes:
  - worktree `<scratch>/ui-bench-company-onboarding`, detached at `e2442d09`;
  - `pnpm install --frozen-lockfile`;
  - Vite on `http://localhost:3104/prototypes/company-onboarding`, with `VITE_API_URL` pointing to a stand-in API on 3199 that answers 401 to every call.

  The route loads with no redirect. The four LinkedIn fixtures (`/company/rossi-digital`, `-parziale`, `-errore`, `/company/netflix`) and the manual path ("Non è su LinkedIn") give the states. Notes hash: pending.
- 2026-10-08 — Plan gate round 2 (same verifier): DO NOT SHIP, on 1 MAJOR, 2 MINOR and 2 NIT; every round-1 finding resolved except M5 (partly). All folded in:
  - N1: `init` decodes the previous manifest before the skill loop, maps legacy `skillsDir` paths, and carries over untouched `managed` entries the bundle no longer ships, so `upgrade` can remove them (T2);
  - M5/N2: `cropDiffPct` uses `blur()` and two element screenshots compared in `node`, since scoped `diff screenshot` fails on 0.27.1 (T4);
  - N3: the layout-jump twin uses `transition: height`; the transform/opacity limit goes into SKILL.md;
  - N4: `seedSkillDirs` needs at least one entry;
  - N5: only animations related to a shift source count.
- 2026-10-08 — T14 step 1 done. The maintainer sent the notes in chat (7 items: 5 desktop, 2 mobile, plus a screenshot of the review card on the `/company/netflix` fixture). Isolation breach recorded in Before you start 6, with its mitigations and the step 2b audit.
  - `benchmark/maintainer-notes.md`: `275f1e322dcd078774f949358111846162837320b9afa99d01c3e523b59dafd5`;
  - `benchmark/maintainer-notes-1.png`: `e40df0235ebc1111c483b6719f94a69ade2bc201fe71b7a3ee2b2c07232d0dac`.
  - No task text changed in response to the notes. The mobile check they ask for is already in the pre-notes SPEC (§2, width range from 280 px).
- 2026-10-08 — Plan approved by the maintainer ("parti con tutte le ondate"). Each task runs in a detached worktree of `HEAD` overlaid with the uncommitted branch state, minus `specs/ui-reviewer/benchmark/`; reviewer-content workers (T3–T6, T8, T10) also get no `PLAN.md`, only their task text verbatim. The changes are merged back with a 3-way file merge; nothing is committed.
- 2026-10-08 — Wave 1 done, merged, 170 tests green with the probe suite run (not skipped).
  - T1: `Orphan` → `Remove` / `OrphanModified` / `OrphanMissing`, plus `SkipSeed`; shared helper `planRuleInputs` in `src/core/plan.ts`; empty folders removed deepest first, each reported `removed`. A `SkipSeed` also covers a file already on disk in a seed-owned folder, so `--force` never overwrites it. Docs (README Leftovers, init-brain `upgrade.md`) stay for T11/T12.
  - T3: fixture with eight sections, `probe.sh`, `width-sweep`, `resize`, `edge`. The probe test compiles the CLI into a private root instead of `dist/` (the integration suite rebuilds `dist/` in parallel) and runs probes async. `integration.test.ts` timeout raised to 30 s (a config test timed out under load). New driver trap found: after a reload the scroll position is restored and `click` on an off-screen element reports success without hitting it; the runner calls `scrollintoview` first.
- 2026-10-08 — T2 done, merged, 176 tests green. Upstream `021d9255e543d2f1ab66b87f338d85c3d7a910be` is still the latest commit on the stub; `LICENSE` fetched at the same commit (last changed `b4653837`); no NOTICE. `init` re-run on a 0.6 install writes the missing `LICENSE` itself (its rule of writing missing files), so the following `upgrade` reports it `up-to-date`, not `installed`; end state as planned. Carry-over of untouched `managed` entries applies inside bundled skill folders only; entries of retired skill folders and agents are still dropped by `init`, as before.
- 2026-10-08 — Paused at the maintainer's request, mid-wave 2. Done and merged: T1, T2, T3 (176 tests green). T4 was stopped mid-task; its partial work stays unmerged in the scratch worktree `wt/T4` (base tree `e7e646e8`). To resume: continue the same T4 worker, or start a fresh one on that worktree with the same verbatim brief, then merge, rebuild and test, and go on with wave 3 (T5 → T6) and the rest. The servers for T14 (Vite on 3104, stand-in API on 3199) were left running; if they are gone, T14 step 3 recreates them.
- 2026-10-09 — Resumed at the maintainer's request. The T4 worker was continued in `wt/T4` with its context intact; the servers on 3104 and 3199 were still up.
- 2026-10-09 — T4 done and merged; 183 tests green, the probe suite ran (not skipped). The `AXE_CORE_DIR` case ran against a local `axe-core` 4.10.0 already on disk (no download) and reported the counter's `color-contrast` violation. The `agent-browser a11y` route (0.33.0+) is written but untested on 0.27.1. Deviations, accepted:
  - **Fixture.** `fixture/index.html` was edited although it is not in T4's location: an Archive pair (`outline: none` with no shadow, and an outlined twin) for the `ringKind: none` check, and a fixed 120 px label so the hit-area coverage does not depend on installed fonts.
  - **Crop diff.** It is computed from full viewport screenshots cropped in `node`, because element screenshots are wrong once the page is scrolled (trap below).
  - **Layout-jump relation.** Besides containment, a shift counts as animating when a layout-property animation runs on a sibling (the animated element's parent contains the shift source); timing comes from a per-frame animation log with a 50 ms tolerance. Without it, the `transition: height` twin's later shifts read as instant jumps.
  - **Contrast.** The counter measures 3.07:1 (composite `#f9fbfd`), not ≈ 3.2; over plain white it reads 3.18, so the gap is the compositing at work. The twin measures 4.84.
  - **Focus ring.** When the control draws no ring, the probe looks for a label or ancestor whose ring appears only on focus (the clean checkbox twin needs it); a control within 16 px of the viewport edge is scrolled to the centre first.
- 2026-10-09 — Driver traps measured on the fixture by T3 and T4 (test-discovered, not from the maintainer's notes), recorded in the code comments of `scripts/probe.sh` and the probes:
  - after a reload the scroll position is restored, and `click` on an element outside the viewport reports success without hitting it (the runner calls `scrollintoview` first);
  - `screenshot "<sel>" <path>` captures the wrong region once the page is scrolled;
  - a headless session's `prefers-color-scheme` follows the OS, so `contrast` sets the media feature and restores it;
  - for a height transition, Chromium names the displaced sibling as the shift source, and stops reporting moves under about 3 px late in the transition.
- 2026-10-09 — Wave 3 started: `wt/T5` created with `--reviewer` (no `PLAN.md`, no `benchmark/`). The T5 brief carries, besides the verbatim task text, the two Log entries above verbatim (T4 results and the fixture-measured driver traps), so the skill documents the probes as built and lists every measured trap.
- 2026-10-09 — T5 done and merged; 184 tests green (probe suite ran; `AXE_CORE_DIR` case run with the local 4.10.0). `SKILL.md` is 229 lines; the bar is split into seven class pages under `references/` (each with Rule, Project override, Proof and evidence), as the task allows past about 250 lines. The integration case also checks that relative links resolve in the installed copy. Open for the maintainer: T5 set two defaults the SPEC does not state, both overridable in the Project bar — an edge margin of 8 px, and edge-placement viewports of the minimum width at 667 px tall plus 1280 × 800. The `wt/T5` baseline was re-staged after the harvest (`84d93f80`), so T6's harvest carries only T6's changes.
- 2026-10-09 — T6 done and merged; 189 tests green (probe suite ran; `AXE_CORE_DIR` case run with the local 4.10.0). `assets/agents/ui-reviewer.md` is 194 lines, `tools: Read, Grep, Glob, Bash`, `skills: [ui-review]`; five integration cases cover init, `install-skill`, `upgrade --skill`, plain `upgrade` and the charter's structure. Open for the maintainer, added by T6 beyond the SPEC: a UI severity scale (P0 a person cannot see, read or operate a control; P1 a WCAG 2.2 AA failure or a broken Project bar rule; P2 a named heuristic alone); a fallback when the skill is missing; no `iterate` verdict on a live surface; each of the seven classes appears exactly once in the output. The EVAL init row still says "11 skills" (12 with `ui-review`): left for T12. Observation: on T6's first test run (without a session name, while the orchestrator's own run was going) a focus-ring `screenshot` call hung for over 5 minutes; the re-run passed in about 110 s. `probe.sh`'s `ab()` has no per-call timeout, so a hung driver call hangs the probe.
- 2026-10-09 — Wave 4 started: `wt/R` created with `--reviewer` (base `a76501cf`); T7 running. The T7–T12 briefs gained one orchestration rule after T6's hang: run the suite with `UI_REVIEW_PROBE_SESSION=t<n>-probes` and leave no session open.
- 2026-10-09 — T7 done and merged; 189 tests green. The ownership greps are an EVAL code block (regex pipes break a table cell). Overlap check: the full paid course copy is not on this machine; the check ran against the local public subset of the course skills (`design-eng-skills/skills`, 7 skills, 10 files, MIT): 7 changed or added lines under `design-engineering`, 0 with a 10-word overlap (a positive control on a course line matched). T7's changes there are deletions of the 44 px rule plus pointer sentences written fresh. Deviations, accepted: `lifecycle.md` §6 no longer routes a task to `design-engineer` on `review_mode: browser` alone; `implement-spec` gains a "static UI → no advisor" trigger; `design-engineer.md` drops its remaining "polish" and "layout" claims. Repo-wide, the ownership greps still hit `assets/brain/AGENTS.md:26`, `assets/brain/CLAUDE.md:26`, `README.md:100` and `:122`: left for T9 and T12. `wt/R` re-baselined (`253de29e`); T8 running.
- 2026-10-09 — T8 done and merged; 190 tests green. An [auto] integration case checks every Phase 6 rule in the installed `prototype/SKILL.md`, besides the [man] rows. `test/EVAL.md` gains a "UI review flows (sample project)" section that sets up `<scratch>/ui-sample/` (a vanilla Vite prototype rendering two fixture defects, and a Project bar with a 320 px minimum width) and three [man] rows: two reviewers in one loop, stop after the reviews, `ui-reviewer` missing. They are written, not run; the orchestrator runs them after T10. Deviations, accepted: line 9 (existing-UI review as a `design-engineer` mode) rewritten per AC9; `ux-advisor` gets its session name through the brief; if one reviewer is skipped, the other's verdict stands. `wt/R` re-baselined (`ab0928dc`); T9 running.
- 2026-10-09 — T9 done and merged (it was stopped once by an API network error and resumed with its context). `create-spec` reads either review, folds the UI review into `SPEC.md` (a row per §3 section) and sends a rejected UI finding to `brain/chore/ui-review.md`, created on first use. The Brain Schema twins are byte-identical (`cmp`, and asserted in a test). Two [auto] integration cases and a [man] row ("UI review into the spec") added. Additions beyond the SPEC, open for the maintainer: a merged criterion takes the higher priority of the two; when the reviews disagree on the fix, the user is asked, with the UI fix as default; a rejected merged finding goes half to each page. Test infrastructure: T9's first two full runs exited 1 on a vitest unhandled error (`Timeout calling "onTaskUpdate"`, load average 5–6) caused by the probe suite's synchronous `beforeAll` (tsc and `agent-browser open`). The orchestrator made that hook async (`test/ui-review-probes.test.ts`, not shipped, no reviewer content); 192 tests green after it. Main-tree runs no longer overlap a worker's run. `README.md:100` and `:122` still give static UI to `design-engineer`: T12. `wt/R` re-baselined (`2c043caf`); T10 running.
- 2026-10-09 — T10 done and merged; 195 tests green (probe suite ran; `AXE_CORE_DIR` case run with the local 4.10.0). `review-classifier` charters a UI pass (`UI pass:` prefix, no impact escalation) from the §4.3 signals read on the changed lines, so a stylesheet hunk that only touches transition, animation, keyframes, easing or duration charters the motion-craft pass alone (`Motion-craft pass:` prefix, target size moved out of it). `adversarial-verifier` may drive `agent-browser` on the served route (DOM injection and `network route` mocks included; no file, server or data change; its own `review-ui-<slug>` session; scripts through `bash`; `DEGRADED` without a URL). `adversarial-review` gains "UI pass: serve the route" (the orchestrator starts or finds the server from the root `AGENTS.md` dev command, maps surfaces to routes, stops only a server it started), a validation point in the classification phase, a Coverage line in the report template, and a Brain Schema matrix row (twins identical). Three [auto] integration cases; three [man] rows (UI pass on a stylesheet-only diff, motion-only diff, fallbacks) and a sample-project setup item (dev command in the root `AGENTS.md`, git repo committed). Open for the maintainer, added by T10 beyond the SPEC: the charter prefixes, no impact escalation for the UI pass, the session name. `report-synthesis.md` is unchanged: the "skipped pass is not a failed pass" rule sits in `verification-phase.md` and the template. `wt/R` re-baselined (`edf2ce28`); T11 next.
- 2026-10-09 — T14 step 3 started early (no frozen content involved): in the run worktree at `e2442d09`, `.claude/agent-memory/` and the legacy UX agent `ux-flow-strategist.md` removed, `brain/brain.config.json` added from `scan` (review `total` by default, `review-tree`, `brain/tech-debt`, `brain/review`, personas `null`; the UI review does not read personas). No spec folder for the prototype exists at that commit. Nothing dated after `e2442d09` added.
- 2026-10-09 — T11 done and merged; 199 tests green (probe suite ran; `AXE_CORE_DIR` case run with the local 4.10.0). init-brain names `ui-review` (twelve skills) and five advisors everywhere (`SKILL.md`, `advisor-detection.md`, `verify.md`, `providers.md`); a project's own UI-review or visual-QA agent is a twin of `ui-reviewer`, its knowledge goes to `brain/chore/ui-review.md` without touching the Project bar; `verify.md` gains "Browser and device tools" (`agent-browser --version` 0.27.1 or later and `skills get core`; Appium with XCUITest optional for Mobile Safari; never installed, `-p ios` never run to find out); `upgrade.md` explains the orphan rule, the stub and the seed copy; `migration.md` splits UX and UI component traps. Four [auto] integration cases read the playbook through `brain onboard --json`; EVAL fresh-init row at 12 skills and 5 agents, new "init-brain verify" row. Deviations reported by T11: `providers.md` edited (outside the file list, its agent list lacked `ui-reviewer`); `migration.md:84` names the legacy classifier as `<legacy-name>` with a pointer to the alias table; `upgrade.md` §1 table gains `review-classifier`; `verify.md` renumbered (§4 config, §5 stack profile, §6 report), with doctor `orphan` lines not failing it and a §4 check that the Project bar holds only what the user wrote. Still for T12: `README.md:100`, `:122` (ownership) and `:115` ("Four advisor subagents"). `wt/R` re-baselined (`f21776b9`); T12 next.
- 2026-10-09 — T12 done and merged; 201 tests green (probe suite ran; `AXE_CORE_DIR` case run with the local 4.10.0). README: `ui-review` bullet, five advisors with `ui-reviewer`, the stub line (`skills get core`, Apache-2.0 `LICENSE`, 0.27.1+, Appium optional), ownership at the old `:100`/`:122` fixed, the review section covers both reviewers, "Leftovers" explains the orphan rule, init row and tree at 12 skills and 5 agents, 0.7.0 notes (agent, split, UI pass, stub, orphan rule). EVAL: every row names its check; new [man] "UI review benchmark" row; an [auto] "counts agree" bullet. Two integration cases (the TDD target was green on its first run, since `init` enumerates `assets/`; the counts case went red first). The full grep is clean: no static-UI or target-size ownership by `design-engineer`, no pointer to the removed `agent-browser` references, no reference-project name in `assets/` (`sevedemo` and the case name included). Open for the maintainer: the EVAL hardcoded-paths grep also hits `assets/skills/adversarial-review/references/brain-bookkeeping.md:19-20` ("with the default `brain/review`", next to the `<reviews>` token), from the project-config work and not among the row's listed exceptions. Wave 5 closed; T1–T12 done.
- 2026-10-09 — [man] rows run on `<scratch>/ui-sample/` (`brain upgrade` to the merged assets first; the folder made a git repo with everything committed, `node_modules` ignored; dev server on port 3205 as its root `AGENTS.md` says, not 5173). Each row ran as a fresh headless Claude Code session (`claude -p`, `--permission-mode acceptEdits` with a Bash allowlist), the follow-up turns with `--resume`; the outputs are kept under `<scratch>/man/`. Results:
  - **Two reviewers, one loop: pass.** `ux-advisor` and `ui-reviewer` spawned in one message, on `ux-draft-settings` and `ui-draft-settings`; the UI brief carried route, scope, the winner's values, what is faked and `brain/chore/ui-review.md`; one combined verdict (`iterate`, each reviewer's named); six changes offered, each labelled with its reviewer, the user picks up to 3; accepted A (UI, whole-row label) and D (UX, `role="status"` note), applied by the main session (no agent edited the prototype); the round re-ran both regression passes through each agent (UX task walk, outcomes, leave-and-interrupt; UI probes on the changed rows and on every class reported clean); new combined verdict `proceed with decisions`, stop at the hand-off; no session left open. The UI review swept 320–1440 at 1× and 1.25× and backed the hit-area finding (`hit-area` coverage 0.26, 120×20) and the clipped confirm rings (`focus-ring` 0.32 and 0.52, `#ring-defect-panel`) with probe output.
  - **Stop after the reviews: pass.** `UX-REVIEW.md` and `UI-REVIEW.md` saved next to `Plain`, byte-identical to each agent's final message but for the trailing newline; inside the prototype folder, so deleting the surface deletes both.
  - **`ui-reviewer` missing: pass.** `ux-advisor` alone, the verdict its own, one line saying the UI review was skipped (it named the file as deleted in the working tree, since the sample is a git repo).
  - **UI review into the spec: pass with three partials.** No `ux-advisor` or `ui-reviewer` spawned (only the spec verifier); Context names the UI verdict and engines next to the UX one; each UI decision is one criterion; the device line is in Constraints as "Verified manually on device" with its check; the disagreement on the tick went to the UI fix by default; the rejected UI finding is out of `SPEC.md` (it survives only in the verbatim User input quote) and `brain/chore/ui-review.md` was created with the base frontmatter, the four sections in order, the Project bar left to the user, and one Suppressed line (finding · where · why · date). The two reviews already shared two elements (the tick, the confirm's Tab trap), so no UX row was added. Partials: (1) the two merged criteria (AC4, AC15) are tagged `UX + UI` but state only the required behaviour, without the UI cause and fix or the UX consequence that `flow-map.md` asks for; (2) `FLOW.md` cites the UI-only AC3 in a persona line, a happy-path step and an accessibility bullet; (3) the mechanical-fix criterion (AC17) states the outcome without its location.
  - **UI pass on a stylesheet-only diff: pass with one partial.** One pass, charter `UI pass:` naming the `ui-review` skill and `brain/chore/ui-review.md`, no motion pass; the orchestrator found nothing on 3205, started `npm run dev`, briefed the URL, killed it afterwards; the verifier ran `skills get core` before driving the browser (after `--version`), used `review-ui-draft-settings-pct-color`, ran `bash .agents/skills/ui-review/scripts/probe.sh contrast`, and reported `.pct` at 2.56:1 (2.34:1 on hover) against 4.5:1, rule 1.4.3, with one fix; Coverage names the URL. Partial: the finding says "Chromium" without the version. `git status` also shows `.claude/agent-memory/adversarial-verifier/` (its `memory: project`), which the row's expectation does not list. The verifier's memory note records a probe limit: `contrast`'s built-in `focus` state Tabs to the target itself, so a non-focusable text span gives `reached: false`; it measured the row's focus state with custom `press Tab` states instead.
  - **Motion-only diff: pass with one partial.** One pass, charter `Motion-craft pass:` on the `design-engineering` review bar, no UI pass, no server; no target-size, contrast, focus-ring or layout finding. Partial: the charter names target size once, to put it out of scope.
  - **UI pass fallbacks: pass.** (a) No dev command: the UI pass ran `DEGRADED`, code only, no server, Coverage gives the reason (the AGENTS.md edit was itself reviewed as part of the diff). (b) `ui-review` moved out: no verifier ran a UI pass (the orchestrator overrode the classifier's suggestion to load it from `HEAD`), no server, Coverage says it did not run because `ui-review` is not installed and that this is not a failed pass. The verifier flagged a tension for the maintainer: the Brain Schema row says the UI verifier pass runs "whenever a review runs", while a missing skill skips it silently but for the Coverage line.
  - **init-brain verify (the run): pass.** The `verify.md` §3 snippet prints `ok  agent-browser 0.27.1` and the Appium-optional note with the CLI on `PATH`, and the `DEGRADED` warning plus the same note without it.
  - Harness note: the allowlist blocked `command -v appium` and `tee` in the first `prototype` run, so that UI review listed Mobile Safari as not tested for a permission reason; not a product defect.
  The sample is back at its committed state; each row's end state is on its own branch in the sample repo.
- 2026-10-09 — T14 step 2: freeze commit `31f24eea2e1eb605db728cc66e2a4ef2f6e9e9c1` on `feat/project-config-and-flow-modes`, holding only `assets/agents/ui-reviewer.md` and `assets/skills/ui-review/` (20 files); nothing else staged, `specs/ui-reviewer/benchmark/` not staged. The pre-notes hashes of `SPEC.md` (`9d2eb33a…`) and `RESEARCH-ui-reviewer.md` (`3a4e2d74…`) still match their files; no pre-notes copy of `PLAN.md` exists (only its hash `c8d27eb2…`), so the audit treats the plan as a source it cannot verify. Step 2b launched.
- 2026-10-09 — T14 step 2b: the clean-context audit returned three unsourced items (no source in SPEC, RESEARCH, the plan or `research/`), so the maintainer decides before any run:
  - `assets/skills/ui-review/references/placement-and-geometry.md:8`, the example "a list that shifts under the pointer" in "No instant jump": targets note 1 (SPEC and RESEARCH give only SS-9, the re-centred modal);
  - `assets/skills/ui-review/references/widths-and-wrapping.md:10`, "labels and values neither collide nor clip … the full text stays reachable": targets note 7 (SPEC §2.7 excludes truncation by design without that condition);
  - `assets/skills/ui-review/SKILL.md:214`, "truncation by design with the full text reachable" in the falsification checklist: the same condition, note 7 (the agent's own `ui-reviewer.md:121` and `:151` keep SPEC's wording).
  Nothing else was flagged; no item was sourced only in the current plan or `research/`. Runs on hold.
- 2026-10-09 — T14 step 2b: the maintainer chose "remove and re-freeze". A clean-context worker in `wt/R` removes the three items (back to the SPEC and RESEARCH wording, nothing added); then a new freeze commit, the audit again, and the runs.
- 2026-10-09 — T14 step 4 input: the Phase 6 brief (`<scratch>/ui-bench/phase6-brief.md`, 200 lines) was written by a clean-context worker from the prototype's code at `e2442d09` and from `prototype` Phase 6 only (no browser, no `specs/`, no notes), with the rule "describe, never evaluate". It names the winner ("Tutto in uno", the picker's only variant), every screen and state with how to reach it (three fixtures by URL substring, the manual branch), the motion line with exact values, the layout and copy, what is faked, the session `ui-company-onboarding`, and no Project bar. The orchestrator read it and changed nothing; both runs get it as is (the control with its own session name).
- 2026-10-09 — T14 step 2, re-freeze: the worker removed the three items (one line each: the "list that shifts under the pointer" example; "and the full text stays reachable"; "with the full text reachable"), nothing added, no other copy found. Tests: the first full runs failed in the probe suite only, on `agent-browser` timeouts while the machine ran at load 24–40 from other processes (one stuck daemon was killed); run apart once the load fell, the 11 other files pass (191) and the probe suite passes (10), 201 in all. New freeze commit `2660245a9a5c3b8d36d7bcfabe577a91da57b39f` (the three files only). Step 2b runs again with a fresh auditor.
- 2026-10-09 — T14 step 2b, second audit (fresh clean-context auditor, same brief on `2660245a`): `none`. Step 4 starts.
- 2026-10-09 — T14 step 4 done: a clean-context general-purpose agent ran `ui-reviewer.md` from the frozen copy of `2660245a` (`<scratch>/ui-bench/frozen/`) as its charter, with the frozen `ui-review` skill and the Phase 6 brief as is, on session `ui-company-onboarding`; about 83 minutes, 172 tool calls. It returned only the run folder (`<scratch>/ui-bench/run-ui-reviewer/`, `review.md` plus the probe output and screenshots it kept); the orchestrator checked that `review.md` exists and did not study it. No `agent-browser` session left open; servers still up (3104 → 200, 3199 → 401). Step 5 (control run, session `ui-control-company-onboarding`) launched.
- 2026-10-09 — T14 step 5 done: a clean-context general-purpose agent (same model, same Phase 6 brief, session `ui-control-company-onboarding`, `skills get core` allowed, the SPEC §Ownership table verbatim, no charter, no skill, nothing in `brain-manager` readable) ran in about 24 minutes, 137 tool calls, and returned only `<scratch>/ui-bench/run-control/`. The orchestrator checked that `review.md` exists and did not open it. No session left open. Step 6 (pooler, brief `T14-6`) launched; the step 7b counter and step 8 scorer briefs are written (verbatim plan and RESEARCH D text), not launched.
- 2026-10-09 — T14 step 6 done: the clean-context pooler (brief `T14-6`) checked the notes' hashes and returned only `<scratch>/ui-bench/pool/pool.md` (SHA-256 `c003ebf8f53856fbc6a5d007a4432a06a6a6d11f6cc752730d4cc1624f9bb425`) and the sealed `source-map.json` (`61d4403f501ea7e319cc4ddc01c11fb271c28ea86420e897a35e732285672b73`). The orchestrator read neither. It copied `pool.md` byte for byte to `judgments.md` in the same folder (`cmp` identical), for the maintainer to fill each `Giudizio`. Step 7 is the maintainer's.
- 2026-10-10 — T14 step 7: the maintainer did not judge the 50 candidates one by one. Verbatim: "Non sono nè uno UI ne uno UX designer, al momento non ti so rispondere, prendiamoli tutti per buon. Mi sembrano tutti difetti. Procediamo". The orchestrator filled every `Giudizio` of `judgments.md` with `reale` by a script that counted 50 candidate headings and 50 empty fields and printed nothing else (the pool still unread), and appended a "Nota del giudice" quoting that decision: no candidate out of scope, no defect added by the judge. Consequence: validity and the out-of-scope bar item hold by construction, and any motion or UX candidate counts as a UI defect in the independent set. The step 8 brief asks the scorer to say so and to add an information-only sensitivity check (the split rules applied to each candidate's scope, with recall, validity and the out-of-scope count recomputed). Step 7b (counter) launched.
- 2026-10-10 — T14 step 7b: the clean-context counter (brief `T14-7b`, judgments and source map only) returned `independent set: 42`, `unclear: none`. At least 4, so the case stands without a maintainer decision (the size counts every candidate from the notes or the control, under the blanket judgment). Step 8 (scorer, brief `T14-8`) launched.
- 2026-10-10 — T14 step 8 done: the clean-context scorer (brief `T14-8`) returned `bar: fail`. Results (`specs/ui-reviewer/benchmark/scoring.md`):

  | Bar item | `ui-reviewer` | Result | Sensitivity reading (information only) |
  |---|---|---|---|
  | Independent set ≥ 4 | 42 (38 from the control, 4 from the notes only) | pass | 37 |
  | Recall ≥ 50% | 17 / 42 = 40.5% | fail | 16 / 37 = 43.2% |
  | More real defects than the control | 25 vs 38, of 50 | fail | 21 vs 37 |
  | Validity ≥ 2/3 | 20 / 20 = 100% (by the blanket judgment) | pass | 17 / 20 = 85% |
  | No unsupported measured value | 4 unsupported: MF9 "450 ms"; "24 px apart" (kept: 25); the suggestion link "20 px, 8 px from the input" (no geometry kept); "S2 and M1–M5 no overflow" (no sweep kept for M2, M3) | fail | — |
  | Location, engine, rule, one fix | NV1–NV3 have no rule and no fix; MF1–MF11 rely on the run-wide engine line | fail | — |
  | ≤ 1 finding out of scope | 0 (by the blanket judgment) | pass | 3 (#2, NV1, NV2): fail |
  | ≤ 120 lines, ≤ 3 open questions | 60 lines, 3 | pass | — |

  Control: 38 findings, recall 38 / 42 (90.5%, near automatic since it supplies 38 of the 42), validity 38 / 38. `ui-reviewer`: 20 findings (6 Decisions, 11 Mechanical fixes, 3 device hypotheses), 25 hits and 5 near misses over the 50 real defects; 8 defects only it found (C01, C10, C20, C29, C32, C37, C40, C48). Scorer notes: `ui-reviewer` measured the M3 "Numero" field (`m3-vat-fit.ndjson`, value cut at 280–284) but did not report it; its S4 contrast is listed under "Not tested"; #1 misstates the 320 overshoot (76 px, kept 36). The blanket judgment favours the source with more findings, since no finding can be judged invalid; the control wrote 38, `ui-reviewer` 20. Under the scope-only reading (UX by what the person loses: C16, C19, C29, C34, C37, C38, C39, C40; motion: none) the bar still fails on the same items, plus the out-of-scope count.
- 2026-10-10 — T14 step 9, recorded: `specs/ui-reviewer/benchmark/` now holds the notes (hashes unchanged: `275f1e32…`, `e40df023…`), `pool.md`, `judgments.md`, `source-map.json`, `review-ui-reviewer.md`, `review-control.md` and `scoring.md`; the probe JSON and screenshots stay in `<scratch>/ui-bench/`. Not committed: `specs/ui-reviewer/` as a whole is still untracked, so the commit is left to the maintainer with the rest of the branch. The EVAL benchmark row points to `scoring.md`. Step 10 (on failure) awaits the maintainer: iterate on the fixture and the development material only, then a fresh case or explicit acceptance. The servers (3104, 3199) and the run worktree stay up until that decision (step 11).
- 2026-10-10 — T14 step 10, the maintainer's decision. Verbatim: "Usa un agente più snello, accettalo così e basta iterare. Voglio tornare a poterlo usare". Recorded as SPEC D10: no further iteration and no fresh case; the benchmark result stands as recorded. Done by the orchestrator (the isolation ended with the scoring):
  - `assets/agents/ui-reviewer.md` rewritten lean, 194 → 157 lines. Method steps 1–6: read the project; cover every state and width (at least 280, 320, 375, 414, 768, 1024, 1280, 1440, every breakpoint ±1, a phone in landscape, 1.25× at the narrow end; an opened screenshot and every class checked in each); measure what you report (the probes for focus rings, hit areas, composited contrast, width ranges and layout jumps; axe; the fixture self-check); device rendering (hypotheses now with rule and fix); evidence and scope (every number in a kept file or screenshot); degraded mode. Output: the §3 sections unchanged in name and order; decisions uncapped; no line cap ("Never drop a finding to keep the review short"); a missing skill no longer stops the review. Frontmatter, ownership, moments, verdicts, loop and calibration kept (calibration shortened).
  - SPEC §2, §3, AC2, AC3 and the risk row revised to match; D10 added. README "The UI review" and "What they return" bullets; the EVAL agent row and benchmark row; the charter-structure integration case (steps 1–6, the two new rules, the uncapped contract, no `120 lines` or `≤ 6`).
  - Build green; 191 non-probe tests green.
- 2026-10-10 — T14 step 11: Vite (3104) and the stand-in API (3199) stopped; the run worktree removed (`git worktree remove`; the reference project's own working tree untouched). The wave worktrees `wt/R`, `wt/T4`, `wt/T5` removed too, after checking that their changes were all in the main tree (`wt/R` unchanged since its last harvest; `wt/T4` and `wt/T5` identical where the main tree has not moved on since).
- 2026-10-10 — T13 done. Deviation: the reference project's brain-manager branch head (`chore/brain-manager-design-skills`, `2728d48b`, the same commit T16 used) has no `brain/.brain-manifest.json` (a pre-CLI install), so `upgrade --dry-run` there exits 1 ("no manifest"). The 0.6 install was rebuilt in the throwaway worktree first: the 0.6.0 CLI built from `main` (`9fbb0c6`) in a scratch worktree, with this repo's `node_modules` symlinked (nothing downloaded); `init --skills-dir .claude/skills` then `upgrade` (adopt and migrate to `.agents/skills`, `CLAUDE.md` promoted and linked); the legacy `.claude/agents` moved aside and `link` run; 0.6 `doctor` exit 0. Then the 0.7 CLI:
  - `upgrade --dry-run --json`: manifest 0.6.0 → 0.7.0; 34 updated, 22 installed, 9 `would remove`, 1 conflict, `brain.config.json` created (review `total`, `review-tree`; a note suggests `none` from the router's wording).
  - `upgrade --json`: the same, applied. **Removed:** the 9 old `agent-browser` files (6 `references/`, 3 `templates/`, each "no longer shipped, unmodified since install"), plus the two emptied folders. **Installed:** `ui-review` (20 files) and `ui-reviewer.md`, both byte-identical to `assets/`; `agent-browser` is now the stub (`SKILL.md` + `LICENSE`, identical). **Conflict:** `docs-maintenance/references/review-ingest.md`, the project's own file at a path 0.7 now ships and 0.6 did not (absent from the 0.6 manifest); skipped, as it should be.
  - **Advisor blocks:** unchanged (the three blocks hash the same before and after), and `create-plan`, `create-spec`, `implement-spec` are byte-identical to `assets/` outside them. The blocks still wire the legacy `ux-flow-strategist`, because this baseline skipped init-brain's advisor detection, which resets carried-over blocks (T16); not an upgrade defect.
  - `doctor --json`: exit 0; 13 ok, 1 `modified` (the `review-ingest.md` above), 7 `untracked` legacy `design-engineering` references from the adopted copy (known since T16; migration says to clean them).
  - Every other bundled skill and agent byte-identical to `assets/`. Both scratch worktrees (`ref-upgrade` in the reference project, `bm-06` here) removed; the `node_modules` symlink removed first.
