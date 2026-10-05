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

**Status:** Planned — not started. Written to be executed in a separate session.
**Branch:** `feat/project-config-and-flow-modes` (this plan is its first commit).
**Spec:** [SPEC.md](SPEC.md) · **Evidence:** [REFERENCE-sevedemo.md](REFERENCE-sevedemo.md), [RESEARCH-ux-advisor.md](RESEARCH-ux-advisor.md)

## Before you start

1. **Read the docs:**
   - [SPEC.md](SPEC.md): the contract;
   - [REFERENCE-sevedemo.md](REFERENCE-sevedemo.md): why;
   - [RESEARCH-ux-advisor.md](RESEARCH-ux-advisor.md): why the UX agent is redesigned, and the benchmark that accepts it;
   - `test/EVAL.md`: the release bar;
   - `README.md` § "How upgrades stay safe".
2. **Resolve the open questions SPEC Q1–Q9 with the maintainer first.** The plan follows each recommendation. A different answer changes:
   - Q1 → T11;
   - Q2 → T9;
   - Q3, Q8, Q9 → T11b;
   - Q4 → T6;
   - Q5 → T14;
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
  - Single-file stores: per SPEC Q2 (recommended: migrate).
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
  - `ux-advisor` reads `<personas>` first and uses those personas verbatim. Generic axes and an open question are the fallback, only when `paths.personas` is `null`.
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
    - Relay the verdict to the user. On `rethink`, offer another Phase 3 round around the winner, or proceeding with the risk recorded (Q8).
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
  - The agent has the §7.4 headings, the moment table, the three verdicts and the DEGRADED rule.
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
- **validation:** Grep `root \`AGENTS.md\`` in `assets/agents`: every occurrence carries the fallback, or sits in a sentence that already states it.
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

_Empty — append one line per completed task: `T<n> — <date> — <result / deviation>`._
