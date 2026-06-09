# Verify & Report

Final gate. Confirm the install is coherent, then print a concise report.

## 1. Brain scaffold present

```bash
for f in brain/AGENTS.md brain/CLAUDE.md brain/index.md brain/log.md brain/specs/CONSTITUTION.md; do
  [ -f "$f" ] && echo "ok  $f" || echo "MISSING  $f"
done
for d in brain/raw brain/specs brain/domains brain/chore brain/tech-debt; do
  [ -d "$d" ] && echo "ok  $d/" || echo "MISSING  $d/"
done
```

## 2. Skills present

```bash
for s in create-spec create-plan grill-me tdd swarm-plan implement-spec docs-maintenance; do
  [ -f "$SKILLS_DIR/$s/SKILL.md" ] && echo "ok  $s" || echo "MISSING  $s"
done
# tool skill
[ -f "$SKILLS_DIR/agent-browser/SKILL.md" ] && echo "ok  agent-browser" || echo "MISSING  agent-browser"
# underlying CLI is optional (only needed for browser/mixed validation)
command -v agent-browser >/dev/null 2>&1 && echo "ok  agent-browser CLI" || echo "note: agent-browser CLI not installed (npm i -g agent-browser when browser validation is needed)"
```

## 3. No leftover placeholders or stale paths

```bash
grep -rl "__TODAY__" brain 2>/dev/null && echo "WARN: unstamped dates" || echo "dates ok"
# migration only: legacy roots should be gone and not referenced by skills
grep -rIlE "docs/|wiki/|\.notes/" "$SKILLS_DIR" 2>/dev/null && echo "WARN: skills still reference legacy paths" || echo "skills point at brain/ ✅"
```

Also confirm none of the managed skills still carry foreign project tokens (they shipped generic):

```bash
grep -rInE "apps/(api|website|spa)|db-schema-architect|ux-research-advisor|opensrc|write-backlog|create-brain-domain" "$SKILLS_DIR"/{create-spec,create-plan,grill-me,tdd,swarm-plan,implement-spec,docs-maintenance} 2>/dev/null \
  && echo "WARN: residual hardcoded tokens (advisor names are OK only inside the advisors markers)" \
  || echo "skills are generic ✅"
```

> Note: detected advisor names legitimately appear **inside** the `## Project Advisors` markers after Step 5 — that is expected, not a leak.
>
> Note: `$agent-browser` is a bundled suite tool, so its references in `create-plan` / `implement-spec` are expected — it is no longer treated as a foreign token.

## 4. Print the report

Summarize for the user:

- **Mode:** fresh / migration
- **Brain:** created at `brain/` (or merged); root pages stamped `YYYY-MM-DD`
- **Skills:** installed into `<SKILLS_DIR>` — list created vs updated
- **Migration only:** what was moved (source → dest) and what was deleted
- **Advisors:** detected agents and where each was wired (or "none detected")
- **Next step:** run `create-spec` to author the first `SPEC.md`, then `create-plan` → `implement-spec` → `docs-maintenance`. Fill in the `TODO` blocks in `brain/specs/CONSTITUTION.md` with the project's real gates.
