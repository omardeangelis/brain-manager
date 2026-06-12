import { FileSystem, Path } from "@effect/platform"
import { Effect } from "effect"
import { fileURLToPath } from "node:url"
import { contentHash } from "../core/hash.js"
import { CliError } from "../errors.js"
import { walkFiles } from "./fsx.js"

/**
 * Locates the assets bundled with this package (the brain/ scaffold and the
 * skill suite) and exposes them as in-memory maps keyed by the path they will
 * have inside the target project.
 *
 * Compiled location of this file is dist/services/Assets.js, so the package
 * root is two levels up.
 */

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url))

export interface AssetFile {
  readonly content: string
  readonly hash: string
}

export class Assets extends Effect.Service<Assets>()("Assets", {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const assetsDir = path.join(PACKAGE_ROOT, "assets")

    if (!(yield* fs.exists(path.join(assetsDir, "brain")))) {
      return yield* new CliError({
        message: `bundled assets not found at ${assetsDir} — broken install?`
      })
    }

    const loadDir = (dir: string, prefix: string) =>
      Effect.gen(function* () {
        const files = new Map<string, AssetFile>()
        for (const rel of yield* walkFiles(dir)) {
          const content = yield* fs.readFileString(path.join(dir, rel))
          files.set(`${prefix}/${rel}`, { content, hash: contentHash(content) })
        }
        return files
      })

    // Keyed as "brain/<rel>" — same path they get in the target project.
    const brain = yield* loadDir(path.join(assetsDir, "brain"), "brain")

    // Keyed as "<skill>/<rel>" — relative to the target skills directory,
    // which is only known at command time.
    const skillNames = (yield* fs.readDirectory(path.join(assetsDir, "skills"))).sort()
    const skills = new Map<string, Map<string, AssetFile>>()
    for (const name of skillNames) {
      skills.set(name, yield* loadDir(path.join(assetsDir, "skills", name), name))
    }

    // The init-brain orchestrator skill ships at <root>/skills/init-brain (not
    // under assets/). `brain install-skill` copies it into the user's global
    // skills dir so /init-brain is available without cloning this repo. Keyed
    // as "init-brain/<rel>" — same shape as the suite skills above.
    const orchestratorDir = path.join(PACKAGE_ROOT, "skills", "init-brain")
    const initBrainSkill = (yield* fs.exists(path.join(orchestratorDir, "SKILL.md")))
      ? yield* loadDir(orchestratorDir, "init-brain")
      : new Map<string, AssetFile>()

    return { brain, skills, skillNames, initBrainSkill }
  })
}) {}
