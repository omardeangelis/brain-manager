# brain-manager

A CLI + [Claude Code](https://claude.com/claude-code) skill that bootstraps and maintains the **`brain/`** knowledge base and its spec-driven skill suite in any project.

Two layers, by design:

- **The `brain` CLI** (this package) does the *mechanical* work — deterministic, testable, agent-agnostic: scaffold `brain/`, install the skill suite, track every installed file in a manifest, sync safely on upgrade.
- **The `init-brain` skill** is the *intelligent* layer an LLM runs — it chooses fresh-init vs migration, folds legacy docs into `brain/`, classifies project advisor agents, and verifies the result. It drives the CLI for everything mechanical.

## Get started

The fastest path — let your IDE / AI assistant drive it. **No clone, no global install.**

Open your project and tell your AI assistant:

> Run `npx -y brain-manager onboard` and follow it.

`brain onboard` prints the orchestration playbook — fresh from this package, with its references inlined — straight to stdout. Your assistant reads it and drives the whole setup: it scans the repo and **asks you what you want**:

- **Skills + fresh scaffold** — install the spec-driven skills and a fresh, empty `brain/`.
- **Reorganize existing knowledge** — fold your existing docs / specs / tech-debt into `brain/` the brain way (migration).

It also detects which AI tools your repo already uses (`.claude`, `.codex`, `.cursor`, …) and **asks which to wire** — setting up a shared `.agents/` folder that every chosen tool reads. Then it wires project advisors and verifies with `brain doctor`. Nothing is installed on your machine and nothing can drift — the playbook is read from the package on every run.

> **Want a reusable `/init-brain` slash command** (Claude Code only)? Install the skill once per machine: `npx -y brain-manager install-skill`. It copies the same orchestrator into your global skills dir (`~/.agents/skills` / `~/.claude/skills`). Re-run it (or pass `--force`) to re-sync if it ever drifts.

> **Just the mechanical scaffold, no AI?** Run `npx -y brain-manager init` inside the project. You get `brain/` + the skill suite, but skip the scan, the fresh-vs-migration choice, and advisor wiring.

## CLI

```bash
npx -y brain-manager <command>     # or: npm i -g brain-manager
```

| Command | What it does |
|---|---|
| `brain onboard` | Print the `init-brain` orchestration playbook (with references inlined) to stdout for an AI assistant to follow — **no install, no drift**. The drift-free entry point: read fresh from the package every run. `--json` for the structured body. |
| `brain install-skill` | Copy the `init-brain` orchestrator skill into your global skills dir (`~/.agents/skills` / `~/.claude/skills`) so `/init-brain` works in every project — **no clone needed**. An existing install is kept (`up-to-date` / `exists`) unless you pass `--force`. |
| `brain init` | Scaffold `brain/` + install the 8 skills into the canonical `.agents/skills`, then wire the chosen AI providers (`--providers claude,codex,cursor`; auto-detects if omitted). **Additive**: existing files are never overwritten — pre-existing skills are *adopted* into the manifest instead. Writes `brain/.brain-manifest.json`. |
| `brain link` | Wire (or add) AI providers into the `.agents/`-canonical layout: symlink `<provider>/skills → ../.agents/skills` for skill-capable tools and the root `AGENTS.md` for the rest. Idempotent and additive; `--force` to replace a conflicting path. |
| `brain upgrade` | Sync installed skills to this package version. Manifest-aware: untouched files update, locally modified files are skipped as conflicts (`--force` to overwrite, `--dry-run` to preview). Auto-migrates a legacy `.claude/skills` install to the `.agents/` layout (`--no-migrate` to skip). |
| `brain doctor` | Read-only health check: scaffold structure, unstamped placeholders, manifest, skill drift, and provider symlinks. Exit 1 on problems. |
| `brain scan` | Inventory the repo: legacy doc stores, loose specs, agent definitions, installed skills, **and which AI providers are present**. Feeds the LLM's mode + provider decisions. |

All commands take `--json` for machine/agent-friendly output.

### How upgrades stay safe

`brain init` records a content hash for every file it installs. `brain upgrade` then compares manifest / disk / bundled-assets three ways: a file you never touched updates silently; a file you edited becomes a `conflict` and is left alone. Two ownership rules on top:

- **`brain/` content is yours** (seed): written once, restored only if deleted, never overwritten.
- **The `## Project Advisors` blocks are yours**: hashes are computed with the block normalized away, so LLM-wired advisors never count as a modification and are carried over on every update.

## What ends up in a project

- **`brain/`** — `AGENTS.md` + `CLAUDE.md` (the Brain Schema), `index.md`, `log.md`, the `raw/ specs/ domains/ chore/ tech-debt/` layout, and `.brain-manifest.json`.
- **A canonical `.agents/skills/`** holding the suite once, with each chosen provider symlinked into it (`.claude/skills → ../.agents/skills`, …) so every AI tool reads the same files.
- **A root `AGENTS.md`** as the canonical instruction file (read natively by ~20 tools incl. Codex & Cursor), with `CLAUDE.md → AGENTS.md` for Claude. This is also where the project's own gates (build/test/lint, review) live.
- **Seven process skills**, generic and brain-wired: `create-spec`, `create-plan`, `grill-me`, `tdd`, `swarm-plan`, `implement-spec`, `docs-maintenance`.
- **The `agent-browser` tool skill** (docs only; the CLI is a separate `npm i -g agent-browser`). A pre-existing project-specific copy is detected and never clobbered.

## Repo layout

```
brain-manager/
├── src/                  # the Effect-based CLI
│   ├── bin.ts            # entrypoint (provides NodeContext + Assets)
│   ├── Cli.ts            # command tree
│   ├── commands/         # onboard / install-skill / init / link / upgrade / doctor / scan
│   ├── core/             # pure logic: manifest, upgrade planner, advisor blocks, hashing
│   └── services/         # Assets service + fs helpers
├── assets/
│   ├── brain/            # the brain/ scaffold stamped into projects
│   └── skills/           # the 8 bundled suite skills
└── skills/init-brain/    # the orchestrator skill (drives the CLI)
```

Built with [Effect](https://effect.website) (`@effect/cli`, `@effect/platform`). `npm run build`, `npm test`.

## Development & maintaining

This repo is the single source of truth. Releases go out with `npm publish`, and end users get everything through `npx` / `npm` — **a clone is never required** to use brain-manager. They install the skill with `brain install-skill` and pick up new versions via `npx`/`npm update` and `brain upgrade`.

If you're hacking on the CLI or the skill itself, install the skill as a **symlink** to your working copy so edits are picked up live (instead of `brain install-skill`, which copies):

```bash
git clone https://github.com/omardeangelis/brain-manager.git
cd brain-manager
./install.sh        # symlinks skills/init-brain into your skills dir + builds the CLI
```

The maintainer's live skill at `~/.agents/skills/init-brain` is symlinked here; the CLI is rebuilt by `install.sh` or `npm run build`. Run `npm run build` and `npm test` after edits.

## License

MIT
