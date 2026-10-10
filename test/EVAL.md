# Evaluation scenarios

Run after **every** change to the package, before publishing. `npm test` covers the
automated rows; the rest are a manual smoke pass.

- **`npm test`** — pure planner/unit tests (`src/**/*.test.ts`) **plus** the
  filesystem integration suite (`test/integration.test.ts`, which builds the CLI
  and runs it against throwaway dirs).
- Legend: **[auto]** covered by `npm test` · **[man]** manual check.

## Fresh init

| Scenario | Command | Expect | |
|---|---|---|---|
| Claude (skills + agents) | `init --providers claude` | brain/ scaffolded; 12 skills in `.agents/skills` (`ui-review` among them, with every shipped file: its seven `probes/*.js`, `scripts/probe.sh` and `scripts/axe.sh`, `fixture/index.html` and `fixture/expected.json`, byte-identical and tracked `managed`), 5 agents in `.agents/agents` (`ui-reviewer` among them); `.claude/{skills,agents}` + `CLAUDE.md` symlinks; manifest has an `agents` link; `doctor` exit 0 | [auto] (integration) |
| Brain Schema is managed | `init --providers claude` | manifest role: `brain/AGENTS.md` + `brain/CLAUDE.md` = `managed`, `brain/index.md` = `seed` | [auto] (integration) |
| Router-only (codex/cursor) | `init --providers codex` | `AGENTS.md` is a real file (not symlink); no `.codex/skills` or `.codex/agents`; agents still in `.agents/agents`; manifest links empty | [auto] (integration) |
| Multi-provider | `init --providers claude,codex,cursor` | only claude gets symlinks; codex/cursor covered by `AGENTS.md` | [man] |
| No `--providers`, none detected | `init` | defaults to claude | [auto] (`resolveProviders`) |
| Idempotent re-run | `init …` twice | second run: skills/agents up-to-date, brain/ kept | [man] |
| Config lifecycle | `init --review-mode plan`, re-run, `config set/get`, `config set review.mode bad` | config written as `seed` with `plan`; re-run keeps it byte-identical and notes the ignored flag; `set` round-trips; a bad value exits non-zero listing `total, plan, none` | [auto] (integration) |

## Upgrade

