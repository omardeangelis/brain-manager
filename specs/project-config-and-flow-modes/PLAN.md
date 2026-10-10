---
domain: compat
type: plan
links:
  - "[[specs/project-config-and-flow-modes/SPEC]]"
  - "[[specs/project-config-and-flow-modes/REFERENCE-sevedemo]]"
  - "[[specs/project-config-and-flow-modes/RESEARCH-ux-advisor]]"
created: 2026-10-05
updated: 2026-10-05
---

# Plan: project-aware install, review modes, prototype-gated UX review, router detection

**Status:** T1–T17 complete. T1–T16 on 2026-10-05; T17 closed on 2026-10-06 after three iterations (0–2). After iteration 1 the maintainer narrowed `ux-advisor` to UX only and changed the recall bar (SPEC Q10). Iteration 2 meets the UX recall bar in all three cases, two of them by a tie, and the maintainer accepted it as it stands, with no iteration 3 (SPEC Q11). The one criterion it misses, "zero runtime claims without evidence", is a known gap. Every decision now lives in the shipped docs (README, Brain Schema, skills, agents); this folder is the record of how they were reached. The spec is `implemented`.
**Branch:** `feat/project-config-and-flow-modes` (this plan is its first commit).
**Spec:** [SPEC.md](SPEC.md) · **Evidence:** [REFERENCE-sevedemo.md](REFERENCE-sevedemo.md), [RESEARCH-ux-advisor.md](RESEARCH-ux-advisor.md)

## Before you start

1. **Read the docs:**
   - [SPEC.md](SPEC.md): the contract;
   - [REFERENCE-sevedemo.md](REFERENCE-sevedemo.md): why;
   - [RESEARCH-ux-advisor.md](RESEARCH-ux-advisor.md): why the UX agent is redesigned, and the benchmark that accepts it;
   - `test/EVAL.md`: the release bar;
   - `README.md` § "How upgrades stay safe".
2. **The SPEC decisions Q1–Q9 are settled** (2026-10-05; SPEC → "Decisions"). Do not reopen them; if one turns out unworkable, stop and ask the maintainer. Each lands in:
   - Q1 → T11;
   - Q2 → T9;
   - Q3, Q8, Q9 → T11b;
   - Q4 → T6;
   - Q5 → T13 (agent frontmatter) and T14 (memory folder migration);
   - Q6 → T8;
   - Q7 → T11b and T12.
3. **Keep the repo conventions.**
   - Pure logic lives in `src/core/*` with a co-located `*.test.ts`.
   - Filesystem effects live in `src/services/*` / `src/commands/*`.
   - Every new CLI behavior gets an integration case in `test/integration.test.ts` or an EVAL row.
4. **Keep reference-project names out of `assets/`.** The EVAL "no foreign tokens" rule applies. Legacy agent names may appear only in the init-brain alias table (`skills/`, not `assets/`).

## Shared phrasing (use verbatim across assets)

- **Config read step:**
  > Read `brain/brain.config.json` (keys in `brain/AGENTS.md` → Project configuration). If it is absent, use the defaults listed there.
- **Gate prefix:**
  > **Gate — `review.mode` ∈ {total}:** … — otherwise offer it in one line and continue.
- **Path tokens:** `<techDebt>`, `<reviews>`, `<personas>`. They mean the resolved `paths.*` values; the Brain Schema defines them once.
- **Router read:**
  > the root `AGENTS.md` (fallback: `CLAUDE.md` when no `AGENTS.md` exists)

## Task graph

```
Wave 1 (core, parallel) ── T1 config ── T2 router analysis ── T3 detection
Wave 2 (CLI)            ── T4 scan (T2,T3) ── T5 init/upgrade/doctor/config (T1,T3) ── T6 link router states (T2)
Wave 3 (assets, SEQUENTIAL — same files) ── T7 → T8 → T9 → T10 → T11 → T11b → T12 → T13
Wave 4 (orchestrator + docs) ── T14 init-brain (T4,T5,T6,T7–T13) ── T15 README/EVAL/version
Wave 5 (validation) ── T16 reference-project dry run (all) ── T17 UX replay benchmark (T11b; reuses T16's worktree technique)
```

Wave 3 tasks edit overlapping files (`create-spec`, `create-plan` and `implement-spec` are touched by four of them), so run them one after another, in order.

## Tasks

### T1 — Config core
- **depends_on:** —
- **location:** `src/core/config.ts` (new), `src/core/config.test.ts` (new), `src/core/manifest.ts`
- **description:**
  - Define the `BrainConfig` Effect Schema exactly as in SPEC "The config file", with `version: 1`.
  - Add `CONFIG_PATH = "brain/brain.config.json"`, `defaultConfig`, `decodeConfig` / `encodeConfig`, and `withDefaults(partial)`.
  - Add `mergeMissing(existing, detected)`: adds only absent keys and never changes a present value.
  - Add `setKey(config, dottedKey, raw)` with per-key validation.
  - Give the config path the `seed` role in `defaultRole`. It already falls under `brain/`; add an explicit test.
- **validation:** Unit tests for:
  - defaults;
  - decoding a partial or older object;
  - `mergeMissing` never overwriting;
  - `setKey` rejecting an unknown key or value with the allowed set in the message;
  - the role is `seed`.
- **tdd_target:** `config.test.ts`
- **review_mode:** code

### T2 — Router analysis core
- **depends_on:** —
- **location:** `src/core/router.ts` (new), `src/core/router.test.ts` (new)
- **description:** Pure functions over `{agentsMd, claudeMd}`, each a `{kind, target?, content?}`.
  - **`routerState`** → `none | claude-only | agents-only | linked | identical | divergent`.
  - **`routerDivergence`** → the headings present only in `CLAUDE.md` and a line-level similarity ratio.
  - **`pertinenceSignals(content, scripts?)`** → `{ isStub, hasGates, gateCommands, hasBrainPointer, hasWorkflow, reviewPolicy: "on-request" | "mandatory" | null, hasSkillRouting, hasPersonas, mentionsTechDebtPath, mentionsReviewPath }`.
  - Gates match against `package.json` script names when they are passed in.
  - `isStub` compares against `ROUTER_STUB`. Move the stub from `linker.ts` to `core/router.ts` and export it.
- **validation:**
  - **One test per state.**
  - **Pertinence fixtures:**
    - our stub;
    - a Cursor-only rules file (`foreign`);
    - a gates-only file;
    - a reference-like `CLAUDE.md` with "Step 7 — Review (optional, only on request)" → `reviewPolicy: on-request`.
- **tdd_target:** `router.test.ts`
- **review_mode:** code

### T3 — Detection core (personas, tech-debt, reviews)
- **depends_on:** —
- **location:** `src/core/detect.ts` (new), `src/core/detect.test.ts` (new)
- **description:** Pure classifiers over file paths plus contents.
  - **`personaCandidates(files)`** → `{path, kind: file | section, heading?}`.
    - Matches a `/personas?/i` filename, frontmatter `type: personas`, or a `/persona/i` heading in agent, router or constitution files.
    - The heading must contain the word "persona". This keeps a body that only mentions "personality" out of the results.
  - **`techDebtStores(entries)`** → `{path, files, layout: per-spec | single-file}`.
  - **`reviewLayout(reportPaths, reviewsDir)`** → `review-tree` when any `REPORT.md` sits at `<reviewsDir>/<domain>/<spec>/REPORT.md` and that `<domain>/<spec>` exists under `brain/specs/`; otherwise `spec-folder`.
  - **`suggestConfig(findings, routerSignals)`** → a partial `BrainConfig` plus `reasons[]` (e.g. "review.mode none — CLAUDE.md states review only on request").
- **validation:**
  - The heading match ignores "personality".
  - Layout guesses are right on fixtures.
  - `suggestConfig` cites a reason for every suggested key.
- **tdd_target:** `detect.test.ts`
- **review_mode:** code

### T4 — `brain scan` reports the new findings
- **depends_on:** T2, T3
- **location:** `src/commands/scan.ts`
- **description:**
  - **Collect inputs:**
    - files under `brain/`, the legacy stores, agent dirs, the root `AGENTS.md` / `CLAUDE.md` and `brain/specs/CONSTITUTION.md` (bounded depth, same IGNORED set);
    - `package.json` scripts;
    - every `REPORT.md` under `brain/`.
  - **Emit lines:**
    - `persona-source`;
    - `tech-debt-store`;
    - `review-store` (layout + count);
    - `router` (state + compact pertinence summary). This replaces the current bare `router` line.
  - **Add a `config:` note:** with no config, the suggested config and its reasons; with a config, any disagreement between it and the detection.
  - **`--json` carries the full structures.**
- **validation:**
  - **Integration case:** a fixture repo with personas inside an agent, `brain/tech-debt/<d>/<s>.md`, a review-tree report and a divergent `CLAUDE.md`/`AGENTS.md`. Expect all four line kinds and the suggested config.
