# Verify & Report

Final gate. `$BRAIN doctor` covers the mechanical checks (scaffold present, no `__TODAY__` placeholders, manifest coherent, skill drift); this file covers what the CLI cannot judge, then the report.

## 1. Run doctor

```bash
$BRAIN doctor
```

Must exit 0. `modified` findings are fine **only** if they are deliberate project customizations the user knows about — surface them. `outdated`/`missing` → run `$BRAIN upgrade` and re-check.

## 2. No stale legacy paths or foreign tokens

```bash
# migration only: skills must not reference retired roots
grep -rIlE "docs/|wiki/|\.notes/" "$SKILLS_DIR" 2>/dev/null && echo "WARN: skills still reference legacy paths" || echo "skills point at brain/ ✅"
```

Confirm none of the managed skills carry foreign project tokens (they ship generic):

```bash
grep -rInE "apps/(api|website|spa)|db-schema-architect|ux-research-advisor|opensrc|write-backlog|create-brain-domain" "$SKILLS_DIR"/{create-spec,create-plan,grill-me,tdd,swarm-plan,implement-spec,docs-maintenance} 2>/dev/null \
  && echo "WARN: residual hardcoded tokens (advisor names are OK only inside the advisors markers)" \
  || echo "skills are generic ✅"
```

> Note: detected advisor names legitimately appear **inside** the `## Project Advisors` markers after Step 3 — that is expected, not a leak.
>
> Note: `$agent-browser` is a bundled suite tool, so its references in `create-plan` / `implement-spec` are expected.

The agent-browser CLI is optional (only needed for browser/mixed validation):

```bash
command -v agent-browser >/dev/null 2>&1 && echo "ok  agent-browser CLI" || echo "note: agent-browser CLI not installed (npm i -g agent-browser when browser validation is needed)"
```

## 3. Print the report

Summarize for the user:

- **Mode:** fresh / migration
- **Brain:** created at `brain/` (or merged); root pages stamped `YYYY-MM-DD`
- **Skills:** installed into `<SKILLS_DIR>` — list installed vs adopted vs kept (from the `brain init` report)
- **Migration only:** what was moved (source → dest) and what was deleted
- **Advisors:** detected agents and where each was wired (or "none detected")
- **Maintenance:** future syncs are `$BRAIN upgrade`; health checks are `$BRAIN doctor`
- **Next step:** run `create-spec` to author the first `SPEC.md`, then `create-plan` → `implement-spec` → `docs-maintenance`. Fill in the `TODO` blocks in `brain/specs/CONSTITUTION.md` with the project's real gates.
