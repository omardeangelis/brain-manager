import { FileSystem, Path } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"
import { Effect } from "effect"
import type { DiskFact } from "../core/link-plan.js"

/**
 * Small filesystem helpers on top of @effect/platform's FileSystem service.
 * Every function returns an Effect that *requires* FileSystem/Path in its
 * context — the Node implementations are provided once, in bin.ts.
 */

/** All files under `dir`, as POSIX-style paths relative to `dir`. */
export const walkFiles = (
  dir: string
): Effect.Effect<Array<string>, PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const out: Array<string> = []

    const visit = (rel: string): Effect.Effect<void, PlatformError> =>
      Effect.gen(function* () {
        const abs = path.join(dir, rel)
        const stat = yield* fs.stat(abs)
        if (stat.type === "Directory") {
          const entries = yield* fs.readDirectory(abs)
          yield* Effect.forEach(entries.sort(), (entry) =>
            visit(rel === "" ? entry : `${rel}/${entry}`)
          )
        } else if (stat.type === "File") {
          out.push(rel)
        }
      })

    yield* visit("")
    return out
  })

export const readText = (file: string) =>
  Effect.flatMap(FileSystem.FileSystem, (fs) => fs.readFileString(file))

/** Write a file, creating parent directories as needed. */
export const writeText = (file: string, content: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    yield* fs.makeDirectory(path.dirname(file), { recursive: true })
    yield* fs.writeFileString(file, content)
  })

export const exists = (file: string) =>
  Effect.flatMap(FileSystem.FileSystem, (fs) => fs.exists(file))

/** Read a file as text, or `null` when it does not exist. */
export const readTextOrNull = (file: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    return (yield* fs.exists(file)) ? yield* fs.readFileString(file) : null
  })

/**
 * Classify a path as absent / file / dir / symlink WITHOUT following symlinks.
 * `readLink` succeeds only on a symlink (even a dangling one), so it is the
 * symlink probe; `stat` (which follows links) then distinguishes file vs dir.
 */
export const pathFact = (
  path: string
): Effect.Effect<DiskFact, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const link = yield* fs.readLink(path).pipe(Effect.option)
    if (link._tag === "Some") return { kind: "symlink", target: link.value }
    const stat = yield* fs.stat(path).pipe(Effect.option)
    if (stat._tag === "None") return { kind: "absent" }
    return { kind: stat.value.type === "Directory" ? "dir" : "file" }
  })

/** Create a symlink at `linkPath` pointing to `target` (Node order: symlink(target, path)). Parents are created. */
export const symlinkRel = (target: string, linkPath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    yield* fs.makeDirectory(path.dirname(linkPath), { recursive: true })
    yield* fs.symlink(target, linkPath)
  })

/** Move a path, creating the destination's parent directories first. */
export const renamePath = (from: string, to: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    yield* fs.makeDirectory(path.dirname(to), { recursive: true })
    yield* fs.rename(from, to)
  })

/** Remove a file, symlink, or (with `recursive`) a directory. */
export const removePath = (target: string, recursive = false) =>
  Effect.flatMap(FileSystem.FileSystem, (fs) => fs.remove(target, { recursive }))