- **tdd_target:** `test/integration.test.ts` — "scan — project context"
- **review_mode:** code

### T5 — Config through `init`, `upgrade`, `doctor`, and a new `brain config`
- **depends_on:** T1, T3
- **location:**
  - `src/commands/init.ts`, `src/commands/upgrade.ts`, `src/commands/doctor.ts`
  - `src/commands/config.ts` (new), `src/Cli.ts`
  - the detection collector shared with scan: `src/services/context.ts` (new)
- **description:**
  - **init:**
    - Add `--review-mode <total|plan|none>`, plus `--tech-debt-dir`, `--personas` and `--review-location` as advanced overrides.
    - Build the config as detection suggestions ⊕ flags, and write it when absent. When it exists, keep it and run `mergeMissing`.
    - Record it as `seed`. Report `created` / `kept`.
  - **upgrade:**
    - Not scoped, config absent: write the detected config and report `created`, with a note: "review.mode defaulted to total — `brain config set review.mode …` to change".
    - Config present: `mergeMissing`, reporting added keys.
    - A scoped `--skill` run leaves the config alone.
  - **doctor:**
    - An invalid config, an unknown value, or a configured `paths.*` that does not exist → problem (exit 1).
    - No config → a note, not a problem.
    - `REQUIRED_DIRS` uses `paths.techDebt` instead of the literal `brain/tech-debt`.
  - **`brain config`:**
    - `get [key]` prints the resolved config with defaults applied.
    - `set <key> <value>` validates with T1 `setKey` and writes the file.
    - `--json` works on both.
- **validation:**
  - **Integration:**
    - init with `--review-mode plan` writes it;
    - a re-run keeps it;
    - upgrade on a pre-config install creates it;
    - doctor fails on `review.mode: "strict"`;
    - `config set review.mode none` round-trips;
    - `config set review.mode bad` exits non-zero listing the allowed values.
- **tdd_target:** `test/integration.test.ts` — "config lifecycle"
- **review_mode:** code

### T6 — Router states in `link`
- **depends_on:** T2
- **location:** `src/core/link-plan.ts`, `src/core/link-plan.test.ts`, `src/services/linker.ts`, `src/commands/link.ts`
- **description:**
  - Feed `routerState` into `planLink`. The disk facts need the root-file contents, so `relevantPaths` / `runLink` read the two router files.
  - **`identical`** → `LinkRouter` without force.
  - **`divergent`** → `Conflict` whose `why` lists the `CLAUDE.md`-only headings and the similarity, with "reconcile into AGENTS.md (init-brain → router.md)".
  - **`--force` on `divergent`** → still a `Conflict` ("refusing to discard differing CLAUDE.md content — reconcile first"), per SPEC Q4.
  - The other states keep today's actions.
- **validation:**
  - **New link-plan unit cases:**
    - `identical` without force links;
    - `divergent` with force is a conflict;
    - a symlink already pointing to `AGENTS.md` is up to date.
  - **Existing cases unchanged.**
- **tdd_target:** `link-plan.test.ts`
- **review_mode:** code

### T7 — Brain Schema: Project configuration
- **depends_on:** T1
- **location:** `assets/brain/AGENTS.md`, `assets/brain/CLAUDE.md` (kept identical)
- **description:** Add `## Project configuration`, containing:
  - the key table with defaults (SPEC "The config file");
  - the path tokens `<techDebt>`, `<reviews>`, `<personas>`;
  - **the review-mode matrix (SPEC §3), stated once**;
  - the rule "skills and agents read the config; never edit an installed skill to fit the project".

  Also:
  - add `type: personas` to the frontmatter type list;
  - describe `personas.md` under the directory conventions;
  - update the `review/` and `tech-debt/` directory sections to use the tokens and both `review.location` layouts;
  - update the `FLOW.md` description: written after an approved prototype; adds the two new sections.
- **validation:**
  - The two files are byte-identical.
  - The matrix exists only here; skills reference it.
- **review_mode:** docs

### T8 — Review-mode gates in the skills
- **depends_on:** T7
- **location:**
  - `assets/skills/create-spec/SKILL.md` (step 10, Workflow 6) and `references/handoff.md`
  - `assets/skills/create-plan/SKILL.md` (step 13, Workflow 4)
  - `assets/skills/implement-spec/SKILL.md` (Required Advisor Agents → post-implementation gate, Workflow 8) and `references/lifecycle.md`
  - `assets/skills/adversarial-review/SKILL.md` + `REFERENCE.md` (Contract → Trigger)
- **description:**
  - Add the config read step to each skill's Quick start step 1.
  - Prefix every gate with its `review.mode` condition per the matrix:
    - spec gate = {total};
    - plan gate = {total, plan};
    - implement-spec review = {total}.
  - The "otherwise offer in one line" branch replaces each gate in the other modes.
  - A `PLAN.md` task listing review as a closing step runs only under `total`.
  - `handoff.md` reports the verifier gate only when it ran.
- **validation:**
  - Grep: every `adversarial-verifier` / `adversarial-review` trigger in these files sits under a Gate line.
  - Manual EVAL rows for the three modes (T15).
- **review_mode:** docs

### T9 — Path tokens instead of hardcoded tech-debt and review paths
- **depends_on:** T7
- **location:**
  - **agents:** `assets/agents/{ux-advisor,adversarial-verifier,design-engineer,review-classifier}.md`
  - **brain scaffold:** `assets/brain/index.md`
  - **adversarial-review:** `assets/skills/adversarial-review/**` (SKILL, REFERENCE, all 6 references, both templates)
  - **docs-maintenance:** `assets/skills/docs-maintenance/SKILL.md`, `agents/openai.yaml`
  - **implement-spec:** `SKILL.md`, `references/lifecycle.md`
  - **init-brain:** `skills/init-brain/SKILL.md`, `references/migration.md`
- **description:**
  - Replace every literal tech-debt path with `<techDebt>/<domain>/<spec>.md`.
  - `adversarial-review` resolves case B by `review.location`:
    - `spec-folder` → `brain/specs/<domain>/<spec>/`;
    - `review-tree` → `<reviews>/<domain>/<spec>/`.
    - Case A → `<reviews>/<slug>/`.
  - Keep both wikilink conventions, chosen by location, in `brain-bookkeeping.md`, both templates, `scope-and-naming.md` and `stop-conditions.md`.
  - Single-file stores: per SPEC Q2, migrate with confirmation.
- **validation:**
  - `grep -rn "tech-debt/" assets skills` → only token forms, plus the Brain Schema defaults table.
  - Same check for `brain/review/` and the spec-folder phrasing.
- **review_mode:** docs

### T10 — Personas from the project
- **depends_on:** T7
- **location:**
  - `assets/agents/ux-advisor.md` ("Read the project", "Persona framing", "Self-verification")
  - `assets/skills/create-spec/SKILL.md`
  - `assets/skills/prototype/SKILL.md` (Phase 1 scope, "In a brain project")
- **description:**
  - `ux-advisor` reads `<personas>` first, takes the segments verbatim and derives concrete situations from them (SPEC §7.3, step 5). Generic axes and an open question are the fallback, only when `paths.personas` is `null`.
  - `create-spec` and `prototype` Phase 1 name the persona(s) from the same source.
- **validation:** `ux-advisor` mentions `brain/domains/` only for flows and contracts; personas come from the config path.
- **review_mode:** docs

### T11 — UX review only after an approved prototype
- **depends_on:** T7, T10
- **location:**
  - **prototype:** `assets/skills/prototype/SKILL.md` (Phase 6, "In a brain project", the `keep <variant>` row)
  - **create-spec:** `SKILL.md` (steps 8–9, Workflow 6, Project Advisors intro), `references/brain-bookkeeping.md`, `references/handoff.md`, `references/flow-map.md` (new)
  - **create-plan:** `SKILL.md` (step 9, Workflow 4, Project Advisors intro)
  - **implement-spec:** `SKILL.md` (Required Advisor Agents, Project Advisors intro), `references/lifecycle.md` §6
  - **docs-maintenance:** `references/flow-pages.md`
  - **design-engineer:** `assets/agents/design-engineer.md` (lines 34 and 99)
  - **description strings:** the `ux-advisor` mentions in the `assets/brain/*` advisor list
