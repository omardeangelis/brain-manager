import { Command, Options } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import { ADVISORS_START, carryAdvisorsOver, hasAdvisorMarkers } from "../core/advisors.js"
import { contentHash } from "../core/hash.js"
import { MANIFEST_PATH, type Manifest, type ManifestEntry, type ManifestLink, decodeManifest, defaultRole, encodeManifest } from "../core/manifest.js"
import { CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_DIR } from "../core/providers.js"
import { type ReportLine, renderReport, renderReportJson } from "../core/report.js"
import { stampToday } from "../core/stamp.js"
import { Assets } from "../services/Assets.js"
import { exists, readTextOrNull, writeText } from "../services/fsx.js"
import { resolveProviders, runLink } from "../services/linker.js"
import { VERSION } from "../version.js"

/**
 * `brain init` — additive by design, so an LLM (or a human) can run it on any
 * project without risk:
 * - brain/ scaffold: only missing files are written (seed role, dates stamped).
 * - skills: absent → installed; present-and-identical → up to date;
 *   present-but-different → ADOPTED into the manifest with their current hash
 *   (nothing overwritten — `brain upgrade` then syncs them cleanly).
 * - agent-browser: a differing pre-existing copy is treated as project-owned
 *   (seed) and never upgraded.
 * - `--force`: overwrite differing process skills with the bundled version,
 *   carrying the `## Project Advisors` block over. brain/ is never forced.
 */

const force = Options.boolean("force").pipe(
  Options.withDescription(
    "Overwrite locally modified process skills with the bundled versions (advisor blocks are preserved). Never touches brain/ content."
  )
)
const json = Options.boolean("json").pipe(
  Options.withDescription("Emit the report as JSON (machine/agent friendly).")
)
const skillsDir = Options.text("skills-dir").pipe(
  Options.withDescription(
    "Canonical skills directory to install into (advanced; default: .agents/skills). Provider symlinks are only wired for the default."
  ),
  Options.optional
)
const providers = Options.text("providers").pipe(
  Options.withDescription(
    "Comma-separated provider ids to wire into the .agents/-canonical layout (e.g. claude,codex,cursor). Default: auto-detect, else claude."
  ),
  Options.optional
)

