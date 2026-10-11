# Scoring rubric (T17, same text for baseline and new reviews)

You score ONE review document against a FROZEN list of ground-truth defects (each with an ID). Judge only from the document's text.

For every ground-truth defect, decide:

- **hit** — the document identifies the same failure on the same element or state, or explicitly requires the behavior/state whose absence is the defect, specifically enough that a spec written from it would have prevented the defect. Example: the defect is "focus not returned to the trigger on close" and the document says focus must return to the trigger on close (or reports that it does not).
- **partial** — the document touches the same area but not the failing behavior (e.g. "handle focus correctly", "consider errors"), or names it without a usable requirement.
- **miss** — nothing relevant.

Quote the shortest exact phrase from the document that justifies each hit or partial (with its section heading). Never infer a hit from general intent.

Then count, from the document itself:

- **lines** — total lines;
- **findings** — the number of distinct issues/decisions/requirements it raises (for a FLOW.md: the error paths + edge cases + friction notes; for a review: decisions + mechanical fixes + already-broken items);
- **open questions** — how many, and how many carry a recommended default;
- **decisions with default and acceptance criterion** — for a review: decisions that carry both; for a FLOW.md: write n/a;
- **runtime claims without evidence** — statements about how the rendered UI behaves (focus lands X, layout breaks at Y, announces Z) that cite no observation (trace step, screenshot, axe rule, matrix cell, code line). For a FLOW.md, count only claims stated as observed facts about current behavior, not requirements.

Return exactly:

1. A table `| GT ID | verdict (hit/partial/miss) | quote + section |`, one row per ground-truth defect.
2. A line: `strict recall = hits / N; lenient recall = (hits + 0.5 × partials) / N`.
3. The counts above, one per line.
4. Up to 5 findings in the document that are NOT in the ground truth but look like real, user-observable problems (one line each) — these feed the validity judgement.
