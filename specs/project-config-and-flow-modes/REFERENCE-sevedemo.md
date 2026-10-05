---
domain: compat
type: reference
links:
  - "[[specs/project-config-and-flow-modes/SPEC]]"
  - "[[specs/project-config-and-flow-modes/PLAN]]"
created: 2026-10-05
updated: 2026-10-05
---

# Reference project: sevedemo vs brain-manager 0.6.0

The evidence behind [SPEC.md](SPEC.md). A file-by-file comparison of the suite as it lives in a real, long-running brain project against the bundled 0.6.0 assets, done on 2026-10-05.

## The reference project

- **Repo:** [`omardeangelis/sevedemo`](https://github.com/omardeangelis/sevedemo) (product name Motorno / SeVedemo). Solid 1.9 + Vite 7 + Tailwind 4 + Kobalte SPA, organized by DDD.
- **Brain usage:** adopted the brain workflow in June 2026 and has used it daily since: dozens of specs, 19 adversarial-review folders, each with `RUBRIC.md` + `REPORT.md` (15 reports already ingested into `tech-debt/`), and domain pages ingested by `docs-maintenance`.
- **Layout:** pre-CLI, hand-installed. Skills live as real files in `.claude/skills/`, agents in `.claude/agents/`. There is no `.agents/`, no root `AGENTS.md` (only `CLAUDE.md`), and no `brain/.brain-manifest.json`.
- **Already aligned:** `design-engineering`, `prototype` and the `design-engineer` agent were made byte-identical to 0.6.0 on 2026-10-04, on the sevedemo branch `chore/brain-manager-design-skills`.
  - The Solid adaptations moved to `brain/chore/motion-stack.md`, the stack profile written by the skill's `stack-adaptation.md`.
  - The project decisions moved to `brain/chore/motion.md`.
  - That alignment is the pattern this spec generalizes: **the package copy stays identical, and project specifics live in project-owned files the skills read.**

## How to regenerate the comparison

```bash
PKG=$(npm root -g)/brain-manager/assets   # or the npx cache path of 0.6.0
cd <sevedemo checkout>
for s in adversarial-review create-plan create-spec docs-maintenance implement-spec grill-me swarm-plan tdd agent-browser; do
  diff -rq "$PKG/skills/$s" ".claude/skills/$s"
done
diff -u "$PKG/agents/review-classifier.md" .claude/agents/review-classifier-router.md
diff -u "$PKG/agents/ux-advisor.md"        .claude/agents/ux-flow-strategist.md
diff -u "$PKG/agents/adversarial-verifier.md" .claude/agents/adversarial-verifier.md
diff -u "$PKG/brain/AGENTS.md" brain/AGENTS.md
```

The project copies differ from **0.5.0 in exactly the same way**: between 0.5.0 and 0.6.0 only the design-engineering parts changed. So the divergence is not version lag. Both sides evolved from the same June 2026 source:

- the package became stack-agnostic;
- the project added features of its own, some as deliberate decisions.

## Inventory

| Status | Items |
|---|---|
| Identical to 0.6.0 | `agent-browser`, `grill-me`, `swarm-plan`, `tdd` (and, after 2026-10-04, `design-engineering`, `prototype`, `design-engineer`) |
| Diverged | `adversarial-review` (all 10 files), `create-spec` (3), `create-plan` (2), `implement-spec` (3), `docs-maintenance` (3, plus 1 project-only file); the 3 other agents; `brain/AGENTS.md` / `brain/CLAUDE.md` |
| Project-only, outside the suite | `best-practices`, `brand-guidelines`, `frontend-design`, `linear-user-story`, `posthog-tracking`, `write-hook` (untouched by brain-manager; listed so the installer keeps ignoring them) |
| Renamed agents | `review-classifier-router` ↔ `review-classifier`, `ux-flow-strategist` ↔ `ux-advisor` |

## A — What the package does better (the project would gain)

1. **Clean-context gates on spec and plan.**
   - `create-spec` step 10 runs `adversarial-verifier` against the spec quality bar.
   - `create-plan` step 13 runs it against the plan.
   - The project has neither gate.
2. **`prototype` is part of the flow.**
   - `create-spec` step 9 suggests `/prototype` when a visual direction is open, and inherits the winner's values.
   - `implement-spec` deletes the prototype surface at finalization (prototype Hard Rule 5).
   - In the project, `prototype` is installed but nothing calls it or cleans up after it.
3. **`design-engineer` is wired in by default.**
   - It is a shipped step in `create-plan`.
   - It runs pre-task in `implement-spec`, pointing to `implementation.md` / `accessibility.md`.
   - It gets a motion-craft brief in `adversarial-review/references/verification-phase.md`.
4. **A stronger `adversarial-verifier`.**
   - It has `Bash` for read-only gate runs.
   - It uses a generic security checklist.
   - It takes an explicit acceptance contract (`SPEC.md` + `FLOW.md`), where an unmet criterion counts as at least MAJOR.
   - It reads `tech-debt/` so it does not penalize tracked drift.
5. **A stronger `review-classifier`.**
   - It runs on `opus` instead of `haiku`.
   - Data migrations are a risk surface.
   - Every touched risk surface gets its own pass.
6. **Brain Schema.** It has a "Spec-Driven Rules" section, plus an "Advisor subagents" section with an inline fallback for tools that have no subagent runtime.
7. **Explicit `brain/tech-debt/` paths.** The project's skills say `tech-debt/<domain>/<spec>.md`, which is ambiguous: the store actually lives at `brain/tech-debt/`.

## B — Where the project is ahead, or decided differently (conflicts)

1. **Review is opt-in.**
   - In 2026-09-22 (commit `0b900f63`, "adversarial-review solo su richiesta") the project made `adversarial-review` run only on explicit request.
   - The project's root `CLAUDE.md` (Step 7) still states that rule.
   - The 0.6.0 `implement-spec` makes it a mandatory gate before finalization.
   - → **review modes** (SPEC §3).
2. **Review location.**
   - The project writes case-B reviews to `brain/review/<domain>/<spec>/`, mirroring the spec path. All 19 reports and every `index.md` / `log.md` link use `[[review/...]]`.
   - 0.6.0 writes them **inside** the spec folder.
   - Adopting 0.6.0 as-is splits the history across two layouts.
   - → **detected review location** (SPEC §6).
3. **Review ingest is missing upstream (bug).**
   - The 0.6.0 `adversarial-review` says `docs-maintenance` ingests `REPORT.md` and folds durable findings into `tech-debt/`. The 0.6.0 `docs-maintenance` has no such path.
   - The project has it: `docs-maintenance/references/review-ingest.md` (79 lines), a `## Secondary: Review Ingest` section, a Step 2 that reads the sibling `REPORT.md`, and a log line.
   - With 0.6.0, reports are never ingested.
   - → **port it** (SPEC §6).
4. **`FLOW.md` is used more.** The project reads it in:
   - `docs-maintenance` Step 2 (as the primary flow source);
   - `create-plan/references/planner-phase.md` (error paths become tasks, friction notes become ordering);
   - `implement-spec/references/lifecycle.md` (reading order, and an acceptance-audit check that error paths and edge cases are handled);
   - `parallel-worker-brief.md` (the FLOW slice per worker).

   0.6.0 covers only part of this. → **port it** (SPEC §6).
5. **Agent memory.**
   - The project's three agents declare `memory: project`. There are 211 files under `.claude/agent-memory/adversarial-verifier/`, 23 under `ux-flow-strategist/` and 9 under `review-classifier-router/`.
   - The shipped agents declare no memory, so those files would be orphaned.
   - The `design-engineer` memory, 10 files, was already folded into `brain/chore/motion.md`.
6. **Personas.**
   - The four personas (Freelance, Recruiter, Small business, Potential freelancer) are written **inside** `ux-flow-strategist.md` (`## The four SeVedemo personas`).
   - No brain page holds them.
   - `ux-advisor` reads personas from `brain/domains/`, finds none, and falls back to generic axes.
   - → **personas detection** (SPEC §1).
7. **Root `AGENTS.md`.**
   - Every shipped agent reads the project's gates, conventions and risk surface from the root `AGENTS.md`. The project has only `CLAUDE.md`, which holds all of that, including Solid reactivity rules, the CI gate order, the `staging` PR base and `src/api/client.ts` as a critical path.
   - Without the router, the shipped agents run blind; the project copies hardcode those facts instead.
   - The project also has `brain/specs/CONSTITUTION.md`. The suite does not read it; it is a candidate to fold into `AGENTS.md`.
   - → **router detection** (SPEC §5).
8. **Agent renames ripple.**
   - The 0.6.0 skills call `ux-advisor` / `review-classifier`. With the project's agents installed, `create-spec` would silently skip the UX step, because "skip if the agent is absent".
   - The old names appear in `CLAUDE.md`, the Brain Schema, dozens of specs ("FLOW by `ux-flow-strategist`") and in the `## Project Advisors` blocks.
   - `ux-flow-strategist` is wired there as an *additional* advisor, but it is really the legacy twin of a shipped one.
   - → **legacy aliases** (SPEC §6).
9. **Stack facts hardcoded.** The project's skills embed:
   - the `staging` base branch;
   - `src/domains/<domain>/...`;
   - the Solid rules;
   - `haiku` / `sonnet` / `opus` model ids.

   0.6.0 reads these at runtime from the router and `brain/`, which is correct. The project only needs the router (B7) to stop depending on the hardcoding.

## What standardization means for this project

Success means re-running the installer on sevedemo leaves **every suite skill and shipped agent byte-identical to the package**, with every project fact living in a project-owned file:

| Project fact | Where it should live |
|---|---|
| Review only on request | `brain/brain.config.json` → `review.mode: "none"` |
| Reviews under `brain/review/<domain>/<spec>/` | `brain/brain.config.json` → `review.location: "review-tree"` |
| Tech debt at `brain/tech-debt/` | `brain/brain.config.json` → `paths.techDebt` |
| The four personas | `brain/personas.md` (extracted from `ux-flow-strategist.md`), referenced by `paths.personas` |
| Gates, Solid rules, critical paths, PR base | root `AGENTS.md` (promoted from `CLAUDE.md`; `CLAUDE.md → AGENTS.md`) |
| Motion stack + decisions | `brain/chore/motion-stack.md`, `brain/chore/motion.md` (already done) |
| Durable agent memories | folded into the pages above, or left with the renamed agent (SPEC open question) |
