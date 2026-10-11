import { Command, Options } from "@effect/cli"
import { FileSystem } from "@effect/platform"
import { Console, Effect, Either } from "effect"
import { CONFIG_PATH, defaultConfig } from "../core/config.js"
import { contentHash } from "../core/hash.js"
import { MANIFEST_PATH, decodeManifest, reconcileRoles } from "../core/manifest.js"
import { planRuleInputs, planUpgrade } from "../core/plan.js"
import { CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_DIR } from "../core/providers.js"
import { type ReportLine, renderReport, renderReportJson } from "../core/report.js"
import { Assets, type AssetFile } from "../services/Assets.js"
import { readConfig } from "../services/context.js"
import { exists, pathFact, readTextOrNull, walkFiles } from "../services/fsx.js"

/**
 * `brain doctor` — read-only health check: the project config (valid, and
 * its configured paths exist), brain structure, unstamped placeholders,
 * manifest presence, and the managed files' three-way state (same planner and
 * rule inputs as `upgrade`, but nothing is written). Files the package no
 * longer ships are reported as `orphan` and a project-owned skill folder is
 * skipped; neither counts as a problem. Exit code 1 when problems are found, so
 * it is scriptable.
 */

const json = Options.boolean("json").pipe(
  Options.withDescription("Emit the report as JSON (machine/agent friendly).")
)

const REQUIRED_FILES = [
  "brain/AGENTS.md",
  "brain/CLAUDE.md",
  "brain/index.md",
  "brain/log.md"
]
/** Plus the tech-debt dir, which comes from the config (`paths.techDebt`). */
const REQUIRED_DIRS = ["brain/raw", "brain/specs", "brain/domains", "brain/chore"]

