import { Args, Command, Options } from "@effect/cli"
import { Path } from "@effect/platform"
import { Console, Effect, Option } from "effect"
import { agentName, companionAgents } from "../core/companions.js"
import { contentHash } from "../core/hash.js"
import { MANIFEST_PATH } from "../core/manifest.js"
import { type ReportLine, renderReport, renderReportJson } from "../core/report.js"
import { CliError } from "../errors.js"
import { Assets, type AssetFile } from "../services/Assets.js"
import { exists, readTextOrNull, writeText } from "../services/fsx.js"
import { detectGlobalSkillsDir, globalAgentsDir } from "../services/workspace.js"

/**
 * `brain install-skill [skill]` — copy one skill out of this package into a
 * skills directory, by default the user's GLOBAL one (`~/.agents/skills` or
 * `~/.claude/skills`). With no name it installs the init-brain orchestrator,
 * so `/init-brain` is available in every project WITHOUT cloning this repo —
 * the no-clone onboarding entry point. With the name of a suite skill it
 * installs that skill on its own, for projects (or machines) that don't use
 * brain; agents linked to the skill (their `skills:` list) come along into the
 * agents directory, so the two always match.
 *
 * These copies are untracked (no manifest): safe by default, an existing
 * install is never overwritten — identical → `up-to-date`, differing →
 * reported and left alone unless `--force` is given. Inside a brain project,
 * `brain upgrade --skill <name>` is the tracked equivalent.
 */

const skill = Args.text({ name: "skill" }).pipe(
  Args.withDescription("Bundled skill to install (default: init-brain). Agents linked to it are installed too."),
  Args.optional
)
const force = Options.boolean("force").pipe(
  Options.withDescription("Overwrite an existing install (skill and linked agents) with the bundled version.")
)
const json = Options.boolean("json").pipe(
  Options.withDescription("Emit the report as JSON (machine/agent friendly).")
)
const skillsDir = Options.text("skills-dir").pipe(
  Options.withDescription(
    "Skills directory to install into (default: ~/.agents/skills if present, else ~/.claude/skills)."
  ),
  Options.optional
)
const agentsDir = Options.text("agents-dir").pipe(
  Options.withDescription(
    "Directory for the skill's linked agents (default: the `agents` dir next to --skills-dir, else ~/.claude/agents)."
  ),
  Options.optional
)

const ORCHESTRATOR = "init-brain"

export const installSkillCommand = Command.make(
  "install-skill",
  { skill, force, json, skillsDir, agentsDir },
  (opts) =>
    Effect.gen(function* () {
      const assets = yield* Assets
      const path = yield* Path.Path
      const name = Option.getOrElse(opts.skill, () => ORCHESTRATOR)
      const orchestrator = name === ORCHESTRATOR

      const files = orchestrator ? assets.initBrainSkill : assets.skills.get(name)
      if (files === undefined) {
        return yield* new CliError({
          message: `unknown skill ${name} — bundled skills: ${[ORCHESTRATOR, ...assets.skillNames].join(", ")}`
        })
      }
      if (files.size === 0) {
        return yield* new CliError({
          message: `the ${name} skill is not bundled with this package — broken install?`
        })
      }

      const destDir = Option.isSome(opts.skillsDir)
        ? opts.skillsDir.value
        : yield* detectGlobalSkillsDir
      const agentsDest = Option.isSome(opts.agentsDir)
        ? opts.agentsDir.value
        : Option.isSome(opts.skillsDir)
          ? path.join(path.dirname(path.resolve(opts.skillsDir.value)), "agents")
          : globalAgentsDir()
      const linked = orchestrator ? [] : (companionAgents(assets.agents).get(name) ?? [])

      /**
       * Install one unit (a skill dir, or an agent file) as a whole: absent →
       * installed; identical → up-to-date; differing → kept unless --force.
       */
      const syncUnit = (target: string, unit: ReadonlyArray<readonly [string, AssetFile]>) =>
        Effect.gen(function* () {
          const writeAll = Effect.forEach(unit, ([dest, asset]) => writeText(dest, asset.content), { discard: true })
          if (!(yield* exists(target))) {
            yield* writeAll
            return { path: target, status: "installed" } satisfies ReportLine
          }
          let differs = false
          for (const [dest, asset] of unit) {
            const current = yield* readTextOrNull(dest)
            if (current === null || contentHash(current) !== asset.hash) {
              differs = true
              break
            }
          }
          if (!differs) return { path: target, status: "up-to-date" } satisfies ReportLine
          if (opts.force) {
            yield* writeAll
            return { path: target, status: "updated", note: "overwritten (--force)" } satisfies ReportLine
          }
          return {
            path: target,
            status: "exists",
            note: "differs from bundled version — re-run with --force to overwrite"
          } satisfies ReportLine
        })

      // Keys are already "<skill>/<rel>", so destDir + key lands the skill at
      // <destDir>/<skill>/<rel>.
      const lines: Array<ReportLine> = [
        yield* syncUnit(`${destDir}/${name}`, [...files].map(([rel, a]) => [`${destDir}/${rel}`, a] as const))
      ]
      for (const rel of linked) {
        const dest = `${agentsDest}/${rel}`
        lines.push(yield* syncUnit(dest, [[dest, assets.agents.get(rel)!]]))
      }

      const inBrainProject = !Option.isSome(opts.skillsDir) && (yield* exists(MANIFEST_PATH))
      const notes = orchestrator
        ? [
            `skills directory: ${destDir}`,
            'next: open your project and run `/init-brain` (or tell your AI assistant "set up brain for this project")',
            "if /init-brain does not appear yet, reload skills by restarting the session"
          ]
        : [
            `skills directory: ${destDir}`,
            ...(linked.length > 0
              ? [`agents directory: ${agentsDest} — the ${linked.map(agentName).join(", ")} agent is linked to ${name} and installed with it`]
              : []),
            "untracked copy — after updating brain-manager, re-run with --force to sync it",
            ...(inBrainProject
              ? [`this is a brain project: \`brain upgrade --skill ${name}\` installs it into the project instead, tracked by the manifest`]
              : []),
            "if the skill does not appear yet, reload skills by restarting the session"
          ]

      const report = { command: orchestrator ? "install-skill" : `install-skill ${name}`, lines, notes, ok: true }
      yield* Console.log(opts.json ? renderReportJson(report) : renderReport(report))
    })
).pipe(
  Command.withDescription(
    "Install one bundled skill (default: the init-brain orchestrator) into your global skills dir, with the agents linked to it (no clone needed)."
  )
)
