import { Args, Command, Options } from "@effect/cli"
import { Console, Effect, Either, Option } from "effect"
import {
  CONFIG_KEYS,
  CONFIG_PATH,
  type BrainConfig,
  type ConfigKey,
  defaultConfig,
  encodeConfig,
  flattenConfig,
  getKey,
  isConfigKey,
  mergeMissing,
  parseConfigObject,
  setKey,
  validateConfig,
  withDefaults
} from "../core/config.js"
import { CliError } from "../errors.js"
import { exists, readTextOrNull, writeText } from "../services/fsx.js"

/**
 * `brain config get [key]` / `brain config set <key> <value>` — read and change
 * the project config (`brain/brain.config.json`) with validation. `get` shows
 * the resolved values (defaults applied); `set` rejects an unknown key or value
 * with the allowed set and writes the file. This is the documented way to
 * change the config by hand.
 */

const json = Options.boolean("json").pipe(
  Options.withDescription("Emit the result as JSON (machine/agent friendly).")
)

const unknownKey = (key: string) =>
  new CliError({ message: `unknown config key "${key}" — known keys: ${CONFIG_KEYS.join(", ")}` })

/** The resolved config and where it came from; an invalid file is an error. */
const loadResolved = Effect.gen(function* () {
  const raw = yield* readTextOrNull(CONFIG_PATH)
  if (raw === null) return { source: "defaults" as const, config: defaultConfig }
  const parsed = Either.flatMap(parseConfigObject(raw), validateConfig)
  if (Either.isLeft(parsed)) {
    return yield* new CliError({ message: `${CONFIG_PATH} is invalid — ${parsed.left} (fix it with \`brain config set\`)` })
  }
  return { source: "file" as const, config: parsed.right }
})

const getCommand = Command.make(
  "get",
  { key: Args.text({ name: "key" }).pipe(Args.optional), json },
  (opts) =>
    Effect.gen(function* () {
      const { config, source } = yield* loadResolved
      if (Option.isSome(opts.key)) {
        const key = opts.key.value
        if (!isConfigKey(key)) return yield* unknownKey(key)
        const value = getKey(config, key)
        yield* Console.log(opts.json ? JSON.stringify({ command: "config get", key, value, source }, null, 2) : String(value))
        return
      }
      if (opts.json) {
        yield* Console.log(JSON.stringify({ command: "config get", source, config }, null, 2))
        return
      }
      const header = source === "file" ? CONFIG_PATH : `defaults — no ${CONFIG_PATH} yet`
      const rows = Object.entries(flattenConfig(config)).map(([k, v]) => `  ${k} = ${JSON.stringify(v)}`)
      yield* Console.log([`brain config (${header})`, ...rows].join("\n"))
    })
).pipe(Command.withDescription("Print the resolved project config (defaults applied), or one key."))

const setCommand = Command.make(
  "set",
  { key: Args.text({ name: "key" }), value: Args.text({ name: "value" }), json },
  (opts) =>
    Effect.gen(function* () {
      if (!(yield* exists("brain"))) {
        return yield* new CliError({ message: "no brain/ here — run `brain init` first" })
      }
      const raw = yield* readTextOrNull(CONFIG_PATH)
      const parsed = raw === null ? Either.right({}) : parseConfigObject(raw)
      if (Either.isLeft(parsed)) {
        return yield* new CliError({ message: `${CONFIG_PATH} does not parse — ${parsed.left}; fix or delete it first` })
      }
      const next = setKey(parsed.right, opts.key, opts.value)
      if (Either.isLeft(next)) return yield* new CliError({ message: next.left })

      // A new file gets every key, so it documents the full set.
      const written = raw === null ? mergeMissing(next.right, defaultConfig).config : next.right
      const valid = validateConfig(written)
      if (Either.isLeft(valid)) {
        return yield* new CliError({ message: `${CONFIG_PATH} is still invalid after the change — ${valid.left}` })
      }
      const key = opts.key as ConfigKey
      const before: BrainConfig = raw === null ? defaultConfig : withDefaults(parsed.right)
      const from = Either.isRight(validateConfig(parsed.right)) ? getKey(before, key) : null
      const to = getKey(valid.right, key)
      yield* writeText(CONFIG_PATH, encodeConfig(written))
      yield* Console.log(
        opts.json
          ? JSON.stringify({ command: "config set", key, from, to, created: raw === null }, null, 2)
          : `${key}: ${JSON.stringify(from)} → ${JSON.stringify(to)}${raw === null ? ` (created ${CONFIG_PATH})` : ""}`
      )
    })
).pipe(Command.withDescription("Set one project config key, validating it (e.g. `brain config set review.mode none`)."))

export const configCommand = Command.make("config").pipe(
  Command.withDescription(
    `Read or change the project config (${CONFIG_PATH}): ${CONFIG_KEYS.join(", ")}.`
  ),
  Command.withSubcommands([getCommand, setCommand])
)