- **description:** Per SPEC §4. This task moves the trigger; the agent itself is rewritten in T11b.
  - **prototype Phase 6:**
    - After the user approves a winner, and only then, spawn `ux-advisor`. Brief it with the five inputs of SPEC §4, including the dev-route URL and the list of what the prototype fakes.
    - Relay the verdict to the user. On `iterate`, run the loop of SPEC §7.2 (Q8):
      1. Show the at most 3 proposed changes; the user accepts all, some or none.
      2. Apply the accepted ones to the winner under the Hard Rules.
      3. Re-brief `ux-advisor` with the changed items for a re-review and regression pass.
      4. Stop after 2 rounds.
      5. Carry the applied changes into `create-spec` as decisions already taken, with exact values.
    - Otherwise pass the review into `create-spec`. If the run stops early, persist the review as `UX-REVIEW.md` next to the surviving variant (Q1).
  - **create-spec:**
    - Delete the auto `ux-advisor` step.
    - Add the prototype-handoff input per SPEC §4: decisions → acceptance criteria, mechanical fixes → one criterion, open questions with their defaults.
    - Write `FLOW.md` v2 from a new `references/flow-map.md`, which holds the template moved out of the agent (SPEC §7.5).
    - When the user rejects a finding, offer to append it to `brain/chore/ux-review.md` under "Suppressed findings" (SPEC §7.6).
    - Add the one-line "no UX review ran — consider `/prototype`" note for user-facing specs without a prototype.
  - **create-plan / implement-spec:** delete the `ux-advisor` invocations. Keep reading `FLOW.md`.
  - **design-engineer:** "after any `ux-advisor` pass" becomes "reading `FLOW.md` when present". Persona questions become an open question when no `FLOW.md` exists.
- **validation:**
  - `grep -rn "ux-advisor" assets` → triggers only in `prototype`.
  - Every other hit is descriptive: the Brain Schema list and FLOW provenance.
- **review_mode:** docs

### T11b — `ux-advisor` redesign: role, moment, method
- **depends_on:** T10, T11
- **location:**
  - **the agent:** `assets/agents/ux-advisor.md`, a full rewrite
  - **the contract change (Q7):**
    - `assets/agents/adversarial-verifier.md`, lines 54 and 105 (the `FLOW.md` paths as contract);
    - `assets/skills/adversarial-review/SKILL.md`, step 3 (the "acceptance contract" sentence);
    - `assets/skills/adversarial-review/references/verification-phase.md`, if it repeats it
  - **the Brain Schema:** `assets/brain/AGENTS.md` and `assets/brain/CLAUDE.md`:
    - the `ux-advisor` line in the advisor list;
    - the `FLOW.md` row in the directory conventions;
    - `brain/chore/ux-review.md` in the `chore/` conventions
- **description:** Per SPEC §7. Read [RESEARCH-ux-advisor.md](RESEARCH-ux-advisor.md) parts A–C first; every rule there names its evidence.
  - **Frontmatter:**
    - a description centered on the reviewer role and the prototype moment, with two examples: a prototype review and an explicit live-surface review;
    - `tools: Read, Grep, Glob, Bash`;
    - `model: inherit`;
    - no `memory:`.
  - **Body, in this order:**
    1. Role, plus the "does not own" table (§7.1).
    2. Moment table and verdicts, including when to decline (§7.2).
    3. Read the project: the config, `<personas>`, the domain page, the router, `brain/chore/ux-review.md`, and the component sources (§7.3, step 1).
    4. Method steps 2–9, with the `agent-browser` commands spelled out:
       - `screenshot`, with the file opened and inspected;
       - `snapshot -i`;
       - `press`;
       - `set viewport` / `set device`;
       - `set media … reduced-motion`;
       - `set offline`;
       - `network route --body|--abort`;
       - `a11y`, or axe through `eval`.
    5. Output contract (§7.4).
    6. Calibration: one kept and one rejected finding, generic, with no reference-project names (§7.6).
    7. Self-verification:
       - every finding passes the evidence gate;
       - the caps are respected;
       - no runtime claim without a trace;
       - the degraded banner is present when needed.
  - **Keep from today's agent:** the YAGNI/friction stance, the analytics/PII boundary, and "defer to the project's design system". Move the `FLOW.md` template out to `create-spec/references/flow-map.md` (T11).
  - **Verifier contract:** every `SPEC.md` acceptance criterion must be met, else at least MAJOR. `FLOW.md` is read to locate states. A `FLOW.md` row with no AC is not a finding.
  - **agent-browser:** check whether the bundled skill text documents `a11y`. If upstream has it and the bundled text does not, note it in the agent ("if `agent-browser a11y` is unavailable, inject axe-core with `eval`"). Refreshing the bundled skill is a separate change, not part of this task.
- **validation:**
  - `head -8 assets/agents/ux-advisor.md` shows the four tools and no `Write`, `Edit` or `memory:`.
  - The agent has the §7.4 headings (including "Prototype changes"), the moment table, the three verdicts (`proceed`, `proceed with decisions`, `iterate`), the small-change rule and the DEGRADED rule.
  - `grep -n "FLOW.md" assets/agents/ux-advisor.md` shows no authoring instructions.
  - `grep -n "error/edge path" assets/agents/adversarial-verifier.md` → no hits.
  - The body stays within about 220 lines.
  - The no-foreign-tokens grep is clean.
- **review_mode:** docs

### T12 — Review ingest and FLOW parity (port from the reference project)
- **depends_on:** T9
- **location:**
  - **docs-maintenance:** `SKILL.md`, `references/review-ingest.md` (new), `references/flow-pages.md`
  - **create-plan:** `references/planner-phase.md`
  - **implement-spec:** `references/lifecycle.md`, `references/parallel-worker-brief.md`
- **description:**
  - **Port, then generalize.** The source text is in REFERENCE B3 and B4: the reference project's `.claude/skills/docs-maintenance/` and the sibling skills on its `staging` branch.
    - Replace project names and paths with tokens.
    - `review-ingest.md` resolves `REPORT.md` by `review.location`.
  - **FLOW parity targets v2.** Port the reference project's FLOW reading, but:
    - read v2 sections first and still accept v1 (Error paths / Edge cases);
    - aim the `lifecycle.md` acceptance-audit check at the `SPEC.md` criteria that `FLOW.md` cites, not at every FLOW row (Q7).
  - **docs-maintenance Step 2:** read `FLOW.md` (primary flow source) and the sibling `REPORT.md` when `ingested: false`.
  - **docs-maintenance Step 7:** process that report. **Step 8:** add the log line.
  - **Secondary section:** standalone ingest of case-A reports.
- **validation:**
  - Ingest semantics match the reference project's: guard, read, fold durable findings, backlink, mark, log.
  - `adversarial-review`'s promise ("docs-maintenance ingests REPORT.md") now resolves to a real path.
- **review_mode:** docs

### T13 — Agents: config read and router fallback
- **depends_on:** T7
- **location:** `assets/agents/{adversarial-verifier,review-classifier,ux-advisor,design-engineer}.md`
- **description:**
  - Each "read the project" section reads the config first.
  - Each reads the root router as "`AGENTS.md` (fallback: `CLAUDE.md`)".
  - Check that no agent hardcodes a path covered by `paths.*`.
  - **Memory (Q5):**
    - `adversarial-verifier` and `review-classifier` gain `memory: project` in their frontmatter;
    - `ux-advisor` and `design-engineer` declare none.
- **validation:**
  - Grep `root \`AGENTS.md\`` in `assets/agents`: every occurrence carries the fallback, or sits in a sentence that already states it.
  - `grep -l "^memory:" assets/agents/*.md` lists exactly `adversarial-verifier.md` and `review-classifier.md`.
- **review_mode:** docs

### T14 — init-brain: project context, router, legacy aliases
- **depends_on:** T4, T5, T6, T7–T13
- **location:**
  - `skills/init-brain/SKILL.md`
  - `references/project-context.md` (new), `references/router.md` (new)
  - `references/advisor-detection.md`, `references/migration.md`, `references/providers.md`, `references/verify.md`
- **description:**
  - **SKILL.md, Step 1:** a fourth choice, **review mode**, recommending the value `scan` suggests with its reason. Default `total`.
  - **SKILL.md, new Step 1b, project context:** follow `project-context.md`.
  - **SKILL.md, Step 2:** pass `--review-mode`.
  - **SKILL.md, Step 5:** follow `router.md` instead of the current paragraph.
  - **SKILL.md, Step 6 / verify.md:** check the config against the actual project.
  - **`project-context.md`:** the decision tables of SPEC §1, §2 and §6.3 (personas extraction with confirmation, tech-debt store, review location), then `brain config set` for each decision.
  - **`router.md`:**
    - the state table and pertinence classes of SPEC §5;
    - the reconcile procedure: merge `CLAUDE.md`-only sections into `AGENTS.md`, show the diff, confirm, then `brain link`;
    - overlapping hand-written process sections: propose replacing each with a pointer to the owning skill or config;
    - config suggestions seeded from the router.
  - **advisor-detection.md:**
    - the legacy alias table (`review-classifier-router → review-classifier`, `ux-flow-strategist → ux-advisor`), confirmed by description similarity;
    - twins are offered for replacement, not wired as additional advisors;
    - their project facts route to `project-context.md` / `router.md` first;
    - the per-skill wiring list loses `ux/design → create-spec / create-plan / implement-spec`: UX now lives in `prototype` only.
  - **migration.md:**
    - fold agent memories into brain pages (SPEC §6.5);
    - when the user replaces a legacy twin of an agent that keeps memory (Q5), rename its folder to the shipped name: `.claude/agent-memory/review-classifier-router/` → `review-classifier/`;
    - a legacy UX agent's component-mechanics memories become the "Component traps" part of `brain/chore/ux-review.md`, shown to the user first;
    - list the docs that mention legacy agent names.
  - **onboard:** check that the inlining picks up the two new references (it inlines `references/*` mentioned by the playbook).
