import { FileSystem, Path } from "@effect/platform"
import { Effect } from "effect"
import { homedir } from "node:os"

/**
 * The GLOBAL skills directory under the user's home — where cross-project
 * orchestrator skills like init-brain live so they are available in every
 * project, not just the current one. Prefer an existing `~/.agents/skills`,
 * else `~/.claude/skills`. Used by `brain install-skill`.
 */
export const detectGlobalSkillsDir = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const home = homedir()
  const agents = path.join(home, ".agents", "skills")
  if (yield* fs.exists(agents)) return agents
  return path.join(home, ".claude", "skills")
})
