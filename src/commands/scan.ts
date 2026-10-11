import { Command, Options } from "@effect/cli"
import { FileSystem, Path } from "@effect/platform"
import { Console, Effect, Either } from "effect"
import { CONFIG_PATH } from "../core/config.js"
import { configDisagreements } from "../core/detect.js"
import {
  type FrontendFinding,
  collectDeps,
  describeFinding,
  detectNative,
  detectPackage,
  dropNativeShells,
  stackVerdict
} from "../core/frontend.js"
import { MANIFEST_PATH, decodeManifest } from "../core/manifest.js"
import { CANONICAL_ROUTER, CANONICAL_SKILLS_DIR, PROVIDERS, skillCapable } from "../core/providers.js"
import { type ReportLine, renderReport, renderReportJson } from "../core/report.js"
import { describeSignals } from "../core/router.js"
import { Assets } from "../services/Assets.js"
import { collectContext } from "../services/context.js"
import { exists, pathFact, readTextOrNull } from "../services/fsx.js"

/**
 * `brain scan` — the mechanical half of mode-detection and migration
 * discovery. It finds legacy knowledge stores, loose spec files, agent
 * definitions, the frontend stack, installed skills, and the project context
 * the config is built from (persona sources, the tech-debt store, review
 * reports, the root router's state and pertinence), and reports them with a
 * suggested config. Deciding what the findings MEAN (fresh vs migration,
 * advisor classification, content mapping, extracting personas, reconciling
 * the router, adapting design-engineering to the stack) is the LLM's job —
 * feed this report to the init-brain skill.
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
/** Manifests that can declare a frontend stack (see core/frontend.ts). */
const STACK_FILES = new Set(["package.json", "pubspec.yaml", "Package.swift", "build.gradle", "build.gradle.kts"])
/** Native build output too large to walk and never holding the app's own manifest. */
const STACK_IGNORED = new Set(["Pods", "DerivedData", ".dart_tool"])
const STACK_DEPTH = 4

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

    // --- frontend stack (adapts the design-engineering skill) ---------------
    const stack: Array<FrontendFinding> = []
    const findStack = (dir: string, depth: number): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
      Effect.gen(function* () {
        if (depth > STACK_DEPTH) return
        const entries = yield* fs.readDirectory(dir === "" ? "." : dir).pipe(
          Effect.orElseSucceed(() => [] as Array<string>)
        )
        for (const entry of entries.sort()) {
          if (IGNORED.has(entry) || STACK_IGNORED.has(entry) || entry.startsWith(".")) continue
          const rel = dir === "" ? entry : `${dir}/${entry}`
          const stat = yield* fs.stat(rel).pipe(Effect.option)
          if (stat._tag === "None") continue
          if (stat.value.type === "Directory") {
            if (entry.endsWith(".xcodeproj")) {
              const hit = detectNative(rel, entry, null)
              if (hit !== null) stack.push(hit)
            } else {
              yield* findStack(rel, depth + 1)
            }
          } else if (STACK_FILES.has(entry)) {
            const content = yield* readTextOrNull(rel).pipe(Effect.orElseSucceed(() => null))
            if (content === null) continue
            const hit = entry === "package.json"
              ? detectPackage(rel, collectDeps(yield* Effect.try(() => JSON.parse(content)).pipe(Effect.orElseSucceed(() => null))))
              : detectNative(rel, entry, content)
            if (hit !== null) stack.push(hit)
          }
        }
      })
    yield* findStack("", 0)
    const frontends = dropNativeShells(stack)
    for (const f of frontends) lines.push({ path: f.path, status: "frontend", note: describeFinding(f) })

    // --- project context: personas, tech debt, reviews, router ----------------
    const context = yield* collectContext({ shippedAgents: new Set(assets.agents.keys()) })
    for (const c of context.personas) {
      lines.push({ path: c.path, status: "persona-source", note: c.kind === "file" ? "file" : `section "${c.heading}"` })
    }
    for (const t of context.techDebt) {
      lines.push({ path: t.path, status: "tech-debt-store", note: `${t.files} page(s), ${t.layout}` })
    }
    if (context.review.reports > 0 || (yield* exists("brain"))) {
      const r = context.review
      lines.push({
        path: r.layout === "review-tree" ? `${r.reviewsDir}/` : "brain/specs/",
        status: "review-store",
        note: `${r.layout} — ${r.reports} REPORT.md (${r.inTree} in a review tree, ${r.inSpecFolders} in spec folders)`
      })
    }
    const { router } = context
    if (router.files.length === 0) {
      lines.push({ path: CANONICAL_ROUTER, status: "router", note: "state none — no root router yet" })
    }
    for (const f of router.files) {
      const what = f.kind === "symlink" ? `symlink → ${f.target ?? "?"}` : f.signals === null ? f.kind : describeSignals(f.signals)
      const divergence =
        router.divergence !== null && f.path !== CANONICAL_ROUTER
          ? ` · differs from ${CANONICAL_ROUTER} (similarity ${router.divergence.similarity.toFixed(2)}${router.divergence.claudeOnlyHeadings.length > 0 ? `; only here: ${router.divergence.claudeOnlyHeadings.slice(0, 5).map((h) => `"${h}"`).join(", ")}` : ""})`
          : ""
      lines.push({ path: f.path, status: "router", note: `state ${router.state} · ${what}${divergence}` })
    }

    // --- installed skills ----------------------------------------------------
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

    // --- config: suggested (none yet), or where it disagrees with detection ---
    if (context.config === null) {
      notes.push(`config: no ${CONFIG_PATH} yet — \`brain init\` / \`brain upgrade\` would write:`)
      for (const s of context.suggested.suggestions) {
        notes.push(`config: ${s.key} = ${JSON.stringify(s.value)} — ${s.reason}`)
      }
    } else if (Either.isLeft(context.config)) {
      notes.push(`config: ${CONFIG_PATH} is invalid — ${context.config.left} (fix it with \`brain config set\`)`)
    } else {
      const disagreements = configDisagreements(context.config.right, context.suggested)
      notes.push(
        disagreements.length === 0
          ? `config: ${CONFIG_PATH} agrees with detection`
          : `config: ${CONFIG_PATH} differs from detection — ${disagreements.join("; ")}`
      )
    }
    notes.push(stackVerdict(frontends))
    notes.push(
      "scan is mechanical: deciding fresh-init vs migration, which providers to wire, mapping legacy content into brain/, classifying advisor agents, and adapting design-engineering to the frontend stack is the LLM's job (see the init-brain skill)"
    )

    const report = {
      command: "scan",
      lines,
      notes,
      ok: true,
      // --json only: the full structures behind the lines above.
      context: {
        personas: context.personas,
        techDebt: context.techDebt,
        review: context.review,
        router: context.router,
        suggestedConfig: context.suggested.config,
        suggestions: context.suggested.suggestions,
        config: context.config === null
          ? null
          : Either.isLeft(context.config)
            ? { error: context.config.left }
            : context.config.right
      }
    }
    yield* Console.log(opts.json ? renderReportJson(report) : renderReport(report))
  })
).pipe(Command.withDescription("Inventory the repo: legacy doc stores, loose specs, agent definitions, frontend stack, installed skills, personas, tech debt, reviews, router, suggested config (read-only)."))