- **validation:**
  - `brain onboard` output contains `project-context.md` and `router.md`.
  - The playbook reads coherently end to end (manual).
- **review_mode:** docs

### T15 — README, EVAL, version
- **depends_on:** T1–T14
- **location:** `README.md`, `test/EVAL.md`, `package.json` (`0.7.0`; `src/version.ts` reads it)
- **description:**
  - **README:**
    - "What ends up in a project": `brain/brain.config.json`, `brain/personas.md` (when extracted);
    - a new "Project configuration" section: keys, `brain config`, review modes table;
    - an updated UX flow (prototype → ux-advisor reviews the winner in the browser → create-spec);
    - the agent's role, moments and verdicts;
    - `FLOW.md` v2 as a map;
    - the optional `brain/chore/ux-review.md`;
    - router behavior (identical → linked; divergent → reconcile; `--force` never discards);
    - a release note covering the moved UX trigger, the redesigned agent, the verifier contract change, and that `FLOW.md` v1 files are still read.
  - **EVAL rows:**
    - config lifecycle [auto];
    - scan project context [auto];
    - router identical / divergent [auto];
    - review modes × 3 [man] — run `create-spec` → `create-plan` → `implement-spec` on a toy spec and confirm which gates fire;
    - prototype → ux-advisor → create-spec handoff [man]: the verdict is relayed; decisions become AC; `FLOW.md` v2 cites the AC ids;
    - ux-advisor evidence and caps [man]: every finding has a location and evidence; at most 6 decisions and 3 open questions;
    - ux-advisor degraded mode [man]: with no browser, the banner appears and there are no runtime claims;
    - iterate loop [man]: at most 3 changes, each accepted by the user and applied by `prototype` (never by the agent); a re-review follows; it stops at 2 rounds; the changes reach the spec as decisions;
    - ux-advisor declines on a spec draft with no rendered UI [man];
    - UX replay benchmark [man] (T17);
    - review ingest [man];
    - reference-project dry run [man] (T16).
- **validation:** `npm run build` clean; `npm test` green.
- **review_mode:** docs

### T16 — Reference-project dry run (acceptance)
- **depends_on:** T1–T15
- **location:** a throwaway worktree of the reference project, never its working branch:

  ```bash
  git -C <sevedemo> worktree add /tmp/sevedemo-brain staging
  ```
- **description:** In the worktree:
  1. **Run the new CLI:** `node <brain-manager>/dist/bin.js scan --json`.
  2. **Confirm the suggestions.** Expected:
     - `review.mode none`, with the `CLAUDE.md` Step 7 reason;
     - `review.location review-tree`;
     - `paths.techDebt brain/tech-debt`;
     - a persona section in `ux-flow-strategist.md`;
     - router `claude-only`, classed `partial`, with a workflow overlap.
  3. **Run** `init --providers claude --review-mode none`.
  4. **Follow init-brain** `project-context.md` (extract personas → `brain/personas.md`) and `router.md` (promote `CLAUDE.md` → `AGENTS.md`, link back).
  5. **Run `upgrade --force`** for the adopted suite files, with the user's consent. This is a throwaway worktree.
  6. **Run `doctor`.**
  7. **Diff** every suite skill and shipped agent against `assets/`.
  8. **Check agent memory** per SPEC AC 11:
     - the verifier's folder is untouched;
     - the classifier's folder is renamed;
     - the UX notes were offered for `brain/chore/ux-review.md`.
- **validation:**
  - **SPEC AC 11** holds.
  - **Record the outcome** in this plan's log:
    - files identical;
    - config values;
    - doctor exit code;
    - anything that still needed a hand edit. Each such item is a bug in T1–T14, not something to fix in the project.
  - **Remove the worktree** afterwards.
- **review_mode:** mixed (CLI + manual read of the playbook output)

### T17 — UX replay benchmark (accepts T11b)
- **depends_on:** T11, T11b (T12 for the v2 readers if the run continues into `create-spec`)
- **location:** a throwaway worktree of the reference project per case, never its working branch. The cases and commits are in [RESEARCH-ux-advisor.md](RESEARCH-ux-advisor.md) part D.

  ```bash
  git -C <sevedemo> worktree add /tmp/ux-bench-<case> <prototype-commit>
  ```
- **description:**
  1. **Ground truth first, blind to the agent.** For each case, list the defects observable on the prototype from that spec's review `REPORT.md`, its tech-debt page and the later fix commits. RESEARCH part A names several, for example the inert live region, the checkbox double toggle and the dialog jump. Drop backend-only and implementation-only items. Freeze the list in the log before any run.
  2. **Serve the prototype route** (`/prototypes/<slug>`). The prototypes run on fixtures. If a route still needs the backend, use the reference project's local-run notes or mock the calls with `agent-browser network route`.
  3. **Brief the redesigned `ux-advisor`** exactly as `prototype` Phase 6 would, with the five SPEC §4 inputs. Record its review verbatim.
  4. **Score it against the old `FLOW.md`** for the same spec. Metrics and thresholds are in RESEARCH part D:
     - recall on the ground truth;
     - share of valid findings, judged by the maintainer;
     - adopted P0/P1 decisions;
     - defaults and AC on every decision;
     - length and open questions;
     - runtime claims without evidence.
  5. **On a miss,** change the agent (calibration examples first, then the method wording) and re-run every case. Never change the thresholds.
  6. **Remove the worktrees.**
- **validation:**
  - SPEC AC 13 holds.
  - The log carries:
    - the frozen ground truth per case;
    - one results row per case and iteration;
    - the final agent diff summary.
- **review_mode:** manual (browser + maintainer judgement)

## Validation gates (before opening the PR)

1. `npm run build` — no TS errors.
2. `npm test` — unit and integration green, new suites included.
3. Asset greps:
   - T9: no literal tech-debt or review paths;
   - T11: `ux-advisor` triggers only in `prototype`;
   - T11b: `ux-advisor` tools and headings; no `FLOW.md` error/edge paths as contract in `adversarial-verifier`;
   - T13: router fallback everywhere;
   - no reference-project tokens in `assets/`.
4. `assets/brain/AGENTS.md` ≡ `assets/brain/CLAUDE.md`.
5. T16 dry-run log recorded, with AC 11 met.
6. T17 benchmark log recorded, with AC 13 met.
7. EVAL manual rows run for the three review modes, the prototype handoff and the `ux-advisor` rows.

## Risks and how this plan handles them

| Risk | Handling |
|---|---|
| Wave 3 tasks collide on the same files | They run sequentially in the listed order; each task's grep validation runs after it, so a later task cannot silently undo an earlier one. |
| The mode matrix drifts between skills | It lives once in the Brain Schema (T7). Skills carry only the Gate line naming the allowed modes. |
| Detection proposes something wrong | The CLI only suggests, with reasons. init-brain confirms with the user before writing config or extracting personas. |
| Existing installs change behavior on upgrade | No config means `total` + 0.6.0 paths (identical behavior), except the UX trigger move, which is announced in the README and the release note. |
| Porting text from the reference project leaks its specifics | T12 generalizes to tokens. Gate 3 greps for its names. |
| The redesigned agent reads well but performs no better | T17 accepts it only against the old agent's real output, on defects that actually shipped, with thresholds frozen before the run. |
| The benchmark leaks into the prompt (overfitting to three cases) | Calibration examples in the shipped agent stay generic (no reference-project names, no case-specific traps). Project-specific traps belong in the project's `brain/chore/ux-review.md`. |
| `agent-browser` lacks `a11y` in the installed version | The agent falls back to axe through `eval`, then to listing the automated checks as not run. Degraded mode is never silent. |

## Log

