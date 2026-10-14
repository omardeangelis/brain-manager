# Project context

Decide where the project's own facts live, so every suite skill and agent reads them from `brain/brain.config.json` instead of being edited to fit. Four facts and one policy: the personas, the tech-debt store, the review location, the review mode, and execution delegation. The CLI only **suggests**, each value with its reason; you decide with the user. Nothing is moved or extracted without confirmation.

## Inputs

`$BRAIN scan` (Step 1) already reported them:

- `persona-source`, `tech-debt-store`, `review-store` and `router` lines;
- `config:` notes: the suggested value of every key with its reason, or, when a config exists, where it disagrees with detection.

`$BRAIN scan --json` carries the full structures under `context` (`personas`, `techDebt`, `review`, `router`, `suggestedConfig`, `suggestions`).

## 1. Personas → `paths.personas`

| Finding | Action |
|---|---|
| One dedicated persona file (`kind: file`) | `paths.personas` = that file, verbatim. Do not move or rewrite it. |
| Personas only as a section (`kind: section`) inside an agent, the router, or a constitution | Extract them **verbatim** into `brain/personas.md` after showing the user the extraction (below). Set `paths.personas`, link the page from `brain/index.md` (Chore section), and log it. The original section stays until the user retires the agent or file that held it. |
| Several conflicting sources | Ask which one is canonical, then apply the matching row. |
| None | Leave `null`. Tell the user that `ux-advisor` will characterize users generically and record "who are the users?" as an open question, and offer to create `brain/personas.md` with them now. |

**Extraction.** Copy each persona under its own `##` heading, text unchanged, into:

```md
---
domain: _root
type: personas
links: ["[[index]]"]
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# Personas

Extracted verbatim from `<source path>` § "<heading>" on YYYY-MM-DD. The suite reads this page through `paths.personas` in `brain/brain.config.json`.

## <Persona 1>
<text as in the source>
```

Drop only instructions addressed to the old agent ("your primary lens", "always ask yourself…"): they are not facts about people. Show the user the result before writing it.

## 2. Tech-debt store → `paths.techDebt`

| Finding | Action |
|---|---|
| One directory store | `paths.techDebt` = it, even when it is not `brain/tech-debt`. |
| Pages directly in the directory (`flat`), not `<domain>/<spec>.md` | Keep the directory. Offer to move each page to `<domain>/<spec>.md`, with confirmation. Pages you cannot attribute stay where they are. |
| A single file (`single-file`, e.g. `TECH-DEBT.md`) | Propose migrating it: one page per spec at `<techDebt>/<domain>/<spec>.md` (default `brain/tech-debt`), each entry under the spec it belongs to, entries with no spec under `_unscoped/<topic>.md`. Show the mapping, confirm, then move the content (verbatim) and delete the old file only after checking every entry arrived. |
| None | `brain/tech-debt`. |

## 3. Review location → `review.location` (and `paths.reviews`)

| Finding | Action |
|---|---|
| `review-store` is `review-tree`: reports at `<dir>/<domain>/<spec>/REPORT.md` mirroring existing specs | `review.location: review-tree`, `paths.reviews` = that dir. |
| Reports inside spec folders | `review.location: spec-folder`. |
| Both layouts | Ask which one is canonical. Do not move existing reports unless the user asks; the config decides where new ones land. |
| None | `spec-folder` (default) and `brain/review`. |

Corroborate with the router: a router that names a review or tech-debt path is evidence for the same values (`router` line → `review path`, `tech-debt path`).

## 4. Review mode → `review.mode`

The user chose it in Step 1 (recommended value: the scan's suggestion, which comes from a review policy the root router states). The matrix of what each mode runs is in `brain/AGENTS.md` → Project configuration → Review modes; show it when the user hesitates.

## 5. Execution delegation → `execution.delegation`

Nothing to detect: the default is `supervised` — `implement-spec` hands each task to a worker on the model tier its `complexity` names and reviews it (`brain/AGENTS.md` → Project configuration → Execution delegation). Put it in the table with that one-line explanation and keep the default. Recommend `inline` only when the user asks for single-model execution or the project's AI tools cannot spawn subagents.

## 6. Show, confirm, record

Show one table — key, value, reason — and confirm it with the user. Then record it:

- **Fresh init (Step 2):** pass the values as flags:

  ```bash
  $BRAIN init --providers <ids> --review-mode <m> [--delegation inline] [--review-location <l>] [--tech-debt-dir <dir>] [--personas <file>]
  ```

  Pass `--personas` only for a file that already exists. For an extraction, run `init` without it, write `brain/personas.md`, then set the key (below).
- **An existing brain** (`brain upgrade` wrote the config, or `init` already ran): one call per decision, for example:

  ```bash
  $BRAIN config set review.mode none
  $BRAIN config set paths.personas brain/personas.md
  ```

Finish with `$BRAIN config get` and relay the resolved values. `$BRAIN doctor` fails while a configured path does not exist, so write `brain/personas.md` before (or right after) pointing the config at it.

## Never do

- Edit an installed skill or agent to encode a project fact. The config, or the file it points to, is the only place.
- Rewrite persona text, or move tech-debt pages, without showing the user first.
- Treat a doc that merely mentions "persona" or "tech debt" as a source: the scan reports candidates, you judge them.
