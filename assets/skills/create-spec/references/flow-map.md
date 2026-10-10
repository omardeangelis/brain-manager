# The prototype review and the `FLOW.md` map

Use this reference when the spec starts from an approved `prototype` winner that `ux-advisor` reviewed. Two rules hold throughout:

- **`SPEC.md` is the only acceptance contract.** Everything the review asks for that the spec adopts becomes an acceptance criterion there.
- **`FLOW.md` is a map, not a second contract.** It shows where each criterion lives in the flow. Every requirement in it cites an acceptance-criterion id; a requirement stated only in `FLOW.md` is a defect, and the verifier ignores a row with no id.

## Where the review comes from

- **In context:** `prototype` Phase 6 opened this run right after the review.
- **`UX-REVIEW.md`:** the user stopped between the review and the spec, so `prototype` saved it next to the surviving variant. Read it from the cited prototype path. It is deleted with the prototype surface.

No review means no `FLOW.md`. Do not write one from your own reading of the prototype.

## Fold the review into `SPEC.md`

Number the acceptance criteria (`AC1`, `AC2`, …) so `FLOW.md` can cite them.

| Review section | Goes to |
|---|---|
| Verdict | one line in Context: the verdict and the review date |
| Prototype changes (applied in the iterate loop) | Decision Log, each with its exact values: decisions already taken, like the winner's own |
| Decisions | one acceptance criterion each, from the review's criterion text. P0 and P1 stay unless the user overrules them; a P2 the user drops goes to Non-Goals |
| Task accessibility fixes | **one** criterion that lists them, one line each with its location |
| Outcomes and states | each `missing` or `not reachable` row with a consequence is already a decision. A row whose outcome is a business fact nobody has decided becomes an open question |
| Leaving and interrupting | each row is already a decision; the rows that behave are not listed |
| Persona situations and dependencies | Context names the personas. A dependency on another flow, feature or data goes to Constraints, or to Open Questions when it is unresolved |
| Already broken around the surface | a criterion when the spec must fix it; otherwise Technical Notes, or Non-Goals with the reason |
| Where the spec will be misread | tighten the wording of the criteria it names |
| Manual checks still needed | Constraints ("verified manually: …"), so the plan schedules them |
| Open questions | Open Questions, each row with the recommended default |

Do not copy anything else from the review into the spec: the evidence stays in the review.

**A rejected finding** is dropped from the spec. Offer to append it to `brain/chore/ux-review.md` → **Suppressed findings**, as one line: the finding, where it was, and why the project rejected it. `ux-advisor` reads that page before every review, so the same finding does not come back. Create the page on first use, with three sections: **Component traps** · **Kept examples** · **Suppressed findings**. Use the base frontmatter with `domain: _root`, `type: concept`.

## `FLOW.md` template

Write it at `brain/specs/<domain>/<spec>/FLOW.md`, in about 150 lines at most. Keep only user-observable behavior: no component names, no data-fetching, no implementation detail (those belong in `PLAN.md`).

```markdown
# Flow map: <feature>

> Map of [[specs/<domain>/<spec>/SPEC]]. Every requirement cites an acceptance criterion there; `SPEC.md` is the contract.
> Source: `ux-advisor` review of the prototype at `<path>` (`<route>`), <date>, verdict `<verdict>`.

## Goal
<the user goal and the signal that proves it worked, in one sentence> (AC…)

## Persona situations
- <segment from the personas page> × <entry point> × <permissions> × <device> × <data volume> × <prior knowledge> — what differs for them here (AC…)

## Entry points
- <where and how the user arrives; preconditions; role> (AC…)

## Happy path
1. <user intent> → <visible system response> (AC…)
→ Outcome: <the observable success state> (AC…)

## States
| Action or region | Outcome, state, or interruption | Criterion |
|---|---|---|
| <action> | success | present |
| <action> | uncertain (timeout after send) | AC3 |
| <action> | closed while saving | AC4 |
| <region> | empty | open question 2 |

## Accessibility
- Keyboard path of each primary task: where focus goes after each action; dialogs and menus: focus moves in, Tab stays inside, Escape closes, focus returns (AC…)
- Announcements of each outcome (AC…)
- Task accessibility fixes (AC…)
- Manual checks still needed: <screen-reader steps>

## Persona dependencies
- <hand-off: one persona's action creates a state another must see> (AC…)
- <dependency on another flow, feature or data> (AC… or open question #)
```

Fill rules:

- **Happy path:** at most 10 steps.
- **States:** one row per outcome, state, or interruption from the review. A `present` row needs no id; any other row cites the criterion that settles it, or the open question.
- **Persona situations:** only where situations differ. Use the segments in `<personas>` verbatim; when `paths.personas` is `null`, describe the roles and point to the open question.
- **Every bullet ends with an id.** If one has no criterion behind it, either add the criterion to `SPEC.md` or delete the bullet.

## Older `FLOW.md` files

Files written before this format (sections Personas · Error paths · Edge cases · Friction notes) stay as they are. Readers accept both. Rewrite one into this shape only when its spec is revised.
