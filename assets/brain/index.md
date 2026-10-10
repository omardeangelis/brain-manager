---
domain: _root
type: index
links: []
created: __TODAY__
updated: __TODAY__
---

# Brain — Master Map

Entry point of the knowledge base. Links the work areas: chore (informal planning), specs (PM-authored), domains (synthesized by `docs-maintenance`), the tech-debt store (`<techDebt>`, persistent drift), and the project config (`brain.config.json`).

## Chore (planning material)

_empty — add planning pages under `chore/` (e.g. tech stack, product description, user stories, implementation backlog)._

## Domains

> Domain pages (`domains/<domain>/<domain>.md` + `<domain>-contract.md` + `concepts/` + `flows/` + `decisions/`) are created by the `docs-maintenance` flow when a spec in that domain is ready to be ingested. Until then a domain appears here only via its spec map.

_empty_

## Specs (per domain)

_empty_

## Tech debt

_empty_

## Reviews

> `adversarial-review` writes SHIP/DO-NOT-SHIP reports. Standalone reviews land under `<reviews>/<slug>/`; spec-implementation reviews land in the spec's review folder — inside the spec folder (`review.location: spec-folder`) or at `<reviews>/<domain>/<spec>/` (`review-tree`). Paths come from `brain/brain.config.json` (see `AGENTS.md` → Project configuration).

_empty_

## Log

- [[log|log.md]] — append-only ingest/spec log (max 50 entries)
