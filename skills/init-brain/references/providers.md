# Providers & the `.agents/` layout

How brain wires itself into whichever AI coding tools a project uses. The CLI does the mechanics (`brain init --providers`, `brain link`, the migration inside `brain upgrade`); this reference is the judgment behind the provider choice you make in SKILL.md Step 1.

## The single idea

The skill suite and the root instruction file live **once**, in a canonical place, and each chosen tool is **symlinked into it** — so you maintain one copy and every tool sees the same thing.

- **Skills** → canonical **`.agents/skills/`**. Real `SKILL.md` files live here; each skill-capable provider gets `<provider>/skills → ../.agents/skills`.
- **Router** → canonical root **`AGENTS.md`**. ~20 tools read it natively (nothing to create). The one holdout, Claude, gets `CLAUDE.md → AGENTS.md`.

Why `.agents/` is canonical: it is tool-neutral, it is where the ecosystem is converging (the `AGENTS.md` standard, `~/.agents/skills`), and a symlink-in means a `brain upgrade` updates the suite for every tool at once.

## Two kinds of provider

Only four tools read the shared `SKILL.md` format. Everyone else has **no skills concept** and is served entirely by the root `AGENTS.md`.

| Layer | Providers (ids) | What gets wired |
|---|---|---|
| **Skills-capable** | `claude`, `opencode`, `qwen`, `zed`* | `<provider>/skills` symlink **+** router |
| **Router-only** | `codex`, `cursor`, `copilot`, `gemini`, `windsurf`, `cline`, `roo`, `kilo`, `amp`, `augment`, `continue` | nothing to create — they read `AGENTS.md` natively |

\* `zed` is wired router-only for now — it has a `SKILL.md` concept but its project skills path is unconfirmed.

**Consequence to tell the user:** picking `cursor` or `codex` does **not** create a `.cursor/skills` / `.codex/skills` dir (those tools would ignore it). They get the brain workflow through `AGENTS.md`. Skills only physically symlink into skill-capable tools.

The only mandatory root-file symlink is `CLAUDE.md → AGENTS.md` (Claude ignores `AGENTS.md`). Gemini/Qwen read `AGENTS.md` natively, so no `GEMINI.md`/`QWEN.md` symlink is made.

## Choosing in Step 1

`brain scan` emits a `provider` line per detected tool (`skills-capable` / `router-only`) and a `canonical-skills` line.

- **Providers detected** → recommend wiring **all** of them; pass their ids to `--providers`.
- **None detected** → ask which tools the user uses. Common answers: `claude`, `codex`, `cursor`, `copilot`, `gemini`, `windsurf`. Default to `claude` if unsure.
- **`canonical-skills … absent` but `brain/` exists** → a legacy (pre-`.agents/`) install; `brain upgrade` migrates it (see SKILL.md Step 2).

`brain link --providers <ids>` is additive — run it any time to wire more tools later; already-wired providers stay `up-to-date`.

## Conflicts

The CLI never clobbers. A real directory/file where a symlink belongs (e.g. a hand-made `.claude/skills` dir, or a `CLAUDE.md` with its own content next to a real `AGENTS.md`) is reported as a `conflict` and skipped. Resolve it with the user — reconcile the content into the canonical file/dir — then re-run with `--force`.