export const doctorCommand = Command.make("doctor", { json }, (opts) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const lines: Array<ReportLine> = []
    const notes: Array<string> = []
    let problems = 0

    // --- project config ---------------------------------------------------
    const config = yield* readConfig
    let techDebtDir = defaultConfig.paths.techDebt
    if (config === null) {
      notes.push(`no ${CONFIG_PATH} — defaults apply (\`brain upgrade\` writes one from the project)`)
    } else if (Either.isLeft(config)) {
      lines.push({ path: CONFIG_PATH, status: "invalid", note: `${config.left} — fix it with \`brain config set\`` })
      problems++
    } else {
      const c = config.right
      techDebtDir = c.paths.techDebt
      lines.push({ path: CONFIG_PATH, status: "ok", note: `review.mode ${c.review.mode}, review.location ${c.review.location}` })
      const configured: Array<[string, string | null]> = [["paths.reviews", c.paths.reviews], ["paths.personas", c.paths.personas]]
      for (const [key, value] of configured) {
        if (value === null || (yield* exists(value))) continue
        lines.push({ path: value, status: "missing", note: `configured as ${key} in ${CONFIG_PATH}` })
        problems++
      }
    }

    // --- structure -----------------------------------------------------
    for (const file of REQUIRED_FILES) {
      if (yield* exists(file)) {
        lines.push({ path: file, status: "ok" })
      } else {
        lines.push({ path: file, status: "missing" })
        problems++
      }
    }
    for (const dir of [...REQUIRED_DIRS, techDebtDir]) {
      if (yield* exists(dir)) {
        lines.push({ path: `${dir}/`, status: "ok" })
      } else {
        lines.push({ path: `${dir}/`, status: "missing" })
        problems++
      }
    }

    // --- unstamped placeholders -----------------------------------------
    if (yield* exists("brain")) {
      for (const rel of yield* walkFiles("brain")) {
        const content = yield* fs.readFileString(`brain/${rel}`).pipe(Effect.orElseSucceed(() => ""))
        if (content.includes("__TODAY__")) {
          lines.push({ path: `brain/${rel}`, status: "unstamped", note: "__TODAY__ placeholder left" })
          problems++
        }
      }
    }

    // --- manifest + managed file state -----------------------------------
    const manifestRaw = yield* readTextOrNull(MANIFEST_PATH)
    if (manifestRaw === null) {
      lines.push({ path: MANIFEST_PATH, status: "missing", note: "run `brain init` to create it" })
      problems++
    } else {
      const manifest = yield* decodeManifest(manifestRaw).pipe(Effect.option)
      if (manifest._tag === "None") {
        lines.push({ path: MANIFEST_PATH, status: "corrupt", note: "does not parse — re-run `brain init`" })
        problems++
      } else {
        const assets = yield* Assets
        const assetFiles = new Map<string, AssetFile>(assets.brain)
        for (const files of assets.skills.values()) {
          for (const [rel, asset] of files) {
            assetFiles.set(`${manifest.value.skillsDir}/${rel}`, asset)
          }
        }
        for (const [rel, asset] of assets.agents) {
          assetFiles.set(`${CANONICAL_AGENTS_DIR}/${rel}`, asset)
        }
        const assetHashes = new Map([...assetFiles].map(([p, a]) => [p, a.hash]))
        const paths = new Set([...assetHashes.keys(), ...manifest.value.files.map((f) => f.path)])
        const diskContent = new Map<string, string | null>()
        for (const p of paths) diskContent.set(p, yield* readTextOrNull(p))
        const diskHashes = new Map(
          [...diskContent].map(([p, c]) => [p, c === null ? null : contentHash(c)])
        )

        const reconciled = reconcileRoles(manifest.value.files)
        const rules = planRuleInputs({ manifestFiles: reconciled, skillsDir: manifest.value.skillsDir, diskContent })
        // The config is checked above; a missing one is a note, not a problem.
        const tracked = reconciled.filter((f) => f.path !== CONFIG_PATH)
        for (const action of planUpgrade({ manifestFiles: tracked, assetHashes, diskHashes, ...rules })) {
          switch (action._tag) {
            case "Update":
            case "Install":
              lines.push({ path: action.path, status: "outdated", note: "run `brain upgrade`" })
              problems++
              break
            case "Restore":
              lines.push({ path: action.path, status: "missing", note: "run `brain upgrade` to restore" })
              problems++
              break
            case "Conflict":
              lines.push({ path: action.path, status: "modified", note: "differs from both manifest and bundled version" })
              break
            case "Remove":
              lines.push({ path: action.path, status: "orphan", note: "no longer shipped; `brain upgrade` removes it" })
              break
            case "OrphanModified":
              lines.push({ path: action.path, status: "orphan", note: "no longer shipped, locally modified; delete it by hand if nothing references it" })
              break
            case "OrphanMissing":
              lines.push({ path: action.path, status: "orphan", note: "no longer shipped and missing on disk; `brain upgrade` drops it from the manifest" })
              break
            case "UpToDate":
            case "KeepLocal":
            case "SkipSeed":
              break
          }
        }
        // Files inside a bundled skill's folder that neither the package ships nor
        // the manifest tracks: leftovers of a hand-installed or older copy, which
        // `upgrade` never removes. Reported, not counted as a problem. A
        // project-owned (all-seed) skill folder is the project's business.
        const known = new Set([...paths])
        for (const name of assets.skillNames) {
          const dir = `${manifest.value.skillsDir}/${name}`
          if (rules.seedSkillDirs.has(dir)) continue
          if ((yield* pathFact(dir)).kind === "absent") continue
          for (const rel of yield* walkFiles(dir).pipe(Effect.orElseSucceed(() => [] as Array<string>))) {
            const file = `${dir}/${rel}`
            if (known.has(file) || rel.split("/").some((part) => part.startsWith("."))) continue
            lines.push({ path: file, status: "untracked", note: "inside a bundled skill but not shipped by this version — delete it if nothing references it" })
          }
        }
        notes.push(`manifest version ${manifest.value.packageVersion}, skills directory ${manifest.value.skillsDir}`)

        // --- provider-agnostic layout ----------------------------------------
        if (manifest.value.skillsDir !== CANONICAL_SKILLS_DIR) {
          lines.push({
            path: manifest.value.skillsDir,
            status: "legacy-layout",
            note: `not the canonical ${CANONICAL_SKILLS_DIR} — run \`brain upgrade\` to migrate`
          })
          problems++
        }
        for (const link of manifest.value.links) {
          const fact = yield* pathFact(link.path)
          if (fact.kind !== "symlink") {
            lines.push({ path: link.path, status: "missing-link", note: `expected symlink → ${link.target}` })
            problems++
          } else if (fact.target !== link.target) {
            lines.push({ path: link.path, status: "wrong-link", note: `→ ${fact.target ?? "?"}, expected ${link.target}` })
            problems++
          } else {
            lines.push({ path: link.path, status: "ok", note: `→ ${link.target}` })
          }
        }
      }
    }

    const report = {
      command: "doctor",
      lines,
      notes,
      ok: problems === 0
    }
    yield* Console.log(opts.json ? renderReportJson(report) : renderReport(report))
    if (problems > 0) yield* Effect.sync(() => { process.exitCode = 1 })
  })
).pipe(Command.withDescription("Health check: project config, brain structure, placeholders, manifest, and skill drift (read-only)."))
