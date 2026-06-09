# brain-manager

A distributable home for the **`init-brain`** [Claude Code](https://claude.com/claude-code) skill — a one-command bootstrapper that drops a `brain/` knowledge base and a full spec-driven skill suite into any project.

`init-brain` is **self-contained**: everything it installs ships inside the skill's own `assets/` directory, so it works even in an empty repo.

## What `/init-brain` sets up

After a run, the target project has:

- **A scaffolded `brain/` folder** — `AGENTS.md` + `CLAUDE.md` (the Brain Schema), `index.md`, `log.md`, `specs/CONSTITUTION.md`, and the `raw/ specs/ domains/ chore/ tech-debt/` layout.
- **Seven spec-driven process skills**, generic and wired to `brain/`:
  `create-spec`, `create-plan`, `grill-me`, `tdd`, `swarm-plan`, `implement-spec`, `docs-maintenance`.
- **The `agent-browser` tool skill** (docs only; the CLI is a separate `npm i -g agent-browser`), used for `browser`/`mixed` review-mode tasks.
- **Project advisors** wired into `create-spec` / `create-plan` / `implement-spec`, detected from agent definitions already present in the repo.

It runs in two modes:

- **Fresh init** — scaffold + install skills into a project with no prior knowledge base.
- **Migration** — fold an existing `docs/`, `specs/`, or scattered domain/chore/tech-debt content into `brain/`, repoint existing skills, and (after explicit confirmation) delete the old sources.

## Install

Clone the repo and run the installer — it symlinks the skill into your Claude Code skills directory so `git pull` keeps it up to date:

```bash
git clone https://github.com/omardeangelis/brain-manager.git
cd brain-manager
./install.sh
```

Then, in any project, run:

```
/init-brain
```

### Manual install

Prefer to do it yourself? Copy (or symlink) the skill into your skills directory:

```bash
# Claude Code standard location:
cp -R skills/init-brain ~/.claude/skills/init-brain

# or, if you keep skills under ~/.agents:
cp -R skills/init-brain ~/.agents/skills/init-brain
```

The skill auto-detects its own assets from either `~/.claude/skills/init-brain` or `~/.agents/skills/init-brain`.

## Repo layout

```
brain-manager/
├── README.md
├── install.sh
└── skills/
    └── init-brain/
        ├── SKILL.md            # entry point + orchestration steps
        ├── references/         # fresh-init, migration, install, verify, advisor-detection
        └── assets/
            ├── brain/          # the brain/ scaffold that gets stamped into projects
            └── skills/         # the 8 bundled skills installed alongside init-brain
```

## Maintaining

This repo is the single source of truth. The maintainer's live skill at `~/.claude/skills/init-brain` is symlinked here, so edits in `skills/init-brain/` take effect immediately and are versioned by git.

## License

No license declared yet — add one before sharing if you want to set reuse terms.
