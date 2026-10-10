# Migration

Absorb a prior knowledge/docs structure into `brain/`, repoint skills, and retire the old sources. Migration is partly destructive — **inventory and confirm before moving or deleting.** Assumes `$BRAIN` is resolved (SKILL.md Step 0) and `$BRAIN scan` has run.

## 1. Refine the discovery

`$BRAIN scan` already lists `legacy-store`, `loose-spec`, and `installed-skill` findings. Read into the flagged locations and classify what each actually holds:

- Knowledge/docs: `docs/`, `wiki/`, `.notes/`, `knowledge/`, `adr/`, `rfcs/`, `decisions/`, loose `*.md` design notes.
- Specs: an existing `specs/` tree, scattered `*-spec.md` / `SPEC.md` outside `brain/`.
- Planning/chore: `planning/`, `roadmap*`, `tech-stack*`, `backlog*`, `mvp*`.
- Tech debt: `tech-debt*`, `TODO*`, `KNOWN-ISSUES*`.
- Project-owned skills that reference legacy paths: grep the skills directory for the legacy roots you found.

## 2. Build an inventory + mapping, then CONFIRM

Present the user a table: each discovered source → its proposed destination in `brain/`. Default mapping:

| Source kind | Destination |
|---|---|
| Synthesized domain knowledge (concepts, flows, decisions, contracts) | `brain/domains/<domain>/...` |
| Feature specs / requirements | `brain/specs/<domain>/<spec>/SPEC.md` |
| Informal planning (tech stack, product desc, user stories, backlog) | `brain/chore/` |
| Persistent implementation drift | `<techDebt>/<domain>/<spec>.md` (`paths.techDebt`, default `brain/tech-debt`; see [project-context.md](project-context.md) §2) |
| Immutable human sources (meetings, external refs, assets) | `brain/raw/{meetings,external,assets}/` |

Do not move anything until the user approves the mapping. This content was not authored by you and the next steps delete the originals — confirm explicitly.

## 3. Scaffold + install via the CLI

```bash
$BRAIN init --providers <ids> --review-mode <m>   # plus the project-context flags decided in Step 1b
```

Additive: existing files are kept (reported as `kept`/`adopted`), so a populated brain is never overwritten. Pre-existing hand-installed suite skills are **adopted** into the manifest; after the migration is done, offer the user `$BRAIN upgrade` to sync them to the bundled versions (conflicts are skipped unless `--force`).

**A pre-CLI install** (scan: `brain/ — present, no manifest`, with the suite as real files under a provider dir such as `.claude/skills`) is adopted in place first, then moved to the canonical layout:

```bash
$BRAIN init --skills-dir .claude/skills --review-mode <m>   # adopts the hand-installed copies, writes the manifest and the config
$BRAIN upgrade                                              # moves them to .agents/skills, links .claude/skills back, promotes CLAUDE.md
```

`upgrade` leaves a real `.claude/agents` dir in place as a `conflict`: handle it with "Legacy agents dir" below.

## 4. Move content (preserve history)

For each approved mapping, move the file into place. Prefer `git mv` so history follows:

```bash
git mv <old-path> brain/<dest-path>   # falls back to: mkdir -p + mv if not tracked
```

While moving:
- Add/normalize frontmatter to match `brain/AGENTS.md` (domain, type, links, created/updated; `status` for specs; `ingested`/`last_ingested` for domain pages). When unknown, set `ingested: false`, `last_ingested: null`.
- Keep `[[wikilinks]]` working — fix paths that break after the move.
- Do **not** rewrite the substance of specs/domain knowledge; this is a move, not a rewrite.

## 5. Repoint project-owned skills

The suite skills are handled by the CLI (`init`/`upgrade`). For **other** skills the project owns that reference the old paths, update those references to the new `brain/...` locations. Grep for the legacy roots inside the skills directory and fix each hit.

## 6. Legacy agents dir

A pre-CLI install keeps its agents as real files in `.claude/agents/`, where the canonical layout wants a symlink to `.agents/agents/` (the shipped four are already installed there). Sort every file in it, with the user:

| The file is | Action |
|---|---|
| a shipped agent, identical to `.agents/agents/<name>.md` | delete it |
| a shipped agent with local edits | show the diff. Route its project facts first (personas → [project-context.md](project-context.md), risk surfaces and conventions → [router.md](router.md)); then delete it: the shipped copy wins, and the facts now live in project files it reads |
| a legacy twin ([advisor-detection.md](advisor-detection.md) alias table) | route its facts, then replace it per advisor-detection |
| a project-only agent | `git mv` it into `.agents/agents/` |

When the dir is empty, link it: `$BRAIN link --providers <ids> --force` (only an empty dir is replaced, so nothing is lost). Then `$BRAIN upgrade --force` syncs the adopted suite files to the bundled versions, once the user has agreed that the project facts now live in the config, the router and `brain/`.

**Leftover files.** A hand-installed suite often carries files the package does not ship (an older reference renamed since, a project addition). `upgrade` never deletes them, and `$BRAIN doctor` lists each one as `untracked`. Show them to the user: a project fact goes to the config or a `brain/` page first (the stack's motion notes to `brain/chore/motion-stack.md` or `motion.md`), then the file is deleted. The suite skills end byte-identical to the package.

## 7. Agent memory

Agents with `memory: project` (Claude Code) keep notes under `.claude/agent-memory/<agent>/`. Shipped agents keep or drop memory by role:

- **`adversarial-verifier`, `review-classifier`:** keep `memory: project`. Their notes are lessons about how to check, and they keep accruing.
  - Leave `.claude/agent-memory/adversarial-verifier/` untouched.
  - When the user replaces the legacy `review-classifier-router` twin, rename its folder to the shipped name: `git mv .claude/agent-memory/review-classifier-router .claude/agent-memory/review-classifier` (merge by hand if both exist).
- **`ux-advisor`, `design-engineer`:** no memory. Fold durable notes into brain pages the user can review, show them first, then retire the old folder with confirmation:
  - personas → `brain/personas.md`;
  - risk surfaces and conventions → the root `AGENTS.md`;
  - motion decisions → `brain/chore/motion.md`;
  - component mechanics a UX twin learned (a primitive that swallows keys, a checkbox that toggles twice) → the **Component traps** part of `brain/chore/ux-review.md`; findings the project rejected → its **Suppressed findings**.

Skip notes that only restate code, file paths or history: they are not durable knowledge.

## 8. Update brain/index.md

Reflect the migrated reality: list migrated domains (with their spec maps), specs per domain, and any tech-debt pages. Append a migration entry to `brain/log.md`.

## 9. Delete old sources — only after verification

Before deleting anything, prove the content is now in `brain/`:

```bash
# example sanity check per moved tree
diff <(cd <old-root> && find . -type f | sort) <(cd brain/<dest-root> && find . -type f | sort) || true
```

Then, with the user's confirmation, remove the now-empty legacy roots:

```bash
git rm -r <old-root>     # or: rm -rf <old-root> if untracked
```

Report exactly what was deleted. If a check fails or anything is ambiguous, stop and surface it rather than deleting.

## 10. Continue

Return to `SKILL.md` Step 3 (advisors).
