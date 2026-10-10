# Upgrade an existing brain

Use this when the scan reports `brain/ — present, manifest v<X>` and `<X>` is older than the package (`$BRAIN --version`). The project already runs the workflow: nothing is scaffolded or migrated, the installed files are brought to this version, and the project facts the new version reads are recorded once. When the skills still live under `.claude/skills`, or `brain/` has no manifest, apply that row of SKILL.md Step 2 first, then come back here.

## 1. Preview, then sync

```bash
$BRAIN upgrade --dry-run
```

Show the user what will update, what is a `conflict` (a locally edited file, skipped), what this version no longer ships (below), and whether the config will be created or completed. Then run `$BRAIN upgrade`. It also installs what is new, such as the `ui-review` skill and the `ui-reviewer` agent.

**Files this version no longer ships.** The dry run lists each removable one as `would remove`, and deletes nothing: preview them before every real run. On the real run, a file the manifest tracks as `managed` and that still matches its manifest hash is `removed`, with the folders it leaves empty. A file edited since install, or whose `## Project Advisors` block holds entries, is `orphan` with "left on disk": it is never deleted, even with `--force`, and it leaves the manifest. Route any project fact in it first, then delete it by hand once nothing references it; until then `$BRAIN doctor` lists it as `untracked`. A file already gone is `orphan` with "missing on disk": it only leaves the manifest. A `--skill` run handles only the files of the skill it names. Before the upgrade, `$BRAIN doctor` lists all of them as `orphan` and still exits 0.

Some files only work together. When one of them is a conflict, the project runs a mix of old and new behavior, so resolve these before moving on:

| Files | What a skipped one breaks |
|---|---|
| `brain/AGENTS.md` and `brain/CLAUDE.md` (the Brain Schema) | The skills point at its `## Project configuration` section (keys, review-mode matrix, tokens). An edited schema has no such section. |
| `prototype`, `create-spec` (with `references/flow-map.md`), `create-plan`, `implement-spec`, the `ux-advisor` agent | The UX and UI reviews run only after a prototype winner is approved, and their decisions become acceptance criteria. An old copy of any of them keeps the old trigger or the old `FLOW.md` contract, and an old `prototype` never spawns `ui-reviewer`. |
| `adversarial-review` and the `adversarial-verifier` and `review-classifier` agents | `SPEC.md` criteria are the only contract and `FLOW.md` a map, and a change to the rendered UI gets a UI pass with the `ui-review` skill. An old copy still treats `FLOW.md` rows as scope, or charters no UI pass. |

For each one, show the diff. Route the project facts in it to the config, `brain/personas.md`, the root `AGENTS.md` or a `brain/chore/` page first, then, with the user's consent, `$BRAIN upgrade --force`. Never hand-merge a suite file to keep a local edit: the next upgrade conflicts again.

## 2. Project context

`upgrade` writes `brain/brain.config.json` from detection, with `review.mode` set to `total` even when the router states another policy. It never changes a value that is already there, and `init` flags never apply to an existing config.

Follow [project-context.md](project-context.md) for the four facts (review mode, personas, tech debt, reviews) and record each with `$BRAIN config set <key> <value>`. Until `paths.personas` is set, `ux-advisor` describes users generically.

## 3. Advisors

Run SKILL.md Step 3. On an upgrade, two parts matter most in [advisor-detection.md](advisor-detection.md):

- **Blocks carried over from an older install.** An older init-brain wired the project's UX or design agents into the `## Project Advisors` blocks of `create-spec`, `create-plan` and `implement-spec`. `upgrade` keeps those blocks, so the old UX trigger keeps firing until you remove the entries.
- **Legacy twins** of the shipped agents, including a project's own UI-review or visual-QA agent, which `ui-reviewer` now replaces. Route their knowledge (UI-review knowledge to `brain/chore/ui-review.md`, leaving its Project bar to the user), replace them, and handle their memory folders per [migration.md](migration.md) §7.

## 4. Router

Run SKILL.md Step 5 ([router.md](router.md)). A hand-written review step in the router contradicts `review.mode`. §3 replaces it with a pointer to the config, once the user confirms.

## 5. Work in flight

- **Specs with a `FLOW.md` in the older format** (Error paths · Edge cases) are still read. However, the verifier and the acceptance audit now check only the numbered `SPEC.md` criteria, so a row no criterion covers is no longer enforced. For a spec not yet implemented, offer to lift the rows the user wants enforced into numbered criteria.
- **Review reports written before the upgrade** never reached the tech-debt store. List the `REPORT.md` files under `<reviews>` and in spec folders that are not marked ingested, and offer to run `docs-maintenance` on each (its review-ingest path).

## 6. Tools and leftovers

- **The `agent-browser` skill.** The bundled copy is now the upstream discovery stub, with its Apache-2.0 `LICENSE` next to it. The usage guide comes from the CLI: every caller runs `agent-browser skills get core` first, so the guide matches the installed version. `upgrade` replaces an untouched bundled copy with the stub, installs the `LICENSE`, and removes the old references and templates (`removed`; an edited one stays on disk as `orphan`, §1). A project-owned copy stays as it is: when `init` found a differing copy that the manifest did not track as `managed`, it recorded the folder as `seed` and reported it `kept` ("project-specific copy"). `upgrade` never touches it and adds no `LICENSE` to it, and `$BRAIN doctor` stays green. Re-running `$BRAIN init` on an older install does not turn an untouched bundled copy into a project one: the files the manifest tracks as `managed` stay managed with their hashes, reported `adopted` ("tracked copy kept"), so the next `upgrade` still installs the stub.
- **The `agent-browser` CLI.** `ux-advisor` and `ui-reviewer` review the prototype in the browser through it, against a dev route that serves, and the UI pass of `adversarial-review` measures the implemented change with it. Without it, each review runs `DEGRADED` and reports only what the code shows. Check it and its version per [verify.md](verify.md) §3, with Appium as optional, and tell the user `npm i -g agent-browser` when it is missing. Install nothing yourself.
- **Untracked files.** `$BRAIN doctor` lists files inside the bundled skills that the package does not ship as `untracked`. Handle them per [migration.md](migration.md) → "Leftover files".
- **Agent memory.** `adversarial-verifier` and `review-classifier` now keep notes under `.claude/agent-memory/<agent>/` (Claude Code). Tell the user where they are.

## 7. Verify

Return to SKILL.md Step 6. The report lists:

- the version change;
- the conflicts resolved, and how;
- the config values, each with its reason;
- the advisor entries removed;
- the in-flight specs and reports you flagged.
