import { Command, Options } from "@effect/cli"
import { FileSystem, Path } from "@effect/platform"
import { Console, Effect } from "effect"
import { MANIFEST_PATH, decodeManifest } from "../core/manifest.js"
import { CANONICAL_SKILLS_DIR, PROVIDERS, skillCapable } from "../core/providers.js"
import { type ReportLine, renderReport, renderReportJson } from "../core/report.js"
import { Assets } from "../services/Assets.js"
import { exists, pathFact, readTextOrNull } from "../services/fsx.js"

/**
 * `brain scan` — the mechanical half of mode-detection and migration
 * discovery. It finds legacy knowledge stores, loose spec files, agent
 * definitions, and installed skills, and reports them. Deciding what the
 * findings MEAN (fresh vs migration, advisor classification, content mapping)
 * is the LLM's job — feed this report to the init-brain skill.
 */

const json = Options.boolean("json").pipe(
  Options.withDescription("Emit the report as JSON (machine/agent friendly).")
)

const LEGACY_DIRS = [
  "docs", "documentation", "wiki", ".notes", "notes", "knowledge",
  "adr", "rfcs", "decisions", "planning", "specs"
]
const AGENT_DIRS = [".claude/agents", ".agents/agents"]
const SKILL_DIRS = [".claude/skills", ".agents/skills"]
const IGNORED = new Set([
  ".git", "node_modules", "dist", "build", ".venv", "venv", "brain",
  ".claude", ".agents", ".idea", ".vscode", "coverage", "target", "vendor"
])
const MAX_DEPTH = 5

export const scanCommand = Command.make("scan", { json }, (opts) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const assets = yield* Assets
    const lines: Array<ReportLine> = []
    const notes: Array<string> = []

    // --- brain presence --------------------------------------------------
    if (yield* exists("brain")) {
      const manifestRaw = yield* readTextOrNull(MANIFEST_PATH)
      const version = manifestRaw === null
        ? null
        : yield* decodeManifest(manifestRaw).pipe(
            Effect.map((m) => m.packageVersion),
            Effect.orElseSucceed(() => null)
          )
      lines.push({
        path: "brain/",
        status: "brain",
        note: version === null ? "present, no manifest (pre-CLI install?)" : `present, manifest v${version}`
      })
    } else {
      lines.push({ path: "brain/", status: "brain", note: "absent" })
    }

    // --- legacy knowledge stores ------------------------------------------
    const countMarkdown = (dir: string, depth: number): Effect.Effect<number, never, FileSystem.FileSystem | Path.Path> =>
      Effect.gen(function* () {
        if (depth > MAX_DEPTH) return 0
        const entries = yield* fs.readDirectory(dir).pipe(Effect.orElseSucceed(() => [] as Array<string>))
        let count = 0
        for (const entry of entries) {
          if (IGNORED.has(entry)) continue
          const full = path.join(dir, entry)
          const stat = yield* fs.stat(full).pipe(Effect.option)
          if (stat._tag === "None") continue
          if (stat.value.type === "Directory") {
            count += yield* countMarkdown(full, depth + 1)
          } else if (entry.toLowerCase().endsWith(".md")) {
            count++
          }
        }
        return count
      })

    for (const dir of LEGACY_DIRS) {
      if (yield* exists(dir)) {
        const mdCount = yield* countMarkdown(dir, 0)
        lines.push({ path: `${dir}/`, status: "legacy-store", note: `${mdCount} markdown file(s)` })
      }
    }

    // --- loose spec/planning files outside brain ---------------------------
    const SPEC_PATTERN = /(^|[-_.])spec\.md$|^SPEC\.md$|^(TODO|KNOWN-ISSUES|ROADMAP|BACKLOG|TECH-DEBT)[^/]*\.md$/i
    const findLoose = (dir: string, depth: number): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
      Effect.gen(function* () {
        if (depth > MAX_DEPTH) return
        const entries = yield* fs.readDirectory(dir === "" ? "." : dir).pipe(
          Effect.orElseSucceed(() => [] as Array<string>)
        )
        for (const entry of entries) {
          if (IGNORED.has(entry) || LEGACY_DIRS.includes(entry)) continue
          const rel = dir === "" ? entry : `${dir}/${entry}`
          const stat = yield* fs.stat(rel).pipe(Effect.option)
          if (stat._tag === "None") continue
          if (stat.value.type === "Directory") {
            yield* findLoose(rel, depth + 1)
          } else if (SPEC_PATTERN.test(entry)) {
            lines.push({ path: rel, status: "loose-spec" })
          }
        }
      })
    yield* findLoose("", 0)

    // --- agent definitions --------------------------------------------------
    for (const dir of AGENT_DIRS) {
      if (!(yield* exists(dir))) continue
      for (const entry of yield* fs.readDirectory(dir).pipe(Effect.orElseSucceed(() => [] as Array<string>))) {
        if (/\.(md|ya?ml)$/i.test(entry)) {
          lines.push({ path: `${dir}/${entry}`, status: "agent-definition" })
        }
      }
    }

    // --- routers + skills ----------------------------------------------------
    for (const router of ["CLAUDE.md", "AGENTS.md"]) {
      if (yield* exists(router)) lines.push({ path: router, status: "router" })
    }
    for (const dir of SKILL_DIRS) {
      if (!(yield* exists(dir))) continue
      const installed = yield* fs.readDirectory(dir).pipe(Effect.orElseSucceed(() => [] as Array<string>))
      for (const skill of installed.sort()) {
        const suite = assets.skillNames.includes(skill)
        lines.push({
          path: `${dir}/${skill}`,
          status: "installed-skill",
          note: suite ? "part of the brain suite" : "project-specific"
        })
      }
    }

    // --- AI providers + canonical layout ----------------------------------
    const canon = yield* pathFact(CANONICAL_SKILLS_DIR)
    lines.push({
      path: CANONICAL_SKILLS_DIR,
      status: "canonical-skills",
      note: canon.kind === "absent" ? "absent — not yet on the .agents/ layout" : `present (${canon.kind})`
    })
    for (const p of PROVIDERS) {
      const dirPresent = p.dir !== null && p.dir !== ".github" && (yield* exists(p.dir))
      const filePresent = p.rootFile !== null && (yield* exists(p.rootFile))
      if (!dirPresent && !filePresent) continue
      const layer = skillCapable(p) ? "skills-capable" : "router-only"
      let wired = skillCapable(p) ? "skills not linked" : "reads AGENTS.md"
      if (skillCapable(p) && p.skills !== null) {
        const f = yield* pathFact(p.skills)
        wired = f.kind === "symlink" ? `skills → ${f.target ?? "?"}` : f.kind === "dir" ? "skills dir present (not symlinked)" : "skills not linked"
      }
      lines.push({ path: p.dir ?? p.rootFile!, status: "provider", note: `${p.label} (${p.id}) — ${layer}; ${wired}` })
    }

    notes.push(
      "scan is mechanical: deciding fresh-init vs migration, which providers to wire, mapping legacy content into brain/, and classifying advisor agents is the LLM's job (see the init-brain skill)"
    )

    const report = { command: "scan", lines, notes, ok: true }
    yield* Console.log(opts.json ? renderReportJson(report) : renderReport(report))
  })
).pipe(Command.withDescription("Inventory the repo: legacy doc stores, loose specs, agent definitions, installed skills (read-only)."))
