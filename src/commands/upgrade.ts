import { Command, Options } from "@effect/cli"
import { FileSystem } from "@effect/platform"
import { Console, Effect, Option } from "effect"
import { carryAdvisorsOver, hasAdvisorMarkers } from "../core/advisors.js"
import { agentName, companionAgents } from "../core/companions.js"
import { CONFIG_PATH, defaultConfig } from "../core/config.js"
import { contentHash } from "../core/hash.js"
import { MANIFEST_PATH, type Manifest, type ManifestEntry, decodeManifest, defaultRole, encodeManifest, reconcileRoles, rewriteSkillsDir } from "../core/manifest.js"
import { emptiedDirCandidates, planRuleInputs, planUpgrade, type UpgradeAction } from "../core/plan.js"
import { CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_DIR, type Provider, byId, providerForSkillsDir, uniqueProviders } from "../core/providers.js"
import { type ReportLine, renderReport, renderReportJson } from "../core/report.js"
import { stampToday } from "../core/stamp.js"
import { CliError } from "../errors.js"
import { Assets, type AssetFile } from "../services/Assets.js"
import { collectContext } from "../services/context.js"
import { exists, pathFact, readTextOrNull, removePath, writeText } from "../services/fsx.js"
import { detectProviders, runLink } from "../services/linker.js"
import { ensureConfig } from "../services/project-config.js"
import { VERSION } from "../version.js"

