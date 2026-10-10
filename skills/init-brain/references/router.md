# Root router

Make the repo-root `AGENTS.md` the one router every tool reads, with `CLAUDE.md → AGENTS.md` for Claude, and make sure it carries what the flows need: the project's gates and a pointer to `brain/`. **`AGENTS.md` is canonical whenever it exists.**

## 1. State: what `brain link` does

`$BRAIN scan` reports a `router` line per file with its state:

| State | `brain link` action | Your part |
|---|---|---|
| `none` (neither file) | creates the `AGENTS.md` stub | fill it (§3, class `stub`) |
| `claude-only` (a real `CLAUDE.md`, alone or with `AGENTS.md` as a symlink to it) | promotes it to `AGENTS.md`, then links `CLAUDE.md → AGENTS.md` | judge the promoted file (§2) |
| `agents-only` | keeps it; links `CLAUDE.md → AGENTS.md` | judge it (§2) |
| `linked` (`CLAUDE.md` already a symlink to `AGENTS.md`) | nothing | judge it (§2) |
| `identical` (both real, same content) | replaces `CLAUDE.md` with the symlink — nothing is lost | judge it (§2) |
| `divergent` (both real, different content) | **conflict**, even with `--force` | reconcile (§4), then `$BRAIN link` |

## 2. Pertinence: classify the canonical candidate

The `router` line summarizes the signals: `gates: …` (build/test/lint/typecheck commands, cross-checked against `package.json` scripts), `brain pointer`, `workflow section`, `review on-request|mandatory`, `skill routing`, `personas`, `tech-debt path`, `review path`, `stub`. Read the file itself, then classify it:

| Class | Meaning | What to do |
|---|---|---|
| `stub` | empty, or our own stub | Fill the gates from the project (`package.json` scripts, CI config, Makefile); ask the user when unknown. Add the brain section (§5). |
| `foreign` | written for another tool or purpose; no gates, no workflow | Keep it. Add the brain section and the gates. Merge any `CLAUDE.md` content in (§4). |
| `partial` | has gates or conventions but no brain pointer, or has a hand-written process that overlaps the brain flows | Add the brain section. Flag each overlapping process section and propose replacing it with a pointer to the skill or config key that now owns it (§3). |
| `complete` | gates + brain pointer + no conflicting process | Nothing to do. |

## 3. Overlapping process sections

A hand-written workflow ("Step 1 … Step 8", a review policy, where specs or reviews live) duplicates what the skills and the config now own, and drifts from them. For each overlapping section, propose a replacement and let the user decide, section by section:

| The router says | Now owned by | Replace with |
|---|---|---|
| the spec → plan → implement → ingest steps | the suite skills | one line: "Feature work runs `create-spec` → `create-plan` → `implement-spec` → `docs-maintenance`." |
| when review runs ("optional, only on request", "mandatory") | `review.mode` | "Review policy: `review.mode` in `brain/brain.config.json`." |
| where reviews / tech debt / personas live | `paths.*`, `review.location` | "Paths: `brain/brain.config.json`." |
| project facts (gates, conventions, critical paths, stack rules, PR base) | the router itself | keep them: this is their home |

Never delete a section without the user's yes. Facts stay; only process that a skill or the config now owns becomes a pointer.

**The analysis seeds the config** (references/project-context.md): a stated review policy suggests `review.mode`; stated tech-debt or review paths corroborate `paths.techDebt` and `review.location`; a personas section feeds `paths.personas` (extract it, do not leave personas only in the router).

## 4. Reconcile a divergent `CLAUDE.md`

The scan's `router` line for `CLAUDE.md` lists the headings only it has (`only here: …`) and a similarity ratio.

1. Read both files in full.
2. Build the merged `AGENTS.md`: keep `AGENTS.md` as it is, and add each section only `CLAUDE.md` has, verbatim, where it fits. Where both cover the same ground, keep the `AGENTS.md` wording, and carry over any fact only `CLAUDE.md` states (a gate command, a critical path) into that section.
3. Show the user the merge as a diff against the current `AGENTS.md` and confirm it.
4. Write the merged text to `AGENTS.md`, then make `CLAUDE.md` identical to it (nothing is lost: every line now lives in `AGENTS.md`).
5. Run `$BRAIN link` (or `$BRAIN link --providers <ids>`): the two files are `identical`, so `CLAUDE.md` becomes the symlink without `--force`.

There is no backup-and-link path, and `--force` never discards a differing `CLAUDE.md`.

## 5. The brain section

Add it once, under a "Knowledge base" or "Repo map" heading, adapted to the router's language:

```md
## Knowledge base and workflow

The knowledge base and the spec-driven skill suite live under `brain/`; read `brain/AGENTS.md` before touching it. Feature work runs `create-spec` → `create-plan` → `implement-spec` → `docs-maintenance`; UI exploration runs `prototype` (explicit invocation only). The review policy and the project's paths live in `brain/brain.config.json`.
```

Edit **`AGENTS.md` only** once `CLAUDE.md` is a symlink — never hand-edit the holdout files.
