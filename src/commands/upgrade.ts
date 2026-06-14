import { Command, Options } from "@effect/cli"
import { Console, Effect } from "effect"
import { carryAdvisorsOver, hasAdvisorMarkers } from "../core/advisors.js"
import { contentHash } from "../core/hash.js"
import { MANIFEST_PATH, type Manifest, type ManifestEntry, decodeManifest, defaultRole, encodeManifest, reconcileRoles, rewriteSkillsDir } from "../core/manifest.js"
import { planUpgrade, type UpgradeAction } from "../core/plan.js"
import { CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_DIR, type Provider, byId, providerForSkillsDir, uniqueProviders } from "../core/providers.js"
import { type ReportLine, renderReport, renderReportJson } from "../core/report.js"
import { stampToday } from "../core/stamp.js"
import { CliError } from "../errors.js"
import { Assets, type AssetFile } from "../services/Assets.js"
import { readTextOrNull, writeText } from "../services/fsx.js"
import { detectProviders, runLink } from "../services/linker.js"
import { VERSION } from "../version.js"

/**
 * `brain upgrade` — sync managed files to the version bundled with this
 * package, using the manifest to distinguish "untouched since install" (safe
 * to update) from "locally modified" (conflict: skipped unless --force).
 * Seed files (brain/ content, project-owned agent-browser) are only restored
 * when missing, never overwritten. Advisor blocks survive every update.
 */

const force = Options.boolean("force").pipe(
  Options.withDescription("Also overwrite locally modified managed files (conflicts).")
)
const dryRun = Options.boolean("dry-run").pipe(
  Options.withDescription("Show what would change without writing anything.")
)
const json = Options.boolean("json").pipe(
  Options.withDescription("Emit the report as JSON (machine/agent friendly).")
)
const noMigrate = Options.boolean("no-migrate").pipe(
  Options.withDescription("Skip the automatic migration to the .agents/-canonical layout.")
)

const STATUS: Record<UpgradeAction["_tag"], string> = {
  Install: "installed",
  Update: "updated",
  Restore: "restored",
  UpToDate: "up-to-date",
  KeepLocal: "kept",
  Conflict: "conflict",
  Orphan: "orphan"
}

