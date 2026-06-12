import { Command, Options } from "@effect/cli"
import { Console, Effect } from "effect"
import {
  MANIFEST_PATH,
  type Manifest,
  decodeManifest,
  encodeManifest,
  rewriteSkillsDir
} from "../core/manifest.js"
import {
  CANONICAL_SKILLS_DIR,
  PROVIDERS,
  type Provider,
  byId,
  providerForSkillsDir,
  uniqueProviders
} from "../core/providers.js"
import { renderReport, renderReportJson } from "../core/report.js"
import { exists, readTextOrNull, writeText } from "../services/fsx.js"
import { resolveProviders, runLink } from "../services/linker.js"
import { VERSION } from "../version.js"

/**
 * `brain link` — wire one or more AI providers into the `.agents/`-canonical
 * layout: real skills live in `.agents/skills`, each skill-capable provider gets
 * `<provider>/skills -> ../.agents/skills`, and the root `AGENTS.md` is canonical
 * with a `CLAUDE.md -> AGENTS.md` symlink for Claude.
 *
 * Additive and idempotent: providers already recorded in the manifest are kept,
 * an existing correct symlink is `up-to-date`, and a real dir/file where a
 * symlink belongs is a `conflict` (skipped unless `--force`), never clobbered.
 */

const providers = Options.text("providers").pipe(
  Options.withDescription(
    `Comma-separated provider ids to wire (known: ${PROVIDERS.map((p) => p.id).join(", ")}). Default: auto-detect present providers, else claude.`
  ),
  Options.optional
)
const force = Options.boolean("force").pipe(
  Options.withDescription("Replace a conflicting real dir/file or wrong symlink with the intended link.")
)
const dryRun = Options.boolean("dry-run").pipe(
  Options.withDescription("Show what would change without touching the filesystem.")
)
const json = Options.boolean("json").pipe(
  Options.withDescription("Emit the report as JSON (machine/agent friendly).")
)

export const linkCommand = Command.make("link", { providers, force, dryRun, json }, (opts) =>
  Effect.gen(function* () {
    // --- resolve the provider selection --------------------------------------
    const requested = yield* resolveProviders(opts.providers)

    // --- manifest + current skills location ----------------------------------
    const manifestRaw = yield* readTextOrNull(MANIFEST_PATH)
    const manifest =
      manifestRaw === null
        ? null
        : yield* decodeManifest(manifestRaw).pipe(
            Effect.map((m): Manifest | null => m),
            Effect.orElseSucceed(() => null)
          )
    const currentSkillsDir =
      manifest?.skillsDir ?? ((yield* exists(CANONICAL_SKILLS_DIR)) ? CANONICAL_SKILLS_DIR : null)

    // Union: previously-wired providers + the owner of the legacy skills dir (so
    // its directory is re-symlinked after migration) + this request.
    const existing = (manifest?.providers ?? [])
      .map(byId)
      .filter((p): p is Provider => p !== undefined)
    const legacyOwner =
      currentSkillsDir !== null && currentSkillsDir !== CANONICAL_SKILLS_DIR
        ? providerForSkillsDir(currentSkillsDir)
        : undefined
    const finalProviders = uniqueProviders([
      ...(legacyOwner ? [legacyOwner] : []),
      ...existing,
      ...requested
    ])

    // --- execute -------------------------------------------------------------
    const result = yield* runLink({
      providers: finalProviders,
      currentSkillsDir,
      force: opts.force,
      dryRun: opts.dryRun
    })
    const migrated = result.actions.find((a) => a._tag === "MigrateSkills")

    // --- manifest write ------------------------------------------------------
    if (!opts.dryRun) {
      const now = new Date().toISOString()
      const files =
        migrated && migrated._tag === "MigrateSkills" && manifest
          ? rewriteSkillsDir(manifest.files, migrated.from, migrated.to)
          : (manifest?.files ?? [])
      const next: Manifest = {
        packageVersion: manifest?.packageVersion ?? VERSION,
        createdAt: manifest?.createdAt ?? now,
        updatedAt: now,
        skillsDir: result.skillsDir,
        files,
        providers: finalProviders.map((p) => p.id),
        links: result.links
      }
      yield* writeText(MANIFEST_PATH, yield* encodeManifest(next))
    }

    const conflicts = result.lines.filter((l) => l.status === "conflict").length
    const report = {
      command: opts.dryRun ? "link --dry-run" : "link",
      lines: result.lines,
      notes: [
        `canonical skills: ${result.skillsDir}`,
        `providers wired: ${finalProviders.map((p) => p.id).join(", ")}`,
        ...(manifest === null
          ? ["no brain manifest found — run `brain init` to scaffold and populate the skills"]
          : []),
        ...(opts.dryRun ? ["dry run — nothing was written"] : []),
        ...(conflicts > 0 ? [`${conflicts} conflict(s) skipped — re-run with --force to overwrite`] : [])
      ],
      ok: true
    }
    yield* Console.log(opts.json ? renderReportJson(report) : renderReport(report))
  })
).pipe(
  Command.withDescription(
    "Wire AI providers into the .agents/-canonical layout (symlink skills + root AGENTS.md)."
  )
)
