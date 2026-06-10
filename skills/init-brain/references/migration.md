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
| Persistent implementation drift | `brain/tech-debt/<domain>/<spec>.md` |
| Immutable human sources (meetings, external refs, assets) | `brain/raw/{meetings,external,assets}/` |

Do not move anything until the user approves the mapping. This content was not authored by you and the next steps delete the originals — confirm explicitly.

## 3. Scaffold + install via the CLI

```bash
$BRAIN init
```

Additive: existing files are kept (reported as `kept`/`adopted`), so a populated brain is never overwritten. Pre-existing hand-installed suite skills are **adopted** into the manifest; after the migration is done, offer the user `$BRAIN upgrade` to sync them to the bundled versions (conflicts are skipped unless `--force`).

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

## 6. Update brain/index.md

Reflect the migrated reality: list migrated domains (with their spec maps), specs per domain, and any tech-debt pages. Append a migration entry to `brain/log.md`.

## 7. Delete old sources — only after verification

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

## 8. Continue

Return to `SKILL.md` Step 3 (advisors).
