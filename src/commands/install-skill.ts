import { Command, Options } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import { contentHash } from "../core/hash.js"
import { type ReportLine, renderReport, renderReportJson } from "../core/report.js"
import { CliError } from "../errors.js"
import { Assets } from "../services/Assets.js"
import { exists, readTextOrNull, writeText } from "../services/fsx.js"
import { detectGlobalSkillsDir } from "../services/workspace.js"

/**
 * `brain install-skill` — copy the init-brain orchestrator skill out of this
 * package into the user's GLOBAL skills directory (`~/.agents/skills` or
 * `~/.claude/skills`), so `/init-brain` is available in every project WITHOUT
 * cloning this repo. The published package is the source of truth; this is the
 * no-clone onboarding entry point.
 *
 * Safe by default: an existing install is never overwritten — identical →
 * `up-to-date`, differing → reported and left alone unless `--force` is given.
 */

const force = Options.boolean("force").pipe(
  Options.withDescription("Overwrite an existing init-brain install with the bundled version.")
)
const json = Options.boolean("json").pipe(
  Options.withDescription("Emit the report as JSON (machine/agent friendly).")
)
const skillsDir = Options.text("skills-dir").pipe(
  Options.withDescription(
    "Global skills directory to install into (default: ~/.agents/skills if present, else ~/.claude/skills)."
  ),
  Options.optional
)

const SKILL = "init-brain"

export const installSkillCommand = Command.make(
  "install-skill",
  { force, json, skillsDir },
  (opts) =>
    Effect.gen(function* () {
      const assets = yield* Assets
      const files = assets.initBrainSkill
      if (files.size === 0) {
        return yield* new CliError({
          message: `the ${SKILL} skill is not bundled with this package — broken install?`
        })
      }

      const destDir = Option.isSome(opts.skillsDir)
        ? opts.skillsDir.value
        : yield* detectGlobalSkillsDir
      const skillDir = `${destDir}/${SKILL}`

      // Keys are already "init-brain/<rel>", so destDir + key lands the skill
      // at <destDir>/init-brain/<rel>.
      const writeAll = Effect.gen(function* () {
        for (const [rel, asset] of files) {
          yield* writeText(`${destDir}/${rel}`, asset.content)
        }
      })

      const lines: Array<ReportLine> = []

      if (!(yield* exists(skillDir))) {
        yield* writeAll
        lines.push({ path: skillDir, status: "installed" })
      } else {
        let differs = false
        for (const [rel, asset] of files) {
          const current = yield* readTextOrNull(`${destDir}/${rel}`)
          if (current === null || contentHash(current) !== asset.hash) {
            differs = true
            break
          }
        }
        if (!differs) {
          lines.push({ path: skillDir, status: "up-to-date" })
        } else if (opts.force) {
          yield* writeAll
          lines.push({ path: skillDir, status: "updated", note: "overwritten (--force)" })
        } else {
          lines.push({
            path: skillDir,
            status: "exists",
            note: "differs from bundled version — re-run with --force to overwrite"
          })
        }
      }

      const report = {
        command: "install-skill",
        lines,
        notes: [
          `skills directory: ${destDir}`,
          'next: open your project and run `/init-brain` (or tell your AI assistant "set up brain for this project")',
          "if /init-brain does not appear yet, reload skills by restarting the session"
        ],
        ok: true
      }
      yield* Console.log(opts.json ? renderReportJson(report) : renderReport(report))
    })
).pipe(
  Command.withDescription(
    "Install the init-brain orchestrator skill into your global skills dir (no clone needed)."
  )
)