export const initCommand = Command.make(
  "init",
  { force, json, skillsDir, providers },
  (opts) =>
    Effect.gen(function* () {
      const assets = yield* Assets
      const targetSkillsDir = Option.isSome(opts.skillsDir)
        ? opts.skillsDir.value
        : CANONICAL_SKILLS_DIR

      const lines: Array<ReportLine> = []
      const entries: Array<ManifestEntry> = []

      // --- brain/ scaffold: additive ------------------------------------
      for (const [relPath, asset] of assets.brain) {
        const onDisk = yield* readTextOrNull(relPath)
        if (onDisk === null) {
          const content = stampToday(asset.content)
          yield* writeText(relPath, content)
          entries.push({ path: relPath, role: defaultRole(relPath), hash: contentHash(content) })
          lines.push({ path: relPath, status: "created" })
        } else {
          entries.push({ path: relPath, role: defaultRole(relPath), hash: contentHash(onDisk) })
          lines.push({ path: relPath, status: "kept", note: "already present — left untouched" })
        }
      }

      // --- skill suite ---------------------------------------------------
      for (const name of assets.skillNames) {
        const files = assets.skills.get(name)!
        const destDir = `${targetSkillsDir}/${name}`

        if (!(yield* exists(destDir))) {
          for (const [rel, asset] of files) {
            yield* writeText(`${targetSkillsDir}/${rel}`, asset.content)
            entries.push({ path: `${targetSkillsDir}/${rel}`, role: "managed", hash: asset.hash })
          }
          lines.push({ path: destDir, status: "installed" })
          continue
        }

        // Skill directory already exists: compare file by file.
        const disk = new Map<string, string | null>()
        for (const rel of files.keys()) {
          disk.set(rel, yield* readTextOrNull(`${targetSkillsDir}/${rel}`))
        }
        const differs = [...files].some(
          ([rel, asset]) => disk.get(rel) === null || contentHash(disk.get(rel)!) !== asset.hash
        )

        if (!differs) {
          for (const [rel, asset] of files) {
            entries.push({ path: `${targetSkillsDir}/${rel}`, role: "managed", hash: asset.hash })
          }
          lines.push({ path: destDir, status: "up-to-date" })
          continue
        }

        if (name === "agent-browser") {
          // Project-specific copy (e.g. real OAuth profiles): never clobber.
          for (const [rel] of files) {
            const content = disk.get(rel)
            if (content !== null && content !== undefined) {
              entries.push({
                path: `${targetSkillsDir}/${rel}`,
                role: "seed",
                hash: contentHash(content)
              })
            }
          }
          lines.push({ path: destDir, status: "kept", note: "project-specific copy detected — left as-is" })
          continue
        }

        if (opts.force) {
          for (const [rel, asset] of files) {
            const current = disk.get(rel)
            const content =
              current !== null && current !== undefined && hasAdvisorMarkers(asset.content)
                ? carryAdvisorsOver(current, asset.content)
                : asset.content
            yield* writeText(`${targetSkillsDir}/${rel}`, content)
            entries.push({ path: `${targetSkillsDir}/${rel}`, role: "managed", hash: asset.hash })
          }
          lines.push({ path: destDir, status: "updated", note: "overwritten (--force); review with git diff" })
          continue
        }

        // Adopt: record what is on disk; write only the missing files.
        for (const [rel, asset] of files) {
          const current = disk.get(rel)
          if (current === null || current === undefined) {
            yield* writeText(`${targetSkillsDir}/${rel}`, asset.content)
            entries.push({ path: `${targetSkillsDir}/${rel}`, role: "managed", hash: asset.hash })
          } else {
            entries.push({
              path: `${targetSkillsDir}/${rel}`,
              role: "managed",
              hash: contentHash(current)
            })
          }
        }
        lines.push({
          path: destDir,
          status: "adopted",
          note: "differs from bundled version — run `brain upgrade` to sync"
        })
      }

      // --- agent suite (shipped advisor subagents) -----------------------
      // Flat managed files under the canonical .agents/agents; same additive /
      // adopt / --force semantics as the skill suite, at file granularity.
      for (const [rel, asset] of assets.agents) {
        const dest = `${CANONICAL_AGENTS_DIR}/${rel}`
        const onDisk = yield* readTextOrNull(dest)
        if (onDisk === null) {
          yield* writeText(dest, asset.content)
          entries.push({ path: dest, role: "managed", hash: asset.hash })
          lines.push({ path: dest, status: "installed" })
        } else if (contentHash(onDisk) === asset.hash) {
          entries.push({ path: dest, role: "managed", hash: asset.hash })
          lines.push({ path: dest, status: "up-to-date" })
        } else if (opts.force) {
          yield* writeText(dest, asset.content)
          entries.push({ path: dest, role: "managed", hash: asset.hash })
          lines.push({ path: dest, status: "updated", note: "overwritten (--force); review with git diff" })
        } else {
          entries.push({ path: dest, role: "managed", hash: contentHash(onDisk) })
          lines.push({ path: dest, status: "adopted", note: "differs from bundled version — run `brain upgrade` to sync" })
        }
      }

      // --- provider wiring (.agents/-canonical layout) ----------------------
      // Only for the default canonical location; a --skills-dir override opts out.
      let providerIds: Array<string> = []
      let links: Array<ManifestLink> = []
      const canonical = targetSkillsDir === CANONICAL_SKILLS_DIR
      if (canonical) {
        const selected = yield* resolveProviders(opts.providers)
        const result = yield* runLink({
          providers: selected,
          currentSkillsDir: targetSkillsDir,
          force: opts.force,
          dryRun: false
        })
        for (const l of result.lines) lines.push(l)
        providerIds = selected.map((p) => p.id)
        links = result.links
      }

      // --- manifest --------------------------------------------------------
      const now = new Date().toISOString()
      const previous = yield* readTextOrNull(MANIFEST_PATH)
      const createdAt = previous === null
        ? now
        : yield* decodeManifest(previous).pipe(
            Effect.map((m) => m.createdAt),
            Effect.orElseSucceed(() => now)
          )
      const manifest: Manifest = {
        packageVersion: VERSION,
        createdAt,
        updatedAt: now,
        skillsDir: targetSkillsDir,
        files: entries,
        providers: providerIds,
        links
      }
      yield* writeText(MANIFEST_PATH, yield* encodeManifest(manifest))

      const report = {
        command: "init",
        lines,
        notes: [
          `canonical skills directory: ${targetSkillsDir}`,
          ...(canonical
            ? [`providers wired: ${providerIds.join(", ") || "(none)"}`]
            : ["--skills-dir override: provider symlinks not wired (run `brain link` to wire them)"]),
          ...(Option.isSome(opts.providers) && !canonical
            ? ["--providers ignored because --skills-dir was overridden"]
            : []),
          `manifest written to ${MANIFEST_PATH}`,
          "`$simplify` is expected as a global/built-in skill — not bundled",
          "the agent-browser CLI is a separate global install (`npm i -g agent-browser`) — only needed for browser validation",
          `next: wire project advisors (the \`${ADVISORS_START}\` blocks), then run \`brain doctor\``
        ],
        ok: true
      }
      yield* Console.log(opts.json ? renderReportJson(report) : renderReport(report))
    })
).pipe(Command.withDescription("Scaffold brain/ and install the skill suite (additive — never overwrites existing content)."))
