# Migration

Absorb a prior knowledge/docs structure into `brain/`, repoint skills, and retire the old sources. Migration is partly destructive — **inventory and confirm before moving or deleting.**

## 1. Discover the prior structure

Search the repo (skip `node_modules`, `.venv`, `dist`, `build`, `.git`) for legacy stores. Candidates:

- Knowledge/docs: `docs/`, `wiki/`, `.notes/`, `knowledge/`, `adr/`, `rfcs/`, `decisions/`, loose `*.md` design notes.
- Specs: an existing `specs/` tree, scattered `*-spec.md` / `SPEC.md` outside `brain/`.
- Planning/chore: `planning/`, `roadmap*`, `tech-stack*`, `backlog*`, `mvp*`.
- Tech debt: `tech-debt*`, `TODO*`, `KNOWN-ISSUES*`.
- Existing skill copies that reference legacy paths: grep installed skills for the legacy roots you found (e.g. `docs/`, `wiki/`).

```bash
grep -rIl --exclude-dir={node_modules,.venv,.git,dist,build} -E "" docs wiki .notes knowledge specs 2>/dev/null | head
```

## 2. Build an inventory + mapping, then CONFIRM

Present the user a table: each discovered source → its proposed destination in `brain/`. Default mapping:

| Source kind | Destination |
|---|---|
| Synthesized domain knowledge (concepts, flows, decisions, contracts) | `brain/domains/<domain>/...` |
| Feature specs / requirements | `brain/specs/<domain>/<spec>/SPEC.md` |
| Informal planning (tech stack, product desc, user stories, backlog) | `brain/chore/` |
| Persistent implementation drift | `brain/tech-debt/<domain>/<spec>.md` |
| Immutable human sources (meetings, external refs, assets) | `brain/raw/{meetings,external,assets}/` |

Do not move anything until the user approves the mapping. This content was not authored by you and the next steps delete the originals — confirm explicitly.

## 3. Scaffold brain (if absent)

If `brain/` does not exist yet, run [fresh-init.md](fresh-init.md) steps 2–3 first so the destination layout and root pages exist. Do **not** overwrite an existing populated brain.

## 4. Move content (preserve history)

For each approved mapping, move the file into place. Prefer `git mv` so history follows:

```bash
git mv <old-path> brain/<dest-path>   # falls back to: mkdir -p + mv if not tracked
```

While moving:
- Add/normalize frontmatter to match `brain/AGENTS.md` (domain, type, links, created/updated; `status` for specs; `ingested`/`last_ingested` for domain pages). When unknown, set `ingested: false`, `last_ingested: null`.
- Keep `[[wikilinks]]` working — fix paths that break after the move.
- Do **not** rewrite the substance of specs/domain knowledge; this is a move, not a rewrite.

## 5. Repoint existing skills

Any skill already installed in the repo that references the legacy roots (`docs/`, `wiki/`, etc.) must point at `brain/` instead:

- The seven managed process skills are replaced wholesale in Step 4 of `SKILL.md` (install-skills) with brain-wired generic versions — no manual repoint needed. The agent-browser tool skill is installed alongside them (an existing project-specific copy is kept, not clobbered).
- For **other** skills the project owns that reference the old paths, update those references to the new `brain/...` locations. Grep for the legacy roots inside the skills directory and fix each hit.

## 6. Install the skill suite

Return to `SKILL.md` Step 4 → [install-skills.md](install-skills.md), then Step 5 advisors.

## 7. Update brain/index.md

Reflect the migrated reality: list migrated domains (with their spec maps), specs per domain, and any tech-debt pages. Append a migration entry to `brain/log.md`.

## 8. Delete old sources — only after verification

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
