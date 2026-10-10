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
| Claude (skills + agents) | `init --providers claude` | brain/ scaffolded; 11 skills in `.agents/skills`, 4 agents in `.agents/agents`; `.claude/{skills,agents}` + `CLAUDE.md` symlinks; manifest has an `agents` link | [auto] |
| Brain Schema is managed | `init --providers claude` | manifest role: `brain/AGENTS.md` + `brain/CLAUDE.md` = `managed`, `brain/index.md` = `seed` | [auto] |
| Router-only (codex/cursor) | `init --providers codex` | `AGENTS.md` is a real file (not symlink); no `.codex/skills` or `.codex/agents`; agents still in `.agents/agents`; manifest links empty | [auto] |
| Multi-provider | `init --providers claude,codex,cursor` | only claude gets symlinks; codex/cursor covered by `AGENTS.md` | [man] |
| No `--providers`, none detected | `init` | defaults to claude | [auto] (`resolveProviders`) |
| Idempotent re-run | `init …` twice | second run: skills/agents up-to-date, brain/ kept | [man] |
| Config lifecycle | `init --review-mode plan`, re-run, `config set/get`, `config set review.mode bad` | config written as `seed` with `plan`; re-run keeps it byte-identical and notes the ignored flag; `set` round-trips; a bad value exits non-zero listing `total, plan, none` | [auto] |

## Upgrade

| Scenario | Setup | Expect | |
|---|---|---|---|
| Agents self-heal (pre-0.4 → now) | install with skills but no agents | `.agents/agents` created, `.claude/agents` linked, advisors installed | [man] |
| Schema role reconcile (point a) | flip `brain/AGENTS.md` to `seed` in manifest | `upgrade` promotes it back to `managed` | [auto] |
| Schema propagates | unedited managed schema, newer bundle | `Update` | [auto] (`plan`/`manifest` tests) |
| Schema not clobbered | locally edited schema file | `conflict`, skipped (— `--force` to overwrite) | [auto] |
| Legacy `.claude/skills` migration | pre-`.agents/` install | relocated to `.agents/skills`, old path symlinked back | [man] |
| Idempotent re-run | upgrade twice | second run quiet (only version note) | [man] |
| Config on a pre-config install | remove `brain/brain.config.json` + its manifest entry, `upgrade` | config `created` with detected paths and `review.mode` defaulted to `total` (note names the router's suggestion); an older config gains only missing keys | [auto] |
| Scoped upgrade | `upgrade --skill design-engineering` on an older install missing it and its agent | installs that skill plus the `design-engineer` agent linked to it; other files, their manifest hashes, and the manifest version untouched; an unknown name fails listing the bundled skills | [auto] |
| Single-skill install | `install-skill design-engineering --skills-dir <dir>/skills` (no brain) | copies only that skill plus `design-engineer` into `<dir>/agents`; re-run up-to-date; an edited agent is kept (`exists`) until `--force`; a skill with no linked agent installs alone | [auto] |
| Skill↔agent link | `design-engineer.md` frontmatter | lists `design-engineering` under `skills:` (Claude Code preloads it) | [auto] (`companions` tests) |
| Advisor block survives | wire a `## Project Advisors` block, then upgrade | block carried over (hash-normalized) | [auto] (`advisors` tests) |
| `--dry-run` | — | nothing written | [man] |

## Link / Doctor / Scan

| Scenario | Command | Expect | |
|---|---|---|---|
| Add a provider later | `link --providers <id>` | additive; already-wired stay up-to-date | [man] |
| Conflict on real dir | dir where a symlink belongs | `conflict`; `--force` resolves | [auto] (`link-plan` tests) |
| Router identical / divergent | `AGENTS.md` + `CLAUDE.md` both real | identical → linked without `--force`; divergent → `conflict` naming the `CLAUDE.md`-only headings and the similarity, still a conflict with `--force`, `CLAUDE.md` untouched; reverse layout (`AGENTS.md → CLAUDE.md`) promoted | [auto] (`link-plan` + integration) |
| Healthy install | `doctor` | exit 0 | [auto] |
| Config validation | `doctor` with `review.mode: "strict"`, or `paths.personas` pointing at a missing file | exit 1 naming the key / path; no config → a note, exit 0 | [auto] |
| Drift / missing link | break a symlink | exit 1 with `missing-link`/`modified` | [man] |
| Inventory | `scan` | providers, skills, agents, legacy stores listed correctly | [man] |
| Project context | `scan` on a repo with personas inside an agent, `brain/tech-debt/<d>/<s>.md`, a review-tree report, a divergent router | `persona-source`, `tech-debt-store`, `review-store`, `router` lines; suggested config with a reason per key; `--json` → `context` | [auto] |
| Frontend stack | `scan` on React / Vue / RN / backend-only repos | one `frontend` line per manifest; native shells and `node_modules` ignored; verdict note says as-written / adapt / ask | [auto] (`frontend` tests + integration) |
| Stack adaptation | init-brain Step 4 on a non-React repo | `brain/chore/motion-stack.md` with every checklist row sourced and statused; skill files untouched | [man] |

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
| No UX trigger elsewhere | `create-spec` on a user-facing spec with no prototype | no `FLOW.md`; one line saying no UX review ran, suggesting `/prototype` | [man] |
| UX replay benchmark | after any change to `ux-advisor`: the three frozen cases in `specs/project-config-and-flow-modes/benchmark/` (setup in PLAN T17; needs the reference project) | the pass bar of `benchmark/ux-split.md` (strict UX recall per case ≥ the old `FLOW.md` and ≥ 40%, plus the other criteria); compare with the accepted run (17 of 27) | [man] |
| Review ingest | `docs-maintenance` on a spec whose `REPORT.md` is `ingested: false` (both `review.location` values) | durable findings appended to `<techDebt>/<domain>/<spec>.md`; report backlinked and marked `ingested: true`; log line | [man] |
| Reference-project dry run | PLAN T16 | suite files byte-identical, config as expected, doctor exit 0 | [man] |
| Upgrade from 0.6 through the playbook | a 0.6.x install with a UX agent wired into the `## Project Advisors` blocks, an edited Brain Schema, an older-format `FLOW.md` on an unimplemented spec, an un-ingested `REPORT.md`; then `onboard` | init-brain takes the upgrade path (no fresh/migration question); previews `upgrade`; resolves the grouped conflicts; sets review mode and personas with `config set`; removes the UX entries from the blocks; offers to lift the `FLOW.md` rows into criteria and to ingest the report; doctor exit 0 | [man] |

## Edge / output

| Scenario | Expect | |
|---|---|---|
| `--json` on every command | valid Report JSON | [man] |
| agent-browser project copy | preserved (`kept`), never clobbered | [auto] (`init` semantics) |
| `--skills-dir` override | no provider symlinks wired | [man] |
| Degradation, non-Claude (b1) | the advisor steps read sensibly when run inline (no subagent runtime) | [man] |
| Multi-provider agents (b2) | once shipped: generated native agent files (e.g. `.codex/agents/*.toml`) load in-tool | [man] (future) |

## Always

- `npm run build` clean (no TS errors).
- `npm test` green.
- No foreign tokens leaked into `assets/` (advisor names allowed only inside the `init-brain:advisors` markers; legacy agent names only in the init-brain alias table under `skills/`).
- No hardcoded tech-debt or review paths in `assets/`: `grep -rn "tech-debt/\|brain/review" assets skills` shows only `<techDebt>`/`<reviews>` tokens, the Brain Schema defaults table, and init-brain's own defaults (the scaffold layout, `project-context.md`).
- Version bumped in `package.json` when behavior changed.
