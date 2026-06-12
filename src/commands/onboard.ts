import { Command, Options } from "@effect/cli"
import { Console, Effect } from "effect"
import { CliError } from "../errors.js"
import { Assets } from "../services/Assets.js"
import { VERSION } from "../version.js"

/**
 * `brain onboard` — emit the init-brain orchestration playbook (the SKILL.md
 * body plus its references, inlined) straight from the package, so any AI
 * assistant can drive a brain setup WITHOUT a skill installed on the machine.
 *
 * This is the install-free, drift-free sibling of `install-skill`: the playbook
 * is read fresh from the package on every run, so it can never go stale. The
 * `references/...` files the playbook mentions are inlined into the output, so
 * there is nothing to read from disk.
 */

const json = Options.boolean("json").pipe(
  Options.withDescription(
    "Emit the playbook as structured JSON (body + references) for programmatic use."
  )
)

const SKILL = "init-brain"

/** Drop the skill YAML frontmatter; the printed playbook supplies its own header. */
const stripFrontmatter = (md: string): string =>
  md.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^\n+/, "")

const INTRO = `# brain onboarding playbook

Follow this playbook to completion to set up the \`brain\` workflow in the current
project. It is delivered fresh from the brain-manager package — nothing is
installed on this machine. Start at "Step 0 — Resolve the CLI"; it falls back to
\`npx -y brain-manager\` automatically. The \`references/...\` files mentioned below
are inlined at the end of this output — use those, do not read them from disk.`

export const onboardCommand = Command.make("onboard", { json }, (opts) =>
  Effect.gen(function* () {
    const assets = yield* Assets
    const files = assets.initBrainSkill
    const skillMd = files.get(`${SKILL}/SKILL.md`)
    if (skillMd === undefined) {
      return yield* new CliError({
        message: `the ${SKILL} playbook is not bundled with this package — broken install?`
      })
    }

    const playbook = stripFrontmatter(skillMd.content)

    const references = new Map<string, string>()
    for (const [key, asset] of files) {
      const rel = key.slice(SKILL.length + 1) // strip "init-brain/"
      if (rel.startsWith("references/")) references.set(rel, asset.content)
    }
    const refKeys = [...references.keys()].sort()

    if (opts.json) {
      yield* Console.log(
        JSON.stringify(
          {
            command: "onboard",
            skill: SKILL,
            version: VERSION,
            playbook,
            references: Object.fromEntries(refKeys.map((k) => [k, references.get(k)!]))
          },
          null,
          2
        )
      )
      return
    }

    const out: Array<string> = [INTRO, "", "---", "", playbook]
    if (refKeys.length > 0) {
      out.push("", "---", "", "# Inlined references")
      for (const rel of refKeys) {
        out.push("", `## ${rel}`, "", references.get(rel)!.trimEnd())
      }
    }
    yield* Console.log(out.join("\n"))
  })
).pipe(
  Command.withDescription(
    "Print the init-brain onboarding playbook (no install needed) for an AI assistant to follow."
  )
)
