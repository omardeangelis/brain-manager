import { FileSystem, Path } from "@effect/platform"
import { Effect } from "effect"
import { homedir } from "node:os"

/**
 * The skills directory convention, mirrored from the original skill: prefer
 * an existing `.agents/skills/`, else `.claude/skills/` (created on demand).
 * All command paths are relative to the process working directory.
 */
export const detectSkillsDir = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  if (yield* fs.exists(".agents/skills")) return ".agents/skills"
  return ".claude/skills"
})

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
