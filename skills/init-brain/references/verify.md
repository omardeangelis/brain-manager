# Verify & Report

Final gate. `$BRAIN doctor` covers the mechanical checks (scaffold present, no `__TODAY__` placeholders, manifest coherent, skill drift); this file covers what the CLI cannot judge, then the report.

## 1. Run doctor

```bash
$BRAIN doctor
```

Must exit 0. `modified` findings are fine **only** if they are deliberate project customizations the user knows about — surface them. `untracked` files inside a bundled skill are leftovers of an older or hand-installed copy: resolve them per migration.md → Leftover files. `outdated`/`missing` → run `$BRAIN upgrade` and re-check. `legacy-layout` / `missing-link` / `wrong-link` → the `.agents/` layout is incomplete; run `$BRAIN upgrade` (migrates) or `$BRAIN link --providers <ids> --force`. `orphan` lines (files this version no longer ships) do not fail it: handle them per upgrade.md → "Files this version no longer ships".

> `$SKILLS_DIR` is the canonical **`.agents/skills`** (the real files live there; each provider's `skills/` is a symlink into it).

## 2. No stale legacy paths or foreign tokens

```bash
# migration only: skills must not reference retired roots
grep -rIlE "docs/|wiki/|\.notes/" "$SKILLS_DIR" 2>/dev/null && echo "WARN: skills still reference legacy paths" || echo "skills point at brain/ ✅"
```

Confirm none of the managed skills carry foreign project tokens (they ship generic):

```bash
grep -rInE "apps/(api|website|spa)|db-schema-architect|ux-research-advisor|opensrc|write-backlog|create-brain-domain" "$SKILLS_DIR"/{create-spec,create-plan,grill-me,tdd,swarm-plan,implement-spec,docs-maintenance,adversarial-review,prototype,design-engineering,ui-review} 2>/dev/null \
  && echo "WARN: residual hardcoded tokens (advisor names are OK only inside the advisors markers)" \
  || echo "skills are generic ✅"
```

> Note: detected advisor names legitimately appear **inside** the `## Project Advisors` markers after Step 3 — that is expected, not a leak.
>
> Note: `$agent-browser` is a bundled suite tool, so its references in `create-plan` / `implement-spec` are expected.

## 3. Browser and device tools

Report both tools with what each one enables. **Never install either**, and never run `agent-browser -p ios` to find out: its launcher may download Appium.

```bash
# Needed for the reviews: report it with its installed version.
if command -v agent-browser >/dev/null 2>&1; then echo "ok  $(agent-browser --version)"
else echo "WARN: agent-browser CLI not installed: the reviews run DEGRADED, from the code only"; fi
# Optional: Mobile Safari in the iOS Simulator, for the device classes of the UI review.
if command -v appium >/dev/null 2>&1 && appium driver list --installed 2>&1 | grep -qi xcuitest; then
  echo "ok  Appium $(appium --version) with the XCUITest driver: Mobile Safari for the device classes"
else echo "note: Appium with the XCUITest driver not installed (optional): device findings stay \"not verified on device\""; fi
```

- **`agent-browser` is needed for the reviews.** `ux-advisor` and `ui-reviewer` review the prototype winner through it, the UI pass of `adversarial-review` measures the served route with it, and `implement-spec` uses it for `browser` and `mixed` validation. The suite works with 0.27.1 or later; below that, tell the user to update. The bundled `agent-browser` skill is only a discovery stub: every caller runs `agent-browser skills get core` first, which serves the usage guide for the installed version. Without the CLI each review runs `DEGRADED` and reports only what the code shows: tell the user to install it (`npm i -g agent-browser`, then `agent-browser install` for the browser), and do not run it yourself.
- **Appium with the XCUITest driver is optional.** It counts as installed only when `appium` is on `PATH` and `appium driver list --installed` lists `xcuitest`. Then `ui-reviewer` adds Mobile Safari in the iOS Simulator for the device classes (Safari's focus behaviour, its toolbars and the safe areas). Without it, each device finding is labelled "not verified on device", with the code hypothesis and a manual check. Installing device tooling is the user's choice; never suggest it as a required step.

## 4. Project config

```bash
$BRAIN config get
```

Check it against the project, by judgment:

- `paths.techDebt` is where the tech-debt pages actually are, and `review.location` / `paths.reviews` match where the existing `REPORT.md` files live (`$BRAIN scan` → `config:` note says "agrees with detection", or every disagreement was a deliberate choice).
- `paths.personas` points at a real page holding the personas (or is `null`, and the user knows `ux-advisor` will characterize users generically).
- `review.mode` is the one the user chose, and the root `AGENTS.md` no longer states a contradicting review policy (references/router.md §3).
- No suite skill or shipped agent was edited to encode a project fact: `$BRAIN doctor` shows no `modified` under them.
- When Step 3 routed a project agent's review knowledge, `brain/chore/ux-review.md` and `brain/chore/ui-review.md` have the base frontmatter and their sections in order, and the Project bar of `ui-review.md` holds only what the user wrote or confirmed.

## 5. Stack profile

```bash
test -f brain/chore/motion-stack.md && echo "ok  stack profile" || echo "WARN: no brain/chore/motion-stack.md — run Step 4"
```

Then read it and check by judgment:

- Its Framework row matches the `frontend` lines from `$BRAIN scan` (or the user's answer when detection fell short).
- On a stack other than React on the web, every Translation row has a source URL and a status (`verified (vX)`, `unverified`, or `none → fallback`). An empty status means the research was skipped.
- It is listed under "Chore" in `brain/index.md`.
- The installed `design-engineering` skill is unmodified (`$BRAIN doctor` shows no `modified` under it) — the adaptation lives in the profile only.

## 6. Print the report

Summarize for the user:

- **Mode:** fresh / migration
- **Brain:** created at `brain/` (or merged); root pages stamped `YYYY-MM-DD`
- **Skills:** installed once into `.agents/skills` — list installed vs adopted vs kept (from the `brain init` report)
- **Agents:** the five shipped advisors installed once into `.agents/agents` (`ux-advisor`, `ui-reviewer`, `design-engineer`, `adversarial-verifier`, `review-classifier`)
- **Tools:** `agent-browser` with its installed version (needed for the reviews), or "not installed: the reviews run `DEGRADED`"; Appium with the XCUITest driver (optional: Mobile Safari for the device classes), or "not installed: device findings are checked by hand"
- **Providers:** which were wired, and the symlinks created (`.claude/skills → ../.agents/skills`, `.claude/agents → ../.agents/agents`, `CLAUDE.md → AGENTS.md`, …)
- **Project config:** the resolved `brain/brain.config.json` values, each with its reason (review mode, review location, tech-debt store, personas source), plus what was extracted or migrated to get there
- **Router:** its class (stub / foreign / partial / complete), what was added, and which overlapping sections were replaced by pointers
- **Migration only:** what was moved (source → dest) and what was deleted
- **Stack profile:** the detected frontend stack, whether the references apply as written (React) or through a researched translation, any `unverified` rows, and the open decisions (libraries the stack lacks — nothing installed)
- **Advisors:** the shipped five are wired into the skill bodies by default; list any *additional* project advisors detected and where each was wired (or "none beyond the shipped five"), and each legacy twin with what happened to it
- **Maintenance:** future syncs are `$BRAIN upgrade`; health checks are `$BRAIN doctor`
- **Next step:** run `create-spec` to author the first `SPEC.md`, then `create-plan` → `implement-spec` → `docs-maintenance` (`prototype` first, when a UI direction is open). Fill in the project's real gates (build/test/lint) in the repo-root `AGENTS.md`; the review policy is `review.mode`.