- T1 — 2026-10-05 — `src/core/config.ts` + 17 tests. Partial/older files decode against the defaults; `mergeMissing` never changes a present value and keeps unknown keys; `setKey` errors list the known keys / allowed values. The config path is `seed` through the existing `brain/` rule (explicit test).
- T2 — 2026-10-05 — `src/core/router.ts` + 18 tests. `ROUTER_STUB` moved out of `linker.ts`. Deviation: `routerState` also reads the reverse layout (`AGENTS.md → CLAUDE.md`) as `claude-only`, so `link` promotes it instead of offering a `--force` that would have discarded the content. A short file still lists its signals after `stub`.
- T3 — 2026-10-05 — `src/core/detect.ts` + 16 tests. Deviations: tech-debt layout has a third value, `flat` (pages directly in the dir), so it is not mislabelled `single-file`; `reviewLayout` infers the reviews dir from where the reports are (e.g. `brain/reviews`) and returns counts; `suggestConfig` returns a full config plus one reason per key with a `detected | default` basis (`configDisagreements` uses it).
- T4 — 2026-10-05 — `scan` emits `persona-source`, `tech-debt-store`, `review-store`, `router` (state + signals + divergence), `config:` notes; `--json` adds `context`. Integration "scan — project context". Shared collector `src/services/context.ts`.
- T5 — 2026-10-05 — `init` flags (`--review-mode` as a choice, `--review-location`, `--tech-debt-dir`, `--personas`); `upgrade` creates/completes the config with detected paths and `review.mode` defaulted to `total` (the router's suggestion is only reported — a policy is never adopted silently); `doctor` validates the config and configured paths, `REQUIRED_DIRS` uses `paths.techDebt`; new `brain config get|set`. A flag on an existing config is reported as ignored, never applied. Integration "config lifecycle" (3 cases). Shared writer `src/services/project-config.ts`.
- T6 — 2026-10-05 — `linker` reads router contents; `identical` links without `--force`; `divergent` is a conflict naming the `CLAUDE.md`-only headings and the similarity, also under `--force`. `link`/`upgrade` notes separate reconcile conflicts from `--force`-able ones. 5 new link-plan cases + 2 integration cases; existing cases unchanged.
- T7 — 2026-10-05 — Brain Schema: `## Project configuration` (keys, tokens, the spec's review folder, the mode matrix, the never-edit rule), `personas.md`, `type: personas`, `review/` with both layouts and ingest, `FLOW.md` as a map, `chore/motion.md` + `chore/ux-review.md`. `AGENTS.md` ≡ `CLAUDE.md`. `index.md` scaffold uses the tokens.
- T8 — 2026-10-05 — Gate lines in create-spec (step 10, {total}), create-plan (step 13, {total, plan}), implement-spec (post-implementation gate + Quick start 8, {total}; closing-step review only under `total`), handoff reports how the spec was checked; adversarial-review Contract → Trigger. Config read in every Quick start step 1.
- T9 — 2026-10-05 — `<techDebt>`/`<reviews>` tokens across agents, adversarial-review (all files and both templates, `<folder>` wikilink convention), docs-maintenance, implement-spec, `openai.yaml`. Grep: no literal tech-debt or review path in `assets/` outside the Brain Schema defaults table.
- T10 — 2026-10-05 — `ux-advisor` reads `<personas>` (verbatim segments, generic axes only when `null`); create-spec names personas in Context; prototype Phase 1 scopes from `<personas>` (in "In a brain project", so the upstream-shared body stays identical).
- T11 — 2026-10-05 — `ux-advisor` triggered only by `prototype` Phase 6 / `keep` (brief with the 5 inputs, iterate loop, `UX-REVIEW.md` on interruption). create-spec consumes the review (step 8), writes `FLOW.md` from the new `references/flow-map.md`, offers rejected findings to `brain/chore/ux-review.md`, and says "no UX review ran" for user-facing specs without one. create-plan / implement-spec / design-engineer no longer invoke it. Grep: every other hit is descriptive.
- T11b — 2026-10-05 — `ux-advisor` rewritten (168 lines; tools `Read, Grep, Glob, Bash`; no `memory:`): role + does-not-own, moment table + 3 verdicts + small-change rule + loop, read-the-project, method with `agent-browser` commands (screenshots opened, axe via `a11y` or `eval`), evidence gate, caps, DEGRADED, output contract, kept/rejected calibration, self-verification. The installed `agent-browser` 0.27.1 has no `a11y` command and the bundled skill text does not document one: the agent falls back to axe-core through `eval`. Verifier/adversarial-review: `SPEC.md` criteria are the contract, `FLOW.md` a map; `grep "error/edge path"` in the verifier → none.
- T12 — 2026-10-05 — Ported and generalized from the reference project: `docs-maintenance/references/review-ingest.md` (guard, read, fold, backlink, mark, log; `<techDebt>`, `review.location`, `<folder>` links), `## Secondary: Review Ingest`, Step 2 `FLOW.md` + sibling `REPORT.md`, Step 3 v2/v1 section mapping, Step 7 processing, log line; planner-phase "Spec-folder inputs"; lifecycle reading order + acceptance-audit check aimed at the criteria `FLOW.md` cites; FLOW slice in `parallel-worker-brief.md`.
- T13 — 2026-10-05 — Agents read the config first and the router with the `CLAUDE.md` fallback; later mentions say "the root router". `memory: project` on `adversarial-verifier` and `review-classifier` only, each with a short note on what to keep (how to check / how to route, never project facts).
- T14 — 2026-10-05 — init-brain: Step 1 fourth choice (review mode), Step 1b (project context), Step 2 flags + pre-CLI path, Step 5 → `router.md`, verify checks the config. New `references/project-context.md` and `references/router.md`; advisor-detection alias table + twin handling + no ux/design wiring + carried-over block cleanup; migration: pre-CLI install, legacy agents dir, agent memory (Q5), leftover files; providers conflicts text. `brain onboard` inlines both new references.
- T15 — 2026-10-05 — README (CLI table, project configuration, review modes, UX flow, release notes 0.7.0), EVAL rows (config lifecycle, scan project context, router states, config validation [auto]; three review modes, prototype handoff, ux-advisor evidence/degraded/iterate/decline, no UX trigger elsewhere, replay benchmark, review ingest, dry run [man]), version 0.7.0. `npm run build` clean; `npm test` 151 green.
- T16 — 2026-10-05 — Reference-project dry run on a detached worktree of `staging` (2728d48b), removed afterwards. Scan suggested exactly the expected values (review.mode none — "CLAUDE.md states review only on request"; review-tree, 15 of 19 reports in the tree; `brain/tech-debt`, 26 pages; persona section in `ux-flow-strategist.md`; router `claude-only`, judged `partial` with a workflow overlap at Step 7). Ran `init --skills-dir .claude/skills --review-mode none` (pre-CLI install: adopt in place) → `upgrade` (migrated to `.agents/skills`, promoted `CLAUDE.md`, linked) → personas extracted to `brain/personas.md` + `config set` → router Step 7 replaced by a pointer to `review.mode`, critical paths from the legacy classifier added to Security → legacy agents dir sorted (2 stale shipped copies, 2 twins removed) → `link` → `upgrade --force` → doctor. Result: all 11 suite skills and 4 shipped agents byte-identical to `assets/`; config `review.mode: none`, `review.location: review-tree`, `paths.techDebt: brain/tech-debt`, `paths.reviews: brain/review`, `paths.personas: brain/personas.md`; `AGENTS.md` canonical, `CLAUDE.md → AGENTS.md`; `.claude/agent-memory/adversarial-verifier/` untouched (211 files), `review-classifier-router/` renamed to `review-classifier/`, the 23 `ux-flow-strategist` notes listed for `brain/chore/ux-review.md` (candidates for Component traps: the SVG `role=img` note, the centered-dialog async height, the expand-card overlay rules); doctor exit 0. **Two gaps found and fixed in the package** (each would otherwise have been a hand edit): (1) the adopted skills kept `## Project Advisors` blocks wiring the legacy twin → advisor-detection now resets carried-over blocks; (2) 7 old `design-engineering` references stayed in the skill folder → `doctor` reports `untracked` files inside bundled skills, migration says to clean them. Deviation from the plan's step 3: `init --providers claude` would have installed a second copy next to the real `.claude/skills`; the playbook's pre-CLI path (`init --skills-dir .claude/skills`, then `upgrade`) adopts and migrates instead. Observation, unchanged: the adopted Brain Schema is overwritten by the first plain `upgrade` (adopt semantics), which is what standardization wants here.

### T17 — frozen ground truth (2026-10-05, compiled before any run)

Compiled blind to the redesigned agent by three read-only agents over the reference project's history on `staging`: each spec's review `REPORT.md`, its tech-debt page, `IMPLEMENTATION-NOTES.md` / `PLAN*.md` logs and the later fix commits. The old `FLOW.md` was excluded as a source. Kept only defects observable on the prototype at its commit (UX, accessibility, missing states, placement, copy); backend-only and implementation-only items dropped. Defects that only the implementation introduced (e.g. the checkbox double toggle, `dd8a1c75`) are dropped, because the prototype does not have them.

**Case 1 — `company/linkedin-sync`, prototype `3adcff19` (15 defects: 3 P0, 10 P1, 2 P2)**

| ID | Defect | Where | Class | Source | Evidence at 3adcff19 | Sev |
|---|---|---|---|---|---|---|
| LS-1 | Card opens "in place" pressed against the viewport bottom when the row is mid/low page | expanded card position | placement | 1d604af9 (D22, AC35) | VariantVetrina.tsx:368 placement in-place; ExpandCard.tsx:100-107 | P1 |
| LS-2 | Open card keeps opening width/left on resize/rotation → too narrow / off-screen | expanded card geometry | placement | REPORT r2 MINOR v7; c5ce04d3 | ExpandCard.tsx:79-93,130-132,193-199 | P1 |
| LS-3 | Opening the hub never moves focus into the aria-modal dialog (falls to body); Tab not contained | expanded card hub | a11y | REPORT r2 MAJOR v7; 478277c9 | ExpandCard.tsx:205-207,236-239,177-179; VariantVetrina.tsx:155-202 | P1 |
| LS-4 | Focus not returned to the LinkedIn row on close (drops to body) | close path | a11y | REPORT r1/r2 v7 | ExpandCard.tsx:143-164,208-210 | P1 |
| LS-5 | Scrim appears in one frame (no fade-in); under reduced motion cut mid-fade | scrim | interaction/motion | REPORT r2 BLOCKER v8; tech-debt v8 | proto.css:256-269; ExpandCard.tsx:214-218,54,156-163 | P1 |
| LS-6 | Header grows ~45px instantly hub→warning/confirm faces while frame animates | expanded card header | interaction/motion | REPORT r2 MAJOR v8; 478277c9 | VariantVetrina.tsx:358-359; MorphView.tsx:79-80 | P1 |
| LS-7 | Focus ring of confirm buttons clipped right/bottom (overflow hidden) | confirm buttons | a11y | tech-debt NIT v7 | proto.css:109-112; VariantVetrina.tsx:137-148 | P2 |
| LS-8 | Reopening during the ~400ms return trip leaves card stuck (no scrim/Escape, won't reopen) | collapsed row during close | interaction | REPORT r2 MAJOR v7, r1 BLOCKER v5 | ExpandCard.tsx:111-112,156-163; machine.ts:216-219 | P1 |
| LS-9 | Closing the success stamp and reopening within the linger window → card closes by itself | success stage | interaction | REPORT r1 BLOCKER v1 | machine.ts:93,102,113-116,221-225,201-210 | P0 |
| LS-10 | Ambiguous server outcomes shown as definite failure ("no data written") instead of uncertain/verify | card error face | missing-state | REPORT r1/r2 BLOCKER v2 | state never shown (machine.ts success-only) | P0 |
| LS-11 | Non-closable working card can strand the user (hung disconnect/save/re-read; archived company retry loop) | busy/uncertain faces | interaction | REPORT r1/r2 MAJOR v1-v3 | state never shown (no hang/timeout) | P1 |
| LS-12 | Error surfaces mislead or go silent (404 closes silently, 401 wrong blame, 400 wrong copy, retry not re-announced) | error faces + aria-live | copy | tech-debt v1/v2/v7; REPORT checklist | state never shown (no error copy) | P2 |
| LS-13 | Rate-limit (429) reason shown on disconnect confirm with enabled Scollega; forgotten on workspace switch | hub/disconnect confirm | copy | REPORT r1 MAJOR v6, r2 MAJOR v1 | state never shown | P1 |
| LS-14 | With unsaved page edits, leave dialog offers «Salva ed esci» during uncertain/just-after sync → overwrites fresh import | leave dialog / SaveBar | interaction | REPORT r1 BLOCKER v4, MAJOR v5 | state never shown (no dirty tracking in harness) | P0 |
| LS-15 | Messages explaining the hold are lost (leave dialog without discard count, SaveBar live region dropped, Salva-prima error inside inert SaveBar) | leave dialog, SaveBar | copy | REPORT r1 MAJOR v4, r2 MINOR v7 | state never shown | P1 |

Dropped: 40 (double PostHog event, dead i18n keys, options.signal/try-finally/dispose, BE limiter, R5 social_media write).

**Case 2 — `freelance/suggested-skills`, prototype `442aeea4` (14 defects: 4 P1, 10 P2)**

| ID | Defect | Where | Class | Source | Evidence at 442aeea4 | Sev |
|---|---|---|---|---|---|---|
| SS-1 | «+N» chip wraps to a 3rd row at card widths 270–343px (~1% of profiles) | card compact preview | placement | REPORT MAJOR v2; 1ae965f3 | chips.tsx:57-72,96-101; page-shell.tsx:85 | P1 |
| SS-2 | Closing the modal leaves focus on body, not the opener | modal close → opener | a11y | REPORT MINOR v5; 49904d62 | skills-section.tsx:326-343; ui/dialog.tsx:46-52 | P1 |
| SS-3 | Typed-but-unconfirmed text silently lost (Esc/outside/Salva ignore it) | modal input + Salva | interaction | REPORT MINOR v3; 7da09004 | chips.tsx:259-263,309-314; skills-section.tsx:128-129,224,326-329 | P1 |
| SS-4 | Close question wrong/missing after partial or uncertain save | modal close confirmation | missing-state | REPORT MAJOR v3; 1ae965f3 | state never shown | P1 |
| SS-5 | Back/route change discards the modified draft with no question, even mid-save | modal vs navigation | interaction | REPORT MINOR v3 | no leave guard; skills-section.tsx:326-329 | P2 |
| SS-6 | Save-error copy: raw English errors, «86400 secondi», «Riprova più tardi» next to immediate Riprova | modal save-error notice | missing-state | aa0c968d; tech-debt D1/D2 | state never shown | P2 |
| SS-7 | Safari/macOS Firefox: clicking a chip ✕ doesn't move focus to the next ✕ | modal chip ✕ / suggestion buttons | a11y | REPORT MINOR v5 | focus.ts:17-18; chips.tsx:266-273; suggestions-box.tsx:38-43 | P2 |
| SS-8 | Touch devices: focus jumps into the input, virtual keyboard covers suggestions and Salva | modal open / after last ✕ | interaction | REPORT MINOR v5 | skills-section.tsx:336-341,139; chips.tsx:268-272 | P2 |
| SS-9 | Mobile: centered modal jumps on every height change; Salva can sit under iOS toolbar | modal on ~375px | placement | d6d35bbe; tech-debt O6 | ui/dialog.tsx:48; skills-section.tsx:188-217 | P2 |
| SS-10 | Modal ✕ announced in English and reached last in Tab order | modal close button | a11y | REPORT NIT v5 | ui/dialog.tsx:54-71 | P2 |
| SS-11 | «+N» accessible name doesn't contain visible «+28» (label in name) | card «+N» | a11y | REPORT NIT v2 | chips.tsx:113-115 | P2 |
| SS-12 | «30/30» counter amber-600 ~3:1, fails AA at 12px | n/30 counter | a11y | PLAN FE7 log 7da09004 | chips.tsx:213 | P2 |
| SS-13 | No announcement when accepting a suggestion by typing; × gives no cue rejection is permanent | suggestions box / input | a11y | IMPL-NOTES O4; REPORT NIT v4 | no aria-live; skills-section.tsx:107-115,102 | P2 |
| SS-14 | Reject-only save shows «Competenze aggiornate» toast though no skill changed | success toast | copy | IMPL-NOTES EC-SK15 | skills-section.tsx:162; fixtures.ts:30-33 | P2 |

Dropped: 46 (PATCH bookkeeping, hook/onboarding tests and mutants, cache invalidation, onboarding-only cap, Tab-without-Enter on the real field).

**Case 3 — `freelance/dashboard-feedback` add-skills step, prototype `24aacc0d` (14 defects: 6 P1, 8 P2)**

| ID | Defect | Where | Class | Source | Evidence at 24aacc0d | Sev |
|---|---|---|---|---|---|---|
| AS-1 | Only the name/% label (and 16px box) toggles; row padding/gap inert though the row highlights; ~20px touch target vs 40px claimed | mode, checkbox row | interaction/a11y target | de94cf64; IMPL-NOTES Fase 3 #1 | checkbox-row.tsx:29-41, :71-74; shell.tsx:36-38 | P1 |
| AS-2 | Focus ring around the 16px box only, not the row | mode, checkbox rows | a11y focus | tech-debt DS checkbox; de94cf64 | checkbox-row.tsx:45 | P2 |
| AS-3 | Accessible name runs together «Docker58%» (no separator / «delle ricerche») | checkbox name | a11y name | PLAN-FE FE16 (b) | checkbox-row.tsx:72-73; shell.tsx:160-167 | P2 |
| AS-4 | Tick SVG has <title>Selezionata</title>, not hidden → extra announcement | checked indicator | a11y | tech-debt; de94cf64 | checkbox-row.tsx:54-59 | P2 |
| AS-5 | Dead end after success: outcome line replaces the action, remaining gaps can't be added | action slot | interaction (strands) | PLAN-FE FE17; IMPL-NOTES | modo-selezione.tsx:42-43, :86-106 | P1 |
| AS-6 | Focus drops to body after «Aggiungi» (button unmounted, outcome line never focused) | confirm bar → outcome | a11y focus | de94cf64; IMPL-NOTES #2 | modo-selezione.tsx:129-133, :92-95 | P1 |
| AS-7 | No visible saving state; mode exits at once; open button live during save; re-entry swallows success | mode during save | missing-state/interaction | SPEC S9; de94cf64 | modo-selezione.tsx:129-133, :140, :107-113 | P1 |
| AS-8 | Failed save strands user: selection hidden, no retry in view, focus lost, stale error after reopening | action slot retry/over_cap | interaction/a11y | FE18 log; FE17 log | modo-selezione.tsx:129-133, :44-50, :157-159 | P1 |
| AS-9 | No outcome surface when the detached card is force-closed mid-save (resize); toast never renders | collapsed card | missing-state | de94cf64; tech-debt toast after resize | shell.tsx:371-393 (state never shown) | P1 |
| AS-10 | Room line always shown even with plenty of room (noise) | mode column top | copy | PLAN-FE FE16 DL19 | modo-selezione.tsx:61; checkbox-row.tsx:89-108 | P2 |
| AS-11 | Confirm button «Aggiungi» doesn't say what/how many; separate counter | confirm bar | copy | PLAN-FE FE17 | modo-selezione.tsx:119-123, :140-142 | P2 |
| AS-12 | No lead line «Seleziona quelle che hai davvero» in the mode | mode column top | copy/placement | de94cf64 add_skills.lead | LeadLine defined, never rendered | P2 |
| AS-13 | Contradictory copy after «Tetto cambiato» (room line says full vs error says 1 left), no guidance to untick | room + failure line | copy | PLAN-FE FE17 | shell.tsx:89-92; modo-selezione.tsx:35,:51,:136 | P2 |
| AS-14 | Only retry/over_cap failures designed; rate-limit, quota, rejected, timeout, already-present never designed | action slot outcomes | missing-state/copy | IMPL-NOTES wait split; de94cf64 seven outcomes | fixtures.ts:87; harness.tsx:40-44 | P2 |

Dropped: 12 (double toggle introduced by the implementation dd8a1c75, /simplify regression, 15s deadline/reread-before-PATCH, close/reopen losing mode already in prototype comment, fe-fase-1 REPORT rows = rate bell/Fido banner).

### T17 — runs

Setup (2026-10-05): one detached worktree per prototype commit, `pnpm install`, Vite dev server per case (ports 3101–3103), a stand-in API that answers 401 to every call (the app shell needs `VITE_API_URL`; the prototypes run on fixtures). To reproduce the Phase 6 moment, each worktree loses the spec folder (no `SPEC.md`/`FLOW.md` exists yet in the new flow), `.claude/agent-memory/` and the legacy UX agent, and gains `brain/brain.config.json` + `brain/personas.md` (extracted from that commit's legacy agent). Each run: a clean-context agent given the shipped charter verbatim plus the five Phase 6 inputs, on its own `agent-browser` session, git forbidden. Scoring: one clean-context scorer per document with the same rubric for baseline and reviews (hit / partial / miss with a quote; strict recall = hits / N, lenient = (hits + ½ partials) / N). Validity is a provisional judgement by the scorer — **the maintainer's call per RESEARCH part D is still pending**.

Baseline (old `FLOW.md` at the prototype commit):

| Case | Strict recall | Lenient | Lines | Findings | Open questions (with default) | Runtime claims w/o evidence |
|---|---|---|---|---|---|---|
| linkedin-sync | 4/15 = 0.27 | 0.53 | 509 | 39 | 8 (7) | 12 |
| suggested-skills | 3/14 = 0.21 | 0.54 | 350 | 32 | 6 (6) | 14 |
| add-skills (whole FLOW) | 8/14 = 0.57 | 0.68 | 735 | 62 | 6 (4) | 6 |

Note on the thresholds (unchanged): for add-skills, "recall ≥ 2× baseline" cannot be met (2 × 0.57 > 1). That `FLOW.md` predates the prototype by two phases, and several of the case's defects are the prototype deviating from it.

Iteration 0 (the charter as shipped by T11b):

| Case | Strict recall | Lenient | Lines | Findings | Open q. (default) | Decisions w/ default+AC | Runtime claims w/o evidence | Valid (provisional) | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| linkedin-sync | 3/15 = 0.20 | 0.43 | 69 | 18 | 2 (2) | 6/6 | 6 | 7 valid, 1 doubtful, 1 invalid | iterate |
| suggested-skills | 4/14 = 0.29 | 0.50 | 71 | 19 | 3 (3) | 6/6 | 4 | 12/12 | iterate |
| add-skills | 6/14 = 0.43 | 0.57 | 62 | 12 | 2 (2) | 6/6 | 2 | 8 valid, 1 doubtful | iterate |

Iteration 0 fails recall (no case reaches 2× baseline; two are under 40%) and "zero runtime claims without evidence". It passes length, open questions, defaults/AC on every decision. Missed defects, by pattern: interruptions (reopen during a close transition or a success linger, close or resize during a save), the trigger's position and widths between breakpoints, contrast in forced states, names of non-interactive content (an icon's `<title>`), touch devices, clipped focus rings, labels and status-line copy, input left unconfirmed. Iteration 1 changes the agent, never the targets: the kept calibration example becomes an interruption finding (generic); the mechanical pass adds touch emulation, the full accessibility tree, before/after comparison of state changes, a width sweep, moving the trigger, axe in every forced state; the keyboard walk checks ring clipping; the state matrix adds interruptions, unconfirmed input and label/message reading; the evidence gate covers every section.

Iteration 1 (the charter now in `assets/agents/ux-advisor.md`, 177 lines; diff in `benchmark/iter1/agent-diff.patch`):

| Case | Strict recall (iter 0) | Lenient | Lines | Findings | Open q. (default) | Decisions w/ default+AC | Runtime claims w/o evidence | Valid (provisional) | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| linkedin-sync | 6/15 = 0.40 (0.20) | 0.60 | 71 | 20 | 3 (3) | 6/6 | 5 | 9 valid, 1 doubtful | iterate |
| suggested-skills | 5/14 = 0.36 (0.29) | 0.68 | 70 | 21 | 3 (3) | 6/6 | 4 | 10 valid, 1 doubtful | iterate |
| add-skills | 7/14 = 0.50 (0.43) | 0.61 | 71 | 17 | 3 (3) | 6/6 | 0 | 6 valid, 1 doubtful | iterate |

Against the pass bar (RESEARCH part D):

| Criterion | linkedin-sync | suggested-skills | add-skills |
|---|---|---|---|
| Recall ≥ 2× baseline (strict) | 0.40 vs 0.54 — **no** | 0.36 vs 0.42 — **no** | 0.50 vs 1.14 — **unreachable** |
| Recall ≥ 40% | 0.40 — yes | 0.36 — **no** | 0.50 — yes |
| ≥ 2/3 findings valid | 90% provisional — maintainer | 91% provisional — maintainer | 86% provisional — maintainer |
| ≥ 1 adopted P0/P1 per case | maintainer | maintainer | maintainer |
| Default + AC on every decision | yes | yes | yes |
| ≤ ~120 lines, ≤ 3 open questions | yes | yes | yes |
| Zero runtime claims without evidence | **no** (5) | **no** (4) | yes |

### T17 — after iteration 1 (superseded by Q10)

- **Not passed.** Iteration 1 beats the old agent on strict recall in two cases of three, on brevity (≈70 lines against 350–735), on defaults and criteria for every decision, and on unsupported claims (0–5 against 6–14). It still misses the recall bar in every case and the zero-unsupported-claims bar in two.
- **What the remaining misses are.** Device- or browser-specific defects Chromium emulation cannot show (Safari focus, real touch: `set device` reported `maxTouchPoints=0`, iOS toolbar); single-frame motion defects (a scrim popping in, a header growing between faces), which the charter routes to `design-engineer`; copy nuance (a status line shown when it says nothing, a confirm label that does not say what it adds); a reopen during a 400 ms close transition, which the iteration 1 runs did not try even though the calibration example describes exactly that.
- **Decisions the maintainer must take** (the plan forbids changing targets):
  1. Judge validity and adoption on `benchmark/iter1/review-*.md` (the scorers' provisional verdicts are in `score-*.md`).
  2. The add-skills recall threshold is unreachable. Keep it as a failed criterion, or exclude the case from that one criterion.
  3. Whether to run iteration 2. Proposed changes: every sentence that states runtime behavior ends with its evidence in parentheses, checked in self-verification; interrupt closing transitions as well as success lingers; a "long content" pass with the longest plausible real values (fixtures hid the 3-row wrap).
- **Artifacts:** `benchmark/` holds the frozen ground truth, the shared rubric, the baseline scores, and the reviews and scores of both iterations. Screenshots stayed in the session scratchpad. The worktrees, dev servers and stand-in API were removed after the runs; the setup above recreates them.

### T17 — iteration 2: UX only (2026-10-06)

- **Maintainer decision (SPEC Q10).** `ux-advisor` reviews UX only, and UI goes to `design-engineer`.
  - **The split:** frozen in `benchmark/ux-split.md` before the run. 27 of the 43 defects are UX.
  - **The bar:** in every case, strict UX recall ≥ the old `FLOW.md`'s, and ≥ 40%. The other criteria are unchanged. This replaces "recall ≥ 2× baseline" (RESEARCH part D, revision of 2026-10-06).
  - **What prompted it:** the market survey found no agent or browser evaluator covering runtime UX defects that could replace or benchmark ours. The run, rescored on the UX subset, showed iteration 1 tied with the old `FLOW.md` (14/27 against 14/27).
- **Agent changes** (`benchmark/iter2/agent-diff.patch`):
  - **Removed:** the UI half of the mechanical pass: width sweep, moving the trigger, ring clipping, touch emulation, contrast and layout in screenshots, axe.
  - **Added:**
    - an **outcome catalogue read from the code** before the browser, with every outcome the real operation can return, marked present / missing / not reachable;
    - a **leave-and-interrupt pass**, with a technique for acting inside a transition window (chained commands);
    - a **copy pass** in every state reached.
  - **Kept, at task level:** the keyboard walk, judged by where focus goes after each action and what is announced.
  - **New output sections:** "Task accessibility fixes", "Outcomes and states", "Leaving and interrupting".
  - **Calibration:** a second kept example (an outcome read from the code) and a second rejected one (a UI finding out of scope), both generic.
- **Consumers aligned:**
  - the Brain Schema twins;
  - `create-spec` and its `flow-map.md`: the folding table, plus the `FLOW.md` States and Accessibility sections;
  - `prototype` (the regression pass);
  - `create-plan` (`planner-phase.md`);
  - README, EVAL;
  - SPEC §7 and Q10, and RESEARCH parts C and D.
- **Setup:** as before. The briefs are identical to iterations 0 and 1 except for the charter, and the charter in each brief matched the shipped body byte for byte. Scorers judged all 43 defects with the same rubric, and UX recall is computed from their verdicts.

| Case | UX recall, old `FLOW.md` | UX recall, iter 1 | **UX recall, iter 2 (strict / lenient)** | Lines | Open q. (default) | Decisions w/ default+AC | Runtime claims w/o evidence | Valid (provisional) |
|---|---|---|---|---|---|---|---|---|
| linkedin-sync | 4/10 = 0.40 | 0.50 | **4/10 = 0.40** / 0.65 | 76 | 3 (3) | 6/6 | 0 | 10 valid, 1 doubtful |
| suggested-skills | 2/7 = 0.29 | 0.57 | **5/7 = 0.71** / 0.86 | 69 | 1 (1) | 6/6 | 2 (1 borderline) | 8 valid |
| add-skills | 8/10 = 0.80 | 0.50 | **8/10 = 0.80** / 0.90 | 89 | 3 (3) | 6/6 | 1 (borderline) | 8 valid |
| **Total** | 14/27 = 0.52 | 14/27 = 0.52 | **17/27 = 0.63** | | | | | |

On the UI subset, iteration 2 has 1 hit of 16 (LS-2, the open card's geometry after a resize, reported as a task blocker). It raised no layout, motion or contrast findings.

| Criterion | linkedin-sync | suggested-skills | add-skills |
|---|---|---|---|
| UX recall ≥ old `FLOW.md`, and ≥ 40% | 0.40 vs 0.40 — **yes, tie** | 0.71 vs 0.29 — yes | 0.80 vs 0.80 — **yes, tie** |
| ≥ 2/3 findings valid | 91% provisional — maintainer | 100% provisional — maintainer | 100% provisional — maintainer |
| ≥ 1 adopted P0/P1 per case | maintainer | maintainer | maintainer |
| Default + AC on every decision | yes | yes | yes |
| ≤ ~120 lines, ≤ 3 open questions | yes | yes | yes |
| Zero runtime claims without evidence | yes | **no** (2) | **borderline** (1) |

**What moved.**
- **Gains, mostly in outcomes the prototypes could not show:**
  - add-skills: AS-7, AS-8, AS-9, AS-11, AS-13 and AS-14 are full hits;
  - suggested-skills: SS-3 and SS-4;
  - linkedin-sync: LS-8, the reopen inside the close transition, found by chaining the commands as the charter now says.
- **Losses:**
  - LS-9: the reopen during the success linger was not tried this time;
  - LS-11 and LS-14: partial, not hit;
  - every UI defect, by design.

### T17 — where it stands (after iteration 2)

- **Recall bar:** met in every case, two by a tie.
  - **Fragile:** each tied case rests on borderline verdicts. Scoring LS-10 as partial gives 0.30. Scoring AS-9 or AS-11 as partial gives 0.70.
  - **Noise:** with one run per case, this margin is within run-to-run variation (iteration 2 found LS-8 and lost LS-9).
- **Not passed:** "zero runtime claims without evidence" — 2 in suggested-skills, 1 borderline in add-skills.
  - The claims sit in short bullets: a task-accessibility fix, a persona line.
  - The code supports each claim, but the bullet does not cite it.
- **Maintainer decisions pending:**
  1. Judge validity and adoption on `benchmark/iter2/review-*.md`. The scorers' provisional verdicts are in `score-*.md`.
  2. Whether ties pass. The bar says "≥", so they do as written.
  3. Whether to run iteration 3, aimed at the evidence criterion and at stability. Proposal:
     - every sentence that states runtime behavior ends with its evidence in parentheses, checked in self-verification;
     - optionally, two runs per case, to see the variance before deciding.
- **Environment:** worktrees, dev servers and the stand-in API were removed after the run. The setup above recreates them.

### T17 — closed (2026-10-06)

- **Maintainer decision (SPEC Q11).** Iteration 2 is accepted as it stands.
  - **No iteration 3.**
  - **Ties pass,** as the bar is written ("≥").
  - **Validity and adoption** were not judged finding by finding. The scorers' provisional verdicts in `benchmark/iter2/score-*.md` stand.
  - **Known gap:** "zero runtime claims without evidence" — 2 claims in suggested-skills, 1 borderline in add-skills. Each is a short bullet the code supports but does not cite. The iteration 3 proposal above stays on file if the gap shows up in real reviews.
- **Shipped agent:** `assets/agents/ux-advisor.md` as of iteration 2. Its diff from iteration 1 is `benchmark/iter2/agent-diff.patch`.
- **Folded into the shipped docs.** Every decision of the spec now lives where a project reads it, so no project needs `specs/` to adopt 0.7.0.
  - **How the gaps were found:** a read-only audit of SPEC §1–§7, the ACs, Q1–Q10 and this log against the shipped files. About 58 of 75 items were already covered. The gaps were all on the upgrade side, plus a few stale lines.
  - **New: `skills/init-brain/references/upgrade.md`,** the upgrade path for an existing brain, wired into SKILL.md Steps 1 and 2 and inlined by `brain onboard`. It covers:
    - the previewed upgrade;
    - the conflict groups that mix versions (Brain Schema; the UX flow files; the verifier contract);
    - project context through `config set`;
    - the advisor entries an older install wired;
    - the router;
    - older-format `FLOW.md` files and un-ingested reports;
    - `agent-browser`, `untracked` leftovers, and agent memory.
  - **README:**
    - a new section, "Upgrading an existing project to 0.7.0";
    - Get started points to it;
    - the release notes add the benchmark result, what an older `FLOW.md` still enforces, and the upgrade path;
    - the CLI table: `init` flags never change an existing config, and `doctor` reports `untracked` files;
    - the router: the reverse layout is promoted;
    - `agent-browser` is tied to `ux-advisor`;
    - the repo layout gains `config`, `router`, `detect`, `specs/` and `test/`.
  - **Stale lines fixed:**
    - `design-engineer`: the review reaches it as acceptance criteria, which `FLOW.md` locates;
    - `advisor-detection.md`: a UX agent's knowledge is split into UX, motion and UI conventions;
    - `router.md`: the reverse layout;
    - `providers.md`: no longer points at an unshipped path;
    - `verify.md`: `agent-browser` is needed for the UX review;
    - Brain Schema: `prototype` added to the primary skills;
    - EVAL: the path grep now names init-brain's defaults, plus a new manual row, "Upgrade from 0.6 through the playbook".
  - **Left open (outside this spec, Q10):** `design-engineer`'s charter still covers motion only. The UI scope that Q10 hands it (layout, contrast, focus rings, target size, accessible-name markup, device rendering) has no method there, and the agent has no `Bash` to see a rendered page.
- **Re-running the benchmark.** `benchmark/` keeps everything needed to re-run it after a change to `ux-advisor`: the frozen ground truth, the UX/UI split, the rubric, and every iteration's reviews and scores. `test/EVAL.md` points to it.

