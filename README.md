# brain-manager

A CLI + [Claude Code](https://claude.com/claude-code) skill that bootstraps and maintains the **`brain/`** knowledge base and its spec-driven skill suite in any project.

Two layers, by design:

- **The `brain` CLI** (this package) does the *mechanical* work — deterministic, testable, agent-agnostic: scaffold `brain/`, install the skill suite, track every installed file in a manifest, sync safely on upgrade.
- **The `init-brain` skill** is the *intelligent* layer an LLM runs — it chooses fresh-init vs migration, folds legacy docs into `brain/`, classifies project advisor agents, and verifies the result. It drives the CLI for everything mechanical.

## CLI

```bash
npx -y brain-manager init      # or: npm i -g brain-manager
```

| Command | What it does |
|---|---|
| `brain init` | Scaffold `brain/` + install the 8 skills. **Additive**: existing files are never overwritten — pre-existing skills are *adopted* into the manifest instead. Writes `brain/.brain-manifest.json`. |
| `brain upgrade` | Sync installed skills to this package version. Manifest-aware: untouched files update, locally modified files are skipped as conflicts (`--force` to overwrite, `--dry-run` to preview). |
| `brain doctor` | Read-only health check: scaffold structure, unstamped placeholders, manifest, skill drift. Exit 1 on problems. |
| `brain scan` | Inventory the repo: legacy doc stores, loose specs, agent definitions, installed skills. Feeds the LLM's mode decision. |

All commands take `--json` for machine/agent-friendly output.

### How upgrades stay safe

`brain init` records a content hash for every file it installs. `brain upgrade` then compares manifest / disk / bundled-assets three ways: a file you never touched updates silently; a file you edited becomes a `conflict` and is left alone. Two ownership rules on top:

- **`brain/` content is yours** (seed): written once, restored only if deleted, never overwritten.
- **The `## Project Advisors` blocks are yours**: hashes are computed with the block normalized away, so LLM-wired advisors never count as a modification and are carried over on every update.

## The init-brain skill

For Claude Code users, install the skill (it resolves the CLI automatically — global `brain`, the local repo build, or npx):

```bash
git clone https://github.com/omardeangelis/brain-manager.git
cd brain-manager
./install.sh        # symlinks skills/init-brain into your skills dir + builds the CLI
```

Then in any project run `/init-brain`. It scans, picks fresh-init vs migration (asking when ambiguous), runs `brain init`, wires advisors, and verifies with `brain doctor`.

## What ends up in a project

- **`brain/`** — `AGENTS.md` + `CLAUDE.md` (the Brain Schema), `index.md`, `log.md`, `specs/CONSTITUTION.md`, the `raw/ specs/ domains/ chore/ tech-debt/` layout, and `.brain-manifest.json`.
- **Seven process skills**, generic and brain-wired: `create-spec`, `create-plan`, `grill-me`, `tdd`, `swarm-plan`, `implement-spec`, `docs-maintenance`.
- **The `agent-browser` tool skill** (docs only; the CLI is a separate `npm i -g agent-browser`). A pre-existing project-specific copy is detected and never clobbered.

## Repo layout

```
brain-manager/
├── src/                  # the Effect-based CLI
│   ├── bin.ts            # entrypoint (provides NodeContext + Assets)
│   ├── Cli.ts            # command tree
│   ├── commands/         # init / upgrade / doctor / scan
│   ├── core/             # pure logic: manifest, upgrade planner, advisor blocks, hashing
│   └── services/         # Assets service + fs helpers
├── assets/
│   ├── brain/            # the brain/ scaffold stamped into projects
│   └── skills/           # the 8 bundled skills
└── skills/init-brain/    # the orchestrator skill (drives the CLI)
```

Built with [Effect](https://effect.website) (`@effect/cli`, `@effect/platform`). `npm run build`, `npm test`.

## Maintaining

This repo is the single source of truth. The maintainer's live skill at `~/.claude/skills/init-brain` is symlinked here; the CLI is rebuilt by `install.sh` or `npm run build`. Releases go out with `npm publish` — projects pick them up via `npx`/`npm update` and `brain upgrade`.

## License

MIT
