import { FileSystem } from "@effect/platform"
import { Effect } from "effect"

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