export const upgradeCommand = Command.make(
  "upgrade",
  { force, dryRun, json, noMigrate },
  (opts) =>
    Effect.gen(function* () {
      const assets = yield* Assets

      const manifestRaw = yield* readTextOrNull(MANIFEST_PATH)
      if (manifestRaw === null) {
        return yield* new CliError({
          message: `no manifest at ${MANIFEST_PATH} — run \`brain init\` first`
        })
      }
      let manifest = yield* decodeManifest(manifestRaw).pipe(
        Effect.mapError((e) => new CliError({ message: `unreadable manifest: ${e.message}` }))
      )

      // --- reconcile the .agents/-canonical layout --------------------------
      // Migrates a legacy `.claude/skills` install (skills under a provider dir,
      // no `.agents/`) to canonical, AND on every run refreshes provider symlinks
      // so a pre-existing install picks up the newly-shipped agents symlink
      // (`.claude/agents → ../.agents/agents`) without a re-init. Steady-state
      // (everything already linked) adds no noise — only changed links are shown.
      const migrationLines: Array<ReportLine> = []
      let didMigrate = false
      if (!opts.noMigrate) {
        const migrating = manifest.skillsDir !== CANONICAL_SKILLS_DIR
        const owner = migrating ? providerForSkillsDir(manifest.skillsDir) : undefined
        const recorded = manifest.providers.map(byId).filter((p): p is Provider => p !== undefined)
        const detected = yield* detectProviders
        const providers = uniqueProviders([...(owner ? [owner] : []), ...recorded, ...detected])

        if (providers.length > 0) {
          const result = yield* runLink({
            providers,
            currentSkillsDir: migrating ? manifest.skillsDir : CANONICAL_SKILLS_DIR,
            force: false,
            dryRun: opts.dryRun
          })
          const moved = result.actions.find((a) => a._tag === "MigrateSkills")
          didMigrate = moved !== undefined
          for (const l of result.lines) {
            if (didMigrate || (l.status !== "up-to-date" && l.status !== "skipped")) {
              migrationLines.push(l)
            }
          }
          manifest = {
            ...manifest,
            skillsDir: CANONICAL_SKILLS_DIR,
            files: moved && moved._tag === "MigrateSkills"
              ? rewriteSkillsDir(manifest.files, moved.from, moved.to)
              : manifest.files,
            providers: providers.map((p) => p.id),
            links: result.links
          }
        }
      }

      // Promote any Brain Schema files an older install recorded as seed, so
      // they pick up schema updates as managed files (pre-split installs only).
      manifest = { ...manifest, files: reconcileRoles(manifest.files) }

      // Bundled assets, keyed by their path in this project.
      const assetFiles = new Map<string, AssetFile>(assets.brain)
      for (const files of assets.skills.values()) {
        for (const [rel, asset] of files) {
          assetFiles.set(`${manifest.skillsDir}/${rel}`, asset)
        }
      }
      for (const [rel, asset] of assets.agents) {
        assetFiles.set(`${CANONICAL_AGENTS_DIR}/${rel}`, asset)
      }
      const assetHashes = new Map([...assetFiles].map(([p, a]) => [p, a.hash]))

      // Disk state for every path either side knows about.
      const paths = new Set([...assetHashes.keys(), ...manifest.files.map((f) => f.path)])
      const diskContent = new Map<string, string | null>()
      for (const p of paths) diskContent.set(p, yield* readTextOrNull(p))
      const diskHashes = new Map(
        [...diskContent].map(([p, c]) => [p, c === null ? null : contentHash(c)])
      )

      const actions = planUpgrade({ manifestFiles: manifest.files, assetHashes, diskHashes })

      const oldRole = new Map(manifest.files.map((f) => [f.path, f.role]))
      const oldHash = new Map(manifest.files.map((f) => [f.path, f.hash]))
      const roleFor = (path: string): ManifestEntry["role"] =>
        oldRole.get(path) ?? defaultRole(path)

      const lines: Array<ReportLine> = []
      const entries: Array<ManifestEntry> = []

      const writeAsset = (path: string) =>
        Effect.gen(function* () {
          const asset = assetFiles.get(path)!
          const current = diskContent.get(path)
          let content = path.startsWith("brain/") ? stampToday(asset.content) : asset.content
          if (current !== null && current !== undefined && hasAdvisorMarkers(asset.content)) {
            content = carryAdvisorsOver(current, content)
          }
          if (!opts.dryRun) yield* writeText(path, content)
        })

      for (const action of actions) {
        const { _tag, path } = action
        switch (_tag) {
          case "Install":
          case "Update": {
            yield* writeAsset(path)
            entries.push({ path, role: roleFor(path), hash: assetHashes.get(path)! })
            lines.push({ path, status: STATUS[_tag] })
            break
          }
          case "Restore": {
            if (assetFiles.has(path)) {
              yield* writeAsset(path)
              entries.push({ path, role: action.role, hash: assetHashes.get(path)! })
              lines.push({ path, status: "restored", note: "was missing — rewritten from bundled version" })
            } else {
              lines.push({ path, status: "orphan", note: "missing on disk and no longer shipped — dropped from manifest" })
            }
            break
          }
          case "UpToDate": {
            entries.push({ path, role: roleFor(path), hash: assetHashes.get(path)! })
            lines.push({ path, status: "up-to-date" })
            break
          }
          case "KeepLocal": {
            const hash = diskHashes.get(path)
            entries.push({ path, role: "seed", hash: hash ?? oldHash.get(path) ?? "" })
            lines.push({ path, status: "kept" })
            break
          }
          case "Conflict": {
            if (opts.force) {
              yield* writeAsset(path)
              entries.push({ path, role: roleFor(path), hash: assetHashes.get(path)! })
              lines.push({ path, status: "updated", note: "local modifications overwritten (--force); review with git diff" })
            } else {
              const previous = oldHash.get(path)
              if (previous !== undefined) {
                entries.push({ path, role: roleFor(path), hash: previous })
              }
              lines.push({ path, status: "conflict", note: "locally modified — skipped (use --force to overwrite)" })
            }
            break
          }
          case "Orphan": {
            lines.push({ path, status: "orphan", note: "no longer shipped by this version — left on disk, dropped from manifest" })
            break
          }
        }
      }

      if (!opts.dryRun) {
        const now = new Date().toISOString()
        const next: Manifest = {
          packageVersion: VERSION,
          createdAt: manifest.createdAt,
          updatedAt: now,
          skillsDir: manifest.skillsDir,
          files: entries.sort((a, b) => a.path.localeCompare(b.path)),
          providers: manifest.providers,
          links: manifest.links
        }
        yield* writeText(MANIFEST_PATH, yield* encodeManifest(next))
      }

      const allLines = [...migrationLines, ...lines]
      const conflicts = allLines.filter((l) => l.status === "conflict").length
      const report = {
        command: opts.dryRun ? "upgrade --dry-run" : "upgrade",
        lines: allLines,
        notes: [
          `manifest: ${manifest.packageVersion} -> ${VERSION}`,
          ...(didMigrate
            ? [`migrated to the .agents/-canonical layout (skills now at ${CANONICAL_SKILLS_DIR})`]
            : []),
          ...(opts.dryRun ? ["dry run — nothing was written"] : []),
          ...(conflicts > 0 ? [`${conflicts} conflict(s) skipped — re-run with --force to overwrite`] : [])
        ],
        ok: true
      }
      yield* Console.log(opts.json ? renderReportJson(report) : renderReport(report))
    })
).pipe(Command.withDescription("Sync installed skills to this package version (manifest-aware, conflict-safe)."))
