# Install / Upsert Skills

Install the brain-flow skills from `$SKILL_DIR/assets/skills/` into the target skills directory. Idempotent: safe to re-run.

Two groups:

- **Seven process skills:** `create-spec`, `create-plan`, `grill-me`, `tdd`, `swarm-plan`, `implement-spec`, `docs-maintenance`.
- **One tool skill:** `agent-browser` — the browser-driving validation tool that `create-plan` and `implement-spec` name for `review_mode` `browser`/`mixed`. Always installed so the suite is self-contained; referenced only conditionally, so a backend-only project simply never invokes it.

## 1. Resolve the target skills directory

```bash
if [ -d ./.agents/skills ]; then SKILLS_DIR=./.agents/skills
elif [ -d ./.claude/skills ]; then SKILLS_DIR=./.claude/skills
else SKILLS_DIR=./.claude/skills; mkdir -p "$SKILLS_DIR"; fi
echo "installing into $SKILLS_DIR"
```

State the chosen directory to the user.

## 2. Upsert each skill

For each of the seven **process skills**:

- **Absent** → copy it in:
  ```bash
  cp -R "$SKILL_DIR/assets/skills/<skill>" "$SKILLS_DIR/<skill>"
  ```
- **Present** → update it to the generic, brain-wired version, but **preserve hand-curated advisor entries**:
  1. If the existing `SKILL.md` has a populated `## Project Advisors` block (content between the `init-brain:advisors` markers that is **not** the placeholder), copy that block aside.
  2. Replace the skill folder with the bundled version (`cp -R`, overwriting `SKILL.md`, `references/`, `assets/`).
  3. Restore the preserved advisors block between the markers (Step 5 / advisor-detection will otherwise repopulate it).
  4. If the existing skill had local customizations outside our managed files, note them in the report rather than silently dropping them — back them up to `<skill>.bak-<date>/` if non-trivial.

Then the **agent-browser tool skill** (no advisor block, so a plain copy):

- **Absent** → `cp -R "$SKILL_DIR/assets/skills/agent-browser" "$SKILLS_DIR/agent-browser"`.
- **Present** → the project may already carry a richer, project-specific `agent-browser` (e.g. with real OAuth profile paths). Do **not** clobber it: if the existing `SKILL.md` differs from the bundled one, leave it as-is and note in the report that the project's own copy was kept. Only refresh it on explicit user request.

Rely on git as the safety net when the repo is a git repo (the diff is reviewable); mention that in the report.

## 3. Dependencies to be aware of

These skills reference each other and a couple of externals:

- `create-plan` requires `$grill-me`, `$swarm-plan`, `$tdd` — all installed here.
- `implement-spec` requires `$tdd`, `$simplify`. `docs-maintenance`, `create-plan`, `implement-spec` reference `$simplify`.
- `create-plan` and `implement-spec` reference `$agent-browser` for `browser`/`mixed` `review_mode` tasks — bundled here, so the reference resolves. The skill ships docs only; the underlying CLI is a **separate, global install** (`npm i -g agent-browser`). It is needed only when a project actually runs browser validation, so do not block install on it — note its presence/absence in the report.
- `$simplify` is expected to be available as a **global / built-in** Claude Code skill, not bundled. If the project relies on a local `simplify`, leave it as-is; otherwise the built-in covers it. Note this in the report.

## 4. Keep the convention consistent

If the project already keeps skills in `.agents/skills/`, install there (do not split the suite across `.agents/skills` and `.claude/skills`). If you created `.claude/skills/` fresh, that becomes the home for the suite.

## 5. Continue

Return to `SKILL.md` Step 5 ([advisor-detection.md](advisor-detection.md)).
