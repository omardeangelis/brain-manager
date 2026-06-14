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
| Claude (skills + agents) | `init --providers claude` | brain/ scaffolded; 9 skills in `.agents/skills`, 3 agents in `.agents/agents`; `.claude/{skills,agents}` + `CLAUDE.md` symlinks; manifest has an `agents` link | [auto] |
| Brain Schema is managed | `init --providers claude` | manifest role: `brain/AGENTS.md` + `brain/CLAUDE.md` = `managed`, `brain/index.md` = `seed` | [auto] |
| Router-only (codex/cursor) | `init --providers codex` | `AGENTS.md` is a real file (not symlink); no `.codex/skills` or `.codex/agents`; agents still in `.agents/agents`; manifest links empty | [auto] |
| Multi-provider | `init --providers claude,codex,cursor` | only claude gets symlinks; codex/cursor covered by `AGENTS.md` | [man] |
| No `--providers`, none detected | `init` | defaults to claude | [auto] (`resolveProviders`) |
| Idempotent re-run | `init …` twice | second run: skills/agents up-to-date, brain/ kept | [man] |

## Upgrade

| Scenario | Setup | Expect | |
|---|---|---|---|
| Agents self-heal (pre-0.4 → now) | install with skills but no agents | `.agents/agents` created, `.claude/agents` linked, advisors installed | [man] |
| Schema role reconcile (point a) | flip `brain/AGENTS.md` to `seed` in manifest | `upgrade` promotes it back to `managed` | [auto] |
| Schema propagates | unedited managed schema, newer bundle | `Update` | [auto] (`plan`/`manifest` tests) |
| Schema not clobbered | locally edited schema file | `conflict`, skipped (— `--force` to overwrite) | [auto] |
| Legacy `.claude/skills` migration | pre-`.agents/` install | relocated to `.agents/skills`, old path symlinked back | [man] |
| Idempotent re-run | upgrade twice | second run quiet (only version note) | [man] |
| Advisor block survives | wire a `## Project Advisors` block, then upgrade | block carried over (hash-normalized) | [auto] (`advisors` tests) |
| `--dry-run` | — | nothing written | [man] |

## Link / Doctor / Scan

| Scenario | Command | Expect | |
|---|---|---|---|
| Add a provider later | `link --providers <id>` | additive; already-wired stay up-to-date | [man] |
| Conflict on real dir | dir where a symlink belongs | `conflict`; `--force` resolves | [auto] (`link-plan` tests) |
| Healthy install | `doctor` | exit 0 | [auto] |
| Drift / missing link | break a symlink | exit 1 with `missing-link`/`modified` | [man] |
| Inventory | `scan` | providers, skills, agents, legacy stores listed correctly | [man] |

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
- No foreign tokens leaked into `assets/` (advisor names allowed only inside the `init-brain:advisors` markers).
- Version bumped in `package.json` when behavior changed.