| Scenario | Setup | Expect | |
|---|---|---|---|
| Agents self-heal (pre-0.4 → now) | install with skills but no agents | `.agents/agents` created, `.claude/agents` linked, advisors installed | [man] |
| Schema role reconcile (point a) | flip `brain/AGENTS.md` to `seed` in manifest | `upgrade` promotes it back to `managed` | [auto] (`manifest` tests + integration) |
| Schema propagates | unedited managed schema, newer bundle | `Update` | [auto] (`plan`/`manifest` tests) |
| Schema not clobbered | locally edited schema file | `conflict`, skipped (— `--force` to overwrite) | [auto] (`plan` tests) |
| Legacy `.claude/skills` migration | pre-`.agents/` install | relocated to `.agents/skills`, old path symlinked back | [man] |
| Idempotent re-run | upgrade twice | second run quiet (only version note) | [man] |
| Config on a pre-config install | remove `brain/brain.config.json` + its manifest entry, `upgrade` | config `created` with detected paths and `review.mode` defaulted to `total` (note names the router's suggestion); an older config gains only missing keys | [auto] (integration) |
| Scoped upgrade | `upgrade --skill design-engineering` on an older install missing it and its agent | installs that skill plus the `design-engineer` agent linked to it; other files, their manifest hashes, and the manifest version untouched; an unknown name fails listing the bundled skills | [auto] (integration) |
| Single-skill install | `install-skill design-engineering --skills-dir <dir>/skills` (no brain) | copies only that skill plus `design-engineer` into `<dir>/agents`; re-run up-to-date; an edited agent is kept (`exists`) until `--force`; a skill with no linked agent installs alone | [auto] (integration) |
| Skill↔agent link | `design-engineer.md` frontmatter | lists `design-engineering` under `skills:` (Claude Code preloads it) | [auto] (`companions` tests) |
| Advisor block survives | wire a `## Project Advisors` block, then upgrade | block carried over (hash-normalized) | [auto] (`advisors` tests) |
| Orphan rule | manifest tracks `managed` files this version no longer ships: one untouched (in a nested folder, or a whole retired skill), one edited, one whose advisor block holds content, one missing on disk; run `upgrade --dry-run`, `upgrade --force`, `upgrade --skill <other>` | dry run lists `would remove` and writes nothing; the untouched one is `removed` with the folders it leaves empty (up to the skill folder); the edited and advisor-wired ones stay on disk as `orphan` ("locally modified, left on disk"), even with `--force`; the missing one is `orphan` ("missing on disk"); all leave the manifest; a scoped run touches only its own skill's orphans; `doctor` lists them as `orphan`, exit 0 | [auto] (`plan` tests + integration) |
| agent-browser stub and upgrade | `init --providers claude` on an empty project; a 0.6 install (the long copy with `references/` and `templates/`, tracked `managed` with matching hashes, no `LICENSE`), then `upgrade`; the same with one old reference edited (`--force`); with the folder's entries `seed`; re-run `init` on the 0.6 install first, with the manifest under `.agents/skills` and under the legacy `.claude/skills` | a fresh init installs exactly `agent-browser/SKILL.md` (the upstream stub: `name: agent-browser`, no `hidden`, no `npx` in `allowed-tools`, a comment naming the upstream commit, the license and both changes) and its Apache-2.0 `LICENSE`; `upgrade` updates `SKILL.md` to the stub, installs `LICENSE`, removes the old references and templates with their folders, `doctor` exit 0; an edited reference stays on disk as `orphan`, even with `--force`; a `seed` copy is untouched and gets no `LICENSE` (`doctor` exit 0); the re-run `init` keeps `SKILL.md` and the old entries `managed` with their hashes (`adopted` — tracked copy kept), so the following `upgrade` reaches the same end state | [auto] (integration) |
| `--dry-run` | — | nothing written | [man] |

## Link / Doctor / Scan

| Scenario | Command | Expect | |
|---|---|---|---|
| Add a provider later | `link --providers <id>` | additive; already-wired stay up-to-date | [man] |
| Conflict on real dir | dir where a symlink belongs | `conflict`; `--force` resolves | [auto] (`link-plan` tests) |
| Router identical / divergent | `AGENTS.md` + `CLAUDE.md` both real | identical → linked without `--force`; divergent → `conflict` naming the `CLAUDE.md`-only headings and the similarity, still a conflict with `--force`, `CLAUDE.md` untouched; reverse layout (`AGENTS.md → CLAUDE.md`) promoted | [auto] (`link-plan` + integration) |
| Healthy install | `doctor` | exit 0 | [auto] (integration) |
| Config validation | `doctor` with `review.mode: "strict"`, or `paths.personas` pointing at a missing file | exit 1 naming the key / path; no config → a note, exit 0 | [auto] (integration) |
| Drift / missing link | break a symlink | exit 1 with `missing-link`/`modified` | [man] |
| Inventory | `scan` | providers, skills, agents, legacy stores listed correctly | [man] |
| Project context | `scan` on a repo with personas inside an agent, `brain/tech-debt/<d>/<s>.md`, a review-tree report, a divergent router | `persona-source`, `tech-debt-store`, `review-store`, `router` lines; suggested config with a reason per key; `--json` → `context` | [auto] (`detect` tests + integration) |
| Frontend stack | `scan` on React / Vue / RN / backend-only repos | one `frontend` line per manifest; native shells and `node_modules` ignored; verdict note says as-written / adapt / ask | [auto] (`frontend` tests + integration) |
| Stack adaptation | init-brain Step 4 on a non-React repo | `brain/chore/motion-stack.md` with every checklist row sourced and statused; skill files untouched | [man] |
| init-brain verify | init-brain Step 6 after `init`, once with `agent-browser` on `PATH` and once without; the playbook text through `brain onboard --json` | **reports `agent-browser` with its version and Appium as optional**: `agent-browser` is needed for the reviews (`ux-advisor`, `ui-reviewer`, the UI pass of `adversarial-review`) and reported with its installed version (`agent-browser --version`, 0.27.1 or later), or as missing with the reviews `DEGRADED`; Appium with the XCUITest driver is optional (`appium` on `PATH` and `xcuitest` in `appium driver list --installed`), adding Mobile Safari for the device classes, else device findings stay "not verified on device"; neither is installed and `-p ios` is never run to find out; the report has a Tools line with both. The lists match `assets/`: the token grep covers every bundled skill but `agent-browser` (`ui-review` included); every list of shipped advisors in `SKILL.md`, `advisor-detection.md` and `verify.md` names all five, `ui-reviewer` included, with no "four" left; a project's own UI-review or visual-QA agent is a twin of `ui-reviewer`, its knowledge goes to `brain/chore/ui-review.md` (Project bar only offered); the ux/design bucket and agent memory split UX → `ux-review.md`, static UI → `ui-review.md`, motion → `brain/chore/motion.md`; legacy agent names appear only in the alias table; `upgrade.md` explains `would remove` / `removed` / `orphan` ("left on disk", "missing on disk"), the `agent-browser` stub with `skills get core`, the project-owned copy and the re-run of `init` | [auto] (integration: the playbook text) · [man] (the run) |

## Flows (review modes, prototype-gated UX)

Run on a toy spec in a throwaway project after `init`.

| Scenario | Setup | Expect | |
|---|---|---|---|
| Review mode `total` | `config set review.mode total`; `create-spec` → `create-plan` → `implement-spec` | spec verifier, plan verifier and `adversarial-review` all run on their own | [man] |
| Review mode `plan` | `config set review.mode plan`; same flow | only the plan verifier runs; the spec is self-checked; code review offered in one line | [man] |
| Review mode `none` | `config set review.mode none`; same flow, plus a `PLAN.md` task listing review as a closing step | nothing runs on its own; each gate offered in one line; `/adversarial-review` still works | [man] |
| Prototype → ux-advisor → create-spec | `prototype`, `keep <variant>` | `ux-advisor` briefed with route, scope, personas path, motion line, fakes; verdict relayed; decisions become numbered AC; `FLOW.md` (map format) cites the AC ids | [man] |
| ux-advisor evidence and caps | same | every finding has a location + observed evidence; ≤ 6 decisions, ≤ 3 open questions, ~120 lines; screenshots were opened | [man] |
| ux-advisor stays on UX | same | an Outcomes and states table built from the code (outcomes the prototype cannot show marked `not reachable`); a Leaving and interrupting pass; copy read in every state; no layout, motion, contrast, focus-ring or target-size findings | [man] |
| ux-advisor degraded mode | same, without the `agent-browser` CLI | `DEGRADED` banner; code-grounded findings only, no runtime claims | [man] |
| Iterate loop | a winner with a P0 fixable on the prototype | ≤ 3 changes, each accepted by the user and applied by `prototype` (never the agent); re-review with regression pass; stops at 2 rounds; changes reach the spec's Decision Log | [man] |
| ux-advisor declines | brief it with a spec draft and no route | one line naming the moment that fits; no review | [man] |
| No UX trigger elsewhere | `create-spec` on a user-facing spec with no prototype | no `FLOW.md`; one line saying no UX or UI review ran, suggesting `/prototype`; neither `ux-advisor` nor `ui-reviewer` is spawned | [man] |
| UX replay benchmark | after any change to `ux-advisor`: the three frozen cases in `specs/project-config-and-flow-modes/benchmark/` (setup in PLAN T17; needs the reference project) | the pass bar of `benchmark/ux-split.md` (strict UX recall per case ≥ the old `FLOW.md` and ≥ 40%, plus the other criteria); compare with the accepted run (17 of 27) | [man] |
| UI review benchmark | once, before release, after the agent and the skill are frozen: the one case of `specs/ui-reviewer/SPEC.md` AC13 (setup and definitions in `specs/ui-reviewer/RESEARCH-ui-reviewer.md` part D; needs the reference project). Before any run: the maintainer's notes sealed outside the tree (only their SHA-256 in the PLAN log) and the commit of `ui-reviewer` and `ui-review` in the PLAN log. Then the `ui-reviewer` run, a control run (clean-context general-purpose agent, same brief, model and `agent-browser` version, with the ownership table but without the charter and the skill), a clean-context pooler, and the maintainer's judgments; no writing session reads the notes, the control output, the pool or the later artifacts of the case | part D's pass bar: the independent set holds ≥ 4 real non-motion UI defects; recall ≥ 50% of it; more real defects found than the control; validity ≥ 2/3; no measured value missing from the run's kept probe JSON or screenshots; every finding with location, engine, rule and one fix; ≤ 1 finding out of scope (UX or motion); ≤ 120 lines and ≤ 3 open questions. Scored once: the results table (`ui-reviewer` and the control) goes to the PLAN log and the judged pool to `specs/ui-reviewer/benchmark/`; after a failure, a fresh case labelled the same way or the maintainer's explicit acceptance | [man] |
| Review ingest | `docs-maintenance` on a spec whose `REPORT.md` is `ingested: false` (both `review.location` values) | durable findings appended to `<techDebt>/<domain>/<spec>.md`; report backlinked and marked `ingested: true`; log line | [man] |
| Reference-project dry run | PLAN T16 | suite files byte-identical, config as expected, doctor exit 0 | [man] |
| Upgrade from 0.6 through the playbook | a 0.6.x install with a UX agent wired into the `## Project Advisors` blocks, an edited Brain Schema, an older-format `FLOW.md` on an unimplemented spec, an un-ingested `REPORT.md`; then `onboard` | init-brain takes the upgrade path (no fresh/migration question); previews `upgrade`; resolves the grouped conflicts; sets review mode and personas with `config set`; removes the UX entries from the blocks; offers to lift the `FLOW.md` rows into criteria and to ingest the report; doctor exit 0 | [man] |

## UI review probes

| Scenario | Command | Expect | |
|---|---|---|---|
| ui-review probes | `UI_REVIEW_PROBE_SESSION=<name> npm test` with `agent-browser` on PATH (`test/ui-review-probes.test.ts`) | the installed `ui-review` copy runs through `bash`; `width-sweep`, `resize`, `edge`, `focus-ring`, `hit-area`, `contrast` and `layout-jump` each return `fixture/expected.json` on the defect case and its clean twin; `axe.sh` returns `source: none` in a folder without axe-core; the session is closed afterwards. Without the CLI the suite skips with a note: run the probes by hand on `fixture/index.html` instead | [auto] when the CLI is present, else [man] |
| ui-reviewer agent | `init --providers claude`; `install-skill ui-review --skills-dir <dir>/skills`; an install without `ui-review` and `ui-reviewer` (gone from disk and manifest), then `upgrade --skill ui-review`, and separately `upgrade` | 5 agents in `.agents/agents`, `ui-reviewer.md` among them, listing `ui-review` under `skills:`; `install-skill` copies the skill and `ui-reviewer.md` into `<dir>/agents`; both upgrades install the skill and the agent, and `doctor` exits 0 with both tracked `managed`; the agent has `tools: Read, Grep, Glob, Bash` (no `Write`, `Edit` or `memory:`) and two examples (a prototype winner, a live route), and carries the SPEC §Ownership table verbatim, the motion-boundary and target-size lines, the three moments with the `adversarial-review` UI pass, the three verdicts, the guide-load line before method steps 1–8, the §3 output contract in order (Engines naming the axe source; ≤ 120 lines, no scores, no praise), and kept and rejected calibration examples (UX, motion, taste) | [auto] (integration) |
| `axe.sh` with a local axe-core | `AXE_CORE_DIR=<folder holding axe.min.js> UI_REVIEW_PROBE_SESSION=<name> npm test`, or `bash <skillsDir>/ui-review/scripts/axe.sh '{"scope":"#contrast"}'` on the fixture from a project with `node_modules/axe-core` | `source: node_modules` (`a11y` on agent-browser 0.33.0 or later), the defect counter's `color-contrast` violation; nothing fetched or installed | [man] |

## UI review flows (sample project)

**The sample project**, shared by every row in this section. Build it once in a scratch folder, `<scratch>/ui-sample/`, never inside this repo:

1. `brain init --providers claude` in the empty folder.
2. A vanilla Vite page with one prototype surface, `src/prototypes/draft-settings/`, served in dev at `/prototypes/draft-settings`: one variant, `Plain`, and its harness, laid out as `prototype` Phase 4 builds them (in-project branch), with no picker.
3. `Plain` renders two cases of the `ui-review` fixture (`.agents/skills/ui-review/fixture/index.html`), markup and CSS copied as they are: the checkbox rows (`#hit-defect-row`: the row highlights as a whole, only the 120 px label toggles, the ring wraps the 16 px box) under a "Notify me about" heading, and the clipped dialog (`#ring-defect-panel`: "Discard this draft?", Keep and Discard flush with an `overflow: hidden` edge), opened by a "Discard draft" button. A harness switch opens the dialog and checks the boxes. Saving is faked: no endpoint.
4. `brain/chore/ui-review.md` holding only a Project bar: minimum width 320 px.
5. For the UI pass rows: the root `AGENTS.md` → Project guidelines documents the dev command (`npm run dev`, serving `http://localhost:5173`), and the folder is a git repository with all of the above committed.

Run each row in a fresh Claude Code session at the project root, with the dev server running; the UI pass rows start with it stopped. The scope to give in one line: "the notification checkboxes and the discard-draft confirm on `/prototypes/draft-settings`; saving is faked".

| Scenario | Steps | Expect | |
|---|---|---|---|
| Two reviewers, one loop | `/prototype keep Plain` with the scope above. When the combined verdict is `iterate`, accept one UI change, plus one UX change if one is offered. After the round, stop at the hand-off to `create-spec`. If neither review says `iterate`, record that, give Discard the fixture's `ring-none` style (no focus ring at all) and run the row again | `ux-advisor` and `ui-reviewer` are spawned in parallel, on `Plain` only, each on its own named `agent-browser` session (`ux-draft-settings`, `ui-draft-settings`; never the default); `ui-reviewer`'s brief carries the route, the scope, the winner's values, what the prototype fakes and `brain/chore/ui-review.md`; **after `keep`, both reviews arrive with one combined verdict**: one line, the stricter of the two, naming each reviewer's own; the UI review follows its output contract, sweeps from 320 px, and has a probe-backed finding on the checkbox rows' hit area and on the dialog's clipped focus ring; the change list draws from both reviews, each item labelled with its reviewer, at most 3, chosen by the user and applied by `prototype` (never by an agent); **the iterate round re-runs both regression passes**: the agent whose item changed re-reviews it, `ux-advisor` reruns the task walk, the outcomes and the leave-and-interrupt pass, and `ui-reviewer` re-runs the probes on the changed element and on every class it had reported Checked and clean; a new combined verdict follows; a second `iterate` gets one more round at most, then the hand-off; `agent-browser session list` shows neither session afterwards | [man] |
| Stop after the reviews | same, but stop right after the combined verdict | `UX-REVIEW.md` and `UI-REVIEW.md` are saved verbatim next to `Plain`; deleting the prototype surface (Hard Rule 5) deletes both | [man] |
| `ui-reviewer` missing | remove `.agents/agents/ui-reviewer.md`, then `/prototype keep Plain` | `ux-advisor` reviews alone; one line says the UI review was skipped because `ui-reviewer` is not installed; the verdict is `ux-advisor`'s | [man] |
| UI review into the spec | Start from the end state of **Stop after the reviews**, before the surface is deleted (run that row again if it was): `UX-REVIEW.md` and `UI-REVIEW.md` next to `Plain`. Make the merge case certain: if the two reviews share no element, add one row to `UX-REVIEW.md` → Decisions on the dialog's Discard button, worded as a consequence ("a keyboard user cannot see that Discard has focus, so Enter discards the draft"), and keep the UI review's clipped-ring finding on that button. If `UI-REVIEW.md` → Not verified on device reads `none`, add one line: "`#hit-defect-row` checkboxes · Mobile Safari may draw no ring on a checkbox reached by keyboard · manual check: in Mobile Safari with a hardware keyboard, Tab to each checkbox and look for the ring". Move `brain/chore/ui-review.md` out of the project. In a fresh session, ask for "create-spec from the prototype at `src/prototypes/draft-settings/` (`/prototypes/draft-settings`)"; when it lists the findings, reject one UI finding with a reason and accept the offer to suppress it. Afterwards, put the original page back | `create-spec` reads both reviews from the prototype path and spawns no agent named `ui-reviewer` or `ux-advisor`; Context has one line with the UI verdict and its Engines next to the UX verdict; each UI decision is one numbered criterion; the mechanical fixes are **one** criterion that lists them, one line each with its location; the device line is in Constraints as "verified manually on device: …" with its manual check; the UI open questions are in Open Questions with their defaults; applied prototype changes, if any, are in the Decision Log with exact values; nothing from Checked and clean or Not tested is copied; **the UI finding and the UX finding on the Discard button are one criterion**: the UI wording gives the cause and the fix (the ring cut by the dialog's `overflow: hidden`, and how to draw it), the UX wording the task consequence (the draft discarded by mistake), and no second criterion names that button; `FLOW.md` cites the merged criterion where the consequence sits and gets no row for a UI-only criterion; the rejected finding is not in `SPEC.md`; `brain/chore/ui-review.md` is created with the base frontmatter (`domain: _root`, `type: concept`), the four sections in order (Project bar · Component traps · Kept examples · Suppressed findings), the Project bar left for the user with no value taken from the review, and the rejected finding as one line under Suppressed findings: the finding, where it was, why the project rejected it | [man] |
| UI pass on a stylesheet-only diff | With the dev server stopped, change one line of `Plain`'s stylesheet: `.check-row .pct` `color` from `#475569` to `#94a3b8`. Leave it uncommitted and run `/adversarial-review` on the working tree (case A) | **a stylesheet-only diff charters a UI pass and not a motion-craft pass**: `RUBRIC.md` has one pass whose charter begins `UI pass:` and names the `ui-review` skill, and none that begins `Motion-craft pass:`; **the orchestrator serves the route**: before the verifiers run, it finds no server answering, starts `npm run dev` from the root `AGENTS.md`, maps the change to `http://localhost:5173/prototypes/draft-settings` and puts that URL in the UI pass's brief; **the verifier returns findings with the probe evidence**: it runs `agent-browser skills get core` before its first `agent-browser` command, drives a named session of its own (never the default), runs the probes through `bash .agents/skills/ui-review/scripts/probe.sh`, and reports the `.pct` text contrast with its location (selector, state, width range), the engine (Chromium and its version), the ratio the `contrast` probe measured against the required 4.5:1, the rule (1.4.3) and one fix; no UX or motion finding; `REPORT.md` → Coverage names the URL the UI pass ran on; afterwards the orchestrator stops the server it started (`curl -sI http://localhost:5173` fails), `agent-browser session list` shows no session of the pass, and `git status` shows only the stylesheet edit and the review bookkeeping (`brain/review/<slug>/`, `brain/index.md`, `brain/log.md`) | [man] |
| Motion-only diff | Revert the edit above. Add one line to `.check-row` in `Plain`'s stylesheet, `transition: background-color 150ms ease-out;`, and run `/adversarial-review` on the working tree | **only the motion-craft pass is chartered**: `RUBRIC.md` has one pass whose charter begins `Motion-craft pass:` and names the `design-engineering` review bar, and none that begins `UI pass:`; that charter does not mention target size; no dev server is started for the review; the motion-craft verifier reports no target-size, contrast, focus-ring or layout finding | [man] |
| UI pass fallbacks | Restore the stylesheet edit of **UI pass on a stylesheet-only diff**, dev server stopped. (a) Delete the dev command from the root `AGENTS.md` and run `/adversarial-review` on the working tree. (b) Put the command back, move `.agents/skills/ui-review/` out of the project and run it again. Afterwards, put both back | (a) the UI pass runs on the code only: its block opens with `DEGRADED`, its findings cite `file:line` and state no measured value, no server is started, and `REPORT.md` → Coverage gives the reason (no dev command in the root `AGENTS.md`); (b) no verifier runs a UI pass and no server is started; `REPORT.md` → Coverage says in one line that the UI pass did not run because `ui-review` is not installed, and the verdict does not count it as a failed pass | [man] |

## Ownership

| Scenario | Command | Expect | |
|---|---|---|---|
| One owner per concern | the greps below, from the repo root | the first four print nothing: no static UI or target size owned by `design-engineer`, no 44 px rule on the motion side, no "axe in the review pipeline"; the last three print a count of 1 or more for every file | [man] |

```bash
# Print nothing
grep -rniE '(layout|placement|contrast|focus.ring|target.size|tap.target|touch.target|visual (polish|accessibility)|static UI|UI.polish)[^.;`]*`design-engineer`' assets skills README.md
grep -rnE '44 ?px|44×44' assets/skills/design-engineering assets/agents/design-engineer.md
grep -rniE 'tap.target|touch.target|target.size' assets/skills/design-engineering assets/agents/design-engineer.md | grep -v '`ui-review`'
grep -rn 'axe in the review pipeline' assets skills README.md
# Print a count of 1 or more for every file
grep -c '`ui-reviewer`' assets/agents/ux-advisor.md assets/agents/design-engineer.md assets/skills/design-engineering/SKILL.md
grep -c 'motion and interaction craft' assets/agents/design-engineer.md assets/skills/create-plan/SKILL.md assets/skills/implement-spec/SKILL.md assets/skills/implement-spec/references/lifecycle.md
grep -c 'agent-browser skills get core' assets/agents/ux-advisor.md assets/skills/implement-spec/SKILL.md assets/skills/implement-spec/references/lifecycle.md
```

## Edge / output

| Scenario | Expect | |
|---|---|---|
| `--json` on every command | valid Report JSON | [man] |
| agent-browser project copy | a differing copy the previous manifest does not track as `managed` is preserved (`kept`), never clobbered; a skill folder whose entries are all `seed` gets no newly shipped file (`kept` — project-owned skill), and `doctor` neither flags it `outdated` nor walks it for `untracked` files (exit 0) | [auto] (`init` semantics, `plan` tests + integration) |
| `--skills-dir` override | no provider symlinks wired | [man] |
| Degradation, non-Claude (b1) | the advisor steps read sensibly when run inline (no subagent runtime) | [man] |
| Multi-provider agents (b2) | once shipped: generated native agent files (e.g. `.codex/agents/*.toml`) load in-tool | [man] (future) |

## Always

- `npm run build` clean (no TS errors).
- `npm test` green.
- No foreign tokens leaked into `assets/` (advisor names allowed only inside the `init-brain:advisors` markers; legacy agent names only in the init-brain alias table under `skills/`).
- No hardcoded tech-debt or review paths in `assets/`: `grep -rn "tech-debt/\|brain/review" assets skills` shows only `<techDebt>`/`<reviews>` tokens, the Brain Schema defaults table, and init-brain's own defaults (the scaffold layout, `project-context.md`).
- The counts and lists agree: the README, this file and `skills/init-brain/` name every bundled skill and agent (12 and 5 today, `ui-review` and `ui-reviewer` included) — [auto] (integration).
- Version bumped in `package.json` when behavior changed.
