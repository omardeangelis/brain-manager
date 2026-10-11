import { Command, Options } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import { ADVISORS_START, carryAdvisorsOver, hasAdvisorMarkers } from "../core/advisors.js"
import { contentHash } from "../core/hash.js"
import { MANIFEST_PATH, type Manifest, type ManifestEntry, type ManifestLink, decodeManifest, defaultRole, encodeManifest, rewriteSkillsDir } from "../core/manifest.js"
import { type ConfigKey, REVIEW_LOCATIONS, REVIEW_MODES } from "../core/config.js"
import { CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_DIR } from "../core/providers.js"
import { type ReportLine, renderReport, renderReportJson } from "../core/report.js"
import { stampToday } from "../core/stamp.js"
import { Assets } from "../services/Assets.js"
import { collectContext } from "../services/context.js"
import { exists, readTextOrNull, writeText } from "../services/fsx.js"
import { resolveProviders, runLink } from "../services/linker.js"
import { applyOverrides, ensureConfig } from "../services/project-config.js"
import { VERSION } from "../version.js"

/**
 * `brain init` — additive by design, so an LLM (or a human) can run it on any
 * project without risk:
 * - brain/ scaffold: only missing files are written (seed role, dates stamped).
 * - skills: absent → installed; present-and-identical → up to date;
 *   present-but-different → ADOPTED into the manifest with their current hash
 *   (nothing overwritten — `brain upgrade` then syncs them cleanly).
 * - a re-run keeps what the previous manifest tracks as `managed` and the disk
 *   still matches: the entry keeps its hash even when the bundled version
 *   moved on (so `brain upgrade` updates the file), and such a file this
 *   version no longer ships, inside a bundled skill, stays tracked (so
 *   `brain upgrade` removes it).
 * - agent-browser: a differing copy the previous manifest does not track as
 *   `managed` is treated as project-owned (seed) and never upgraded.
 * - `--force`: overwrite differing process skills with the bundled version,
 *   carrying the `## Project Advisors` block over. brain/ is never forced.
 * - project config (`brain/brain.config.json`, seed): written from detection
 *   plus flags when absent; an existing one only gains missing keys.
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
const reviewMode = Options.choice("review-mode", REVIEW_MODES).pipe(
  Options.withDescription(
    "How much clean-context review the flows start on their own: total (spec, plan and code), plan (plan only), none (only on request). Default: what the root router states, else total."
  ),
  Options.optional
)
const reviewLocation = Options.choice("review-location", REVIEW_LOCATIONS).pipe(
  Options.withDescription("Advanced: where spec reviews are written (default: detected, else spec-folder)."),
  Options.optional
)
const techDebtDir = Options.text("tech-debt-dir").pipe(
  Options.withDescription("Advanced: the project's tech-debt directory (default: detected, else brain/tech-debt)."),
  Options.optional
)
const personas = Options.text("personas").pipe(
  Options.withDescription("Advanced: the project's persona file, or null (default: detected, else null)."),
  Options.optional
)

export const initCommand = Command.make(
  "init",
  { force, json, skillsDir, providers, reviewMode, reviewLocation, techDebtDir, personas },
  (opts) =>
    Effect.gen(function* () {
      const assets = yield* Assets
      const targetSkillsDir = Option.isSome(opts.skillsDir)
        ? opts.skillsDir.value
        : CANONICAL_SKILLS_DIR

      // Project facts are read before anything is written (the router may be
      // promoted below), and validated flags fail before any change.
      const context = yield* collectContext({ shippedAgents: new Set(assets.agents.keys()) })
      const overrides: Array<readonly [ConfigKey, string]> = [
        ...Option.toArray(opts.reviewMode).map((v) => ["review.mode", v] as const),
        ...Option.toArray(opts.reviewLocation).map((v) => ["review.location", v] as const),
        ...Option.toArray(opts.techDebtDir).map((v) => ["paths.techDebt", v] as const),
        ...Option.toArray(opts.personas).map((v) => ["paths.personas", v] as const)
      ]
      yield* applyOverrides({}, overrides)

      const lines: Array<ReportLine> = []
      const entries: Array<ManifestEntry> = []

      // --- previous manifest -------------------------------------------------
      // Read before the skills: what an earlier install tracks as `managed` is
      // carried forward instead of re-judged. Its paths are mapped to the target
      // skills dir, so a manifest recorded under a legacy `.claude/skills`
      // still matches.
      const now = new Date().toISOString()
      const previousRaw = yield* readTextOrNull(MANIFEST_PATH)
      const previous = previousRaw === null
        ? null
        : yield* decodeManifest(previousRaw).pipe(Effect.option, Effect.map(Option.getOrNull))
      const previousManaged = new Map(
        (previous === null ? [] : rewriteSkillsDir(previous.files, previous.skillsDir, targetSkillsDir))
          .filter((f) => f.role === "managed")
          .map((f) => [f.path, f] as const)
      )

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

        // The copy an earlier install wrote: previous `managed` entries in this
        // folder whose file still matches the recorded hash.
        const tracked = new Map<string, ManifestEntry>()
        let trackedManaged = false
        for (const [path, entry] of previousManaged) {
          if (!path.startsWith(`${destDir}/`)) continue
          trackedManaged = true
          const content = yield* readTextOrNull(path)
          if (content !== null && contentHash(content) === entry.hash) tracked.set(path, entry)
        }
        // Files of that copy this version no longer ships stay tracked, so
        // `brain upgrade` can remove them; init itself never deletes.
        const shipped = new Set([...files.keys()].map((rel) => `${targetSkillsDir}/${rel}`))
        const carried = [...tracked.values()].filter((e) => !shipped.has(e.path))
        const carriedNote = carried.length > 0
          ? `${carried.length} file(s) no longer shipped stay tracked until \`brain upgrade\``
          : null

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
          entries.push(...carried)
          lines.push({ path: destDir, status: "up-to-date", ...(carriedNote === null ? {} : { note: carriedNote }) })
          continue
        }

        if (name === "agent-browser" && !trackedManaged) {
          // Project-specific copy (e.g. real OAuth profiles): never clobber.
          // A copy the previous manifest tracks as managed is ours, and is not.
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
          entries.push(...carried)
          lines.push({
            path: destDir,
            status: "updated",
            note: ["overwritten (--force); review with git diff", ...(carriedNote === null ? [] : [carriedNote])].join("; ")
          })
          continue
        }

        // Adopt: record what is on disk; write only the missing files. A file
        // the previous manifest tracks as managed, still untouched, keeps its
        // entry (same hash), so `brain upgrade` updates it like any older copy.
        for (const [rel, asset] of files) {
          const dest = `${targetSkillsDir}/${rel}`
          const current = disk.get(rel)
          if (current === null || current === undefined) {
            yield* writeText(dest, asset.content)
            entries.push({ path: dest, role: "managed", hash: asset.hash })
          } else {
            entries.push({ path: dest, role: "managed", hash: tracked.get(dest)?.hash ?? contentHash(current) })
          }
        }
        entries.push(...carried)
        lines.push({
          path: destDir,
          status: "adopted",
          note: tracked.size > 0
            ? ["tracked copy kept; run `brain upgrade`", ...(carriedNote === null ? [] : [carriedNote])].join(" — ")
            : "differs from bundled version — run `brain upgrade` to sync"
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

      // --- project config (seed): detection ⊕ flags; an existing file only gains missing keys
      const projectConfig = yield* ensureConfig({ suggestions: context.suggested.suggestions, overrides, dryRun: false })
      lines.push(projectConfig.line)
      if (projectConfig.entry !== null) entries.push(projectConfig.entry)

      // --- manifest --------------------------------------------------------
      const manifest: Manifest = {
        packageVersion: VERSION,
        createdAt: previous?.createdAt ?? now,
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
          ...projectConfig.notes,
          "`$simplify` is expected as a global/built-in skill — not bundled",
          "the agent-browser CLI is a separate global install (`npm i -g agent-browser`) — only needed for browser validation",
          `next: wire project advisors (the \`${ADVISORS_START}\` blocks), adapt design-engineering to the frontend stack (${targetSkillsDir}/design-engineering/references/stack-adaptation.md → brain/chore/motion-stack.md), then run \`brain doctor\``
        ],
        ok: true
      }
      yield* Console.log(opts.json ? renderReportJson(report) : renderReport(report))
    })
).pipe(Command.withDescription("Scaffold brain/ and install the skill suite (additive — never overwrites existing content)."))
