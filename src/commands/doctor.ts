import { Command, Options } from "@effect/cli"
import { FileSystem } from "@effect/platform"
import { Console, Effect } from "effect"
import { contentHash } from "../core/hash.js"
import { MANIFEST_PATH, decodeManifest, reconcileRoles } from "../core/manifest.js"
import { planUpgrade } from "../core/plan.js"
import { CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_DIR } from "../core/providers.js"
import { type ReportLine, renderReport, renderReportJson } from "../core/report.js"
import { Assets, type AssetFile } from "../services/Assets.js"
import { exists, pathFact, readTextOrNull, walkFiles } from "../services/fsx.js"

/**
 * `brain doctor` — read-only health check: brain structure, unstamped
 * placeholders, manifest presence, and the managed files' three-way state
 * (same planner as `upgrade`, but nothing is written). Exit code 1 when
 * problems are found, so it is scriptable.
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
const REQUIRED_DIRS = ["brain/raw", "brain/specs", "brain/domains", "brain/chore", "brain/tech-debt"]

export const doctorCommand = Command.make("doctor", { json }, (opts) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const lines: Array<ReportLine> = []
    const notes: Array<string> = []
    let problems = 0

    // --- structure -----------------------------------------------------
    for (const file of REQUIRED_FILES) {
      if (yield* exists(file)) {
        lines.push({ path: file, status: "ok" })
      } else {
        lines.push({ path: file, status: "missing" })
        problems++
      }
    }
    for (const dir of REQUIRED_DIRS) {
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
        const diskHashes = new Map<string, string | null>()
        for (const p of paths) {
          const content = yield* readTextOrNull(p)
          diskHashes.set(p, content === null ? null : contentHash(content))
        }

        for (const action of planUpgrade({ manifestFiles: reconcileRoles(manifest.value.files), assetHashes, diskHashes })) {
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
            case "Orphan":
              lines.push({ path: action.path, status: "orphan", note: "tracked but no longer shipped" })
              break
            case "UpToDate":
            case "KeepLocal":
              break
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
).pipe(Command.withDescription("Health check: brain structure, placeholders, manifest, and skill drift (read-only)."))