/**
 * `brain upgrade` — sync managed files to the version bundled with this
 * package, using the manifest to distinguish "untouched since install" (safe
 * to update) from "locally modified" (conflict: skipped unless --force).
 * Seed files (brain/ content, project-owned agent-browser) are only restored
 * when missing, never overwritten, and a skill folder whose entries are all
 * seed gets no newly shipped file either. Advisor blocks survive every update.
 *
 * A managed file this version no longer ships is deleted only when it still
 * matches its manifest hash and holds no wired advisor block (then the folders
 * it leaves empty go too); an edited one stays on disk, even with --force.
 * Either way it leaves the manifest.
 *
 * `--skill <name>` narrows the run to one bundled skill and the agents linked
 * to it (their `skills:` list, see core/companions.ts): installed when absent,
 * synced when present, with the same conflict rules, while every other
 * manifest entry is carried over untouched and the manifest keeps its version,
 * since only part of it moved.
 *
 * A full run also maintains the project config (`brain/brain.config.json`):
 * written from detection when absent, otherwise only its missing keys are
 * added. A scoped run leaves it alone.
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
const skill = Options.text("skill").pipe(
  Options.withPseudoName("name"),
  Options.repeated,
  Options.withDescription(
    "Install or update only this bundled skill and the agents linked to it (repeatable or comma-separated); everything else is left as it is."
  ),
  Options.optional
)

const STACK_PROFILE = "brain/chore/motion-stack.md"

const STATUS: Record<UpgradeAction["_tag"], string> = {
  Install: "installed",
  Update: "updated",
  Restore: "restored",
  UpToDate: "up-to-date",
  KeepLocal: "kept",
  Conflict: "conflict",
  Remove: "removed",
  OrphanModified: "orphan",
  OrphanMissing: "orphan",
  SkipSeed: "kept"
}

export const upgradeCommand = Command.make(
  "upgrade",
  { force, dryRun, json, noMigrate, skill },
  (opts) =>
    Effect.gen(function* () {
      const assets = yield* Assets

      const selected = [
        ...new Set(
          Option.getOrElse(opts.skill, () => [])
            .flatMap((s) => s.split(","))
            .map((s) => s.trim().replace(/\/+$/, ""))
            .filter((s) => s.length > 0)
        )
      ]
      const unknown = selected.filter((s) => !assets.skills.has(s))
      if (unknown.length > 0) {
        return yield* new CliError({
          message: `unknown skill ${unknown.join(", ")} — bundled skills: ${assets.skillNames.join(", ")}`
        })
      }
      const scoped = selected.length > 0
      // Agents linked to a selected skill travel with it.
      const companions = companionAgents(assets.agents)
      const linkedAgents = [...new Set(selected.flatMap((s) => companions.get(s) ?? []))]

      const manifestRaw = yield* readTextOrNull(MANIFEST_PATH)
      if (manifestRaw === null) {
        return yield* new CliError({
          message: `no manifest at ${MANIFEST_PATH} — run \`brain init\` first`
        })
      }
      let manifest = yield* decodeManifest(manifestRaw).pipe(
        Effect.mapError((e) => new CliError({ message: `unreadable manifest: ${e.message}` }))
      )

      // Project facts, read before the layout migration may promote the router.
      const context = scoped ? null : yield* collectContext({ shippedAgents: new Set(assets.agents.keys()) })

      // --- reconcile the .agents/-canonical layout --------------------------
      // Migrates a legacy `.claude/skills` install (skills under a provider dir,
      // no `.agents/`) to canonical, AND on every run refreshes provider symlinks
      // so a pre-existing install picks up the newly-shipped agents symlink
      // (`.claude/agents → ../.agents/agents`) without a re-init. Steady-state
      // (everything already linked) adds no noise — only changed links are shown.
      const migrationLines: Array<ReportLine> = []
      let didMigrate = false
      // A scoped run leaves the layout alone too: only the named skills move.
      if (!opts.noMigrate && !scoped) {
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

      // Bundled assets in scope, keyed by their path in this project.
      const assetFiles = new Map<string, AssetFile>(scoped ? [] : assets.brain)
      for (const [name, files] of assets.skills) {
        if (scoped && !selected.includes(name)) continue
        for (const [rel, asset] of files) {
          assetFiles.set(`${manifest.skillsDir}/${rel}`, asset)
        }
      }
      for (const [rel, asset] of assets.agents) {
        if (scoped && !linkedAgents.includes(rel)) continue
        assetFiles.set(`${CANONICAL_AGENTS_DIR}/${rel}`, asset)
      }
      const assetHashes = new Map([...assetFiles].map(([p, a]) => [p, a.hash]))

      // Out-of-scope entries are carried into the new manifest as they are.
      const inScope = (path: string): boolean =>
        !scoped ||
        selected.some((name) => path.startsWith(`${manifest.skillsDir}/${name}/`)) ||
        linkedAgents.some((rel) => path === `${CANONICAL_AGENTS_DIR}/${rel}`)
      // The project config never goes through the planner: a full run handles it
      // below, a scoped run carries it over untouched.
      const carried = manifest.files.filter((f) => !inScope(f.path))
      const scopedFiles = manifest.files.filter((f) => inScope(f.path) && f.path !== CONFIG_PATH)

      // Disk state for every path either side knows about.
      const paths = new Set([...assetHashes.keys(), ...scopedFiles.map((f) => f.path)])
      const diskContent = new Map<string, string | null>()
      for (const p of paths) diskContent.set(p, yield* readTextOrNull(p))
      const diskHashes = new Map(
        [...diskContent].map(([p, c]) => [p, c === null ? null : contentHash(c)])
      )

      const rules = planRuleInputs({ manifestFiles: manifest.files, skillsDir: manifest.skillsDir, diskContent })
      const actions = planUpgrade({ manifestFiles: scopedFiles, assetHashes, diskHashes, ...rules })

      const oldRole = new Map(manifest.files.map((f) => [f.path, f.role]))
      const oldHash = new Map(manifest.files.map((f) => [f.path, f.hash]))
      const roleFor = (path: string): ManifestEntry["role"] =>
        oldRole.get(path) ?? defaultRole(path)

      const lines: Array<ReportLine> = []
      const entries: Array<ManifestEntry> = []
      const removed: Array<string> = []

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
          case "Remove": {
            if (opts.dryRun) {
              lines.push({ path, status: "would remove", note: "no longer shipped, unmodified since install" })
            } else {
              yield* removePath(path)
              removed.push(path)
              lines.push({ path, status: STATUS[_tag], note: "no longer shipped, unmodified since install — dropped from manifest" })
            }
            break
          }
          case "OrphanModified": {
            lines.push({ path, status: STATUS[_tag], note: "no longer shipped, locally modified, left on disk — dropped from manifest" })
            break
          }
          case "OrphanMissing": {
            lines.push({ path, status: STATUS[_tag], note: "missing on disk and no longer shipped — dropped from manifest" })
            break
          }
          case "SkipSeed": {
            lines.push({ path, status: STATUS[_tag], note: "project-owned skill — new bundled file not installed" })
            break
          }
        }
      }

      // Folders the removals left empty, deepest first, up to the skill folder.
      // Best effort: a folder that cannot be listed or removed is left alone.
      const fs = yield* FileSystem.FileSystem
      for (const dir of emptiedDirCandidates(removed, [manifest.skillsDir, CANONICAL_AGENTS_DIR, "brain"])) {
        if ((yield* pathFact(dir)).kind !== "dir") continue
        const children = yield* fs.readDirectory(dir).pipe(Effect.option)
        if (children._tag === "None" || children.value.length > 0) continue
        // Empty (just checked), so `recursive` only lets remove() accept a folder.
        const gone = yield* removePath(dir, true).pipe(Effect.option)
        if (gone._tag === "Some") lines.push({ path: `${dir}/`, status: "removed", note: "empty after the removal" })
      }

      // --- project config: created when absent, else only missing keys added ---
      // Paths and review location come from detection (facts). review.mode is a
      // policy: upgrade never adopts one on its own, so an absent key gets the
      // default (0.6.0 behavior) and the router's suggestion is only reported.
      const configNotes: Array<string> = []
      if (context !== null) {
        const suggestions = context.suggested.suggestions.map((s) =>
          s.key === "review.mode" ? { ...s, value: defaultConfig.review.mode, reason: "default", basis: "default" as const } : s
        )
        const result = yield* ensureConfig({ suggestions, overrides: [], dryRun: opts.dryRun })
        // An unreadable config is reported too (it is kept as is; doctor flags it).
        if (result.config === null) lines.push(result.line)
        if (result.line.status !== "kept") {
          lines.push(result.line)
          configNotes.push(...result.notes.filter((n) => !n.startsWith("config: review.mode")))
          const routerMode = context.suggested.suggestions.find((s) => s.key === "review.mode")!
          const wroteMode = result.line.status === "created" || result.line.note?.includes("review.mode") === true
          if (wroteMode) {
            configNotes.push(
              routerMode.basis === "detected" && routerMode.value !== defaultConfig.review.mode
                ? `config: review.mode defaulted to ${defaultConfig.review.mode} — ${routerMode.reason}, which suggests ${routerMode.value}: \`brain config set review.mode ${routerMode.value}\` to adopt it`
                : `config: review.mode defaulted to ${defaultConfig.review.mode} — \`brain config set review.mode …\` to change`
            )
          }
        }
        if (result.entry !== null) entries.push(result.entry)
      }

      if (!opts.dryRun) {
        const now = new Date().toISOString()
        const next: Manifest = {
          packageVersion: scoped ? manifest.packageVersion : VERSION,
          createdAt: manifest.createdAt,
          updatedAt: now,
          skillsDir: manifest.skillsDir,
          files: [...carried, ...entries].sort((a, b) => a.path.localeCompare(b.path)),
          providers: manifest.providers,
          links: manifest.links
        }
        yield* writeText(MANIFEST_PATH, yield* encodeManifest(next))
      }

      // The design-engineering skill speaks React until the project's stack
      // profile exists; that file is LLM-written (stack-adaptation.md), so the
      // CLI only points at it.
      const stackProfileMissing =
        assetFiles.has(`${manifest.skillsDir}/design-engineering/SKILL.md`) &&
        !(yield* exists(STACK_PROFILE))

      const allLines = [...migrationLines, ...lines]
      const conflictLines = allLines.filter((l) => l.status === "conflict")
      const reconcile = conflictLines.filter((l) => l.note?.includes("reconcile") === true).length
      const conflicts = conflictLines.length - reconcile
      const report = {
        command: ["upgrade", ...(scoped ? [`--skill ${selected.join(",")}`] : []), ...(opts.dryRun ? ["--dry-run"] : [])].join(" "),
        lines: allLines,
        notes: [
          scoped
            ? `only ${selected.join(", ")}${linkedAgents.length > 0 ? ` (with the ${linkedAgents.map(agentName).join(", ")} agent)` : ""} synced — other skills, agents, and brain/ untouched` +
              (manifest.packageVersion === VERSION
                ? ""
                : `; manifest stays at ${manifest.packageVersion} until a full \`brain upgrade\` to ${VERSION}`)
            : `manifest: ${manifest.packageVersion} -> ${VERSION}`,
          ...(didMigrate
            ? [`migrated to the .agents/-canonical layout (skills now at ${CANONICAL_SKILLS_DIR})`]
            : []),
          ...(opts.dryRun ? ["dry run — nothing was written"] : []),
          ...(conflicts > 0 ? [`${conflicts} conflict(s) skipped — re-run with --force to overwrite`] : []),
          ...(reconcile > 0
            ? [`${reconcile} router file(s) differ from AGENTS.md — reconcile them (init-brain → references/router.md), then run \`brain link\``]
            : []),
          ...configNotes,
          ...(stackProfileMissing
            ? [`no ${STACK_PROFILE} yet — have your assistant run ${manifest.skillsDir}/design-engineering/references/stack-adaptation.md (otherwise it runs on the first motion task)`]
            : [])
        ],
        ok: true
      }
      yield* Console.log(opts.json ? renderReportJson(report) : renderReport(report))
    })
).pipe(Command.withDescription(
    "Sync installed skills to this package version (manifest-aware, conflict-safe); --skill limits it to one skill."
  ))
