import { Command } from "@effect/cli"
import { doctorCommand } from "./commands/doctor.js"
import { initCommand } from "./commands/init.js"
import { installSkillCommand } from "./commands/install-skill.js"
import { linkCommand } from "./commands/link.js"
import { onboardCommand } from "./commands/onboard.js"
import { scanCommand } from "./commands/scan.js"
import { upgradeCommand } from "./commands/upgrade.js"
import { VERSION } from "./version.js"

const brain = Command.make("brain").pipe(
  Command.withDescription(
    "Bootstrap and maintain the brain/ knowledge base and its spec-driven skill suite."
  ),
  Command.withSubcommands([
    onboardCommand,
    installSkillCommand,
    initCommand,
    linkCommand,
    upgradeCommand,
    doctorCommand,
    scanCommand
  ])
)

export const cli = Command.run(brain, {
  name: "brain-manager",
  version: VERSION
})
