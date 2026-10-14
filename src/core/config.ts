import { Either, ParseResult, Schema } from "effect"

/**
 * The project config (`brain/brain.config.json`): the project facts and the
 * policy knobs the suite reads at runtime, so a project never has to edit an
 * installed skill to fit its own conventions.
 *
 * It is `seed` in the manifest — written once by `init` (or by `upgrade` on an
 * install that predates it), then owned by the project. Later runs only ever add
 * keys that are missing (`mergeMissing`); an existing value is never changed by
 * the CLI except through `brain config set`.
 *
 * No config file means every default below. The review defaults reproduce 0.6.0
 * behavior; `execution.delegation` defaults to `supervised` (tiered workers),
 * and `inline` restores the earlier single-model execution.
 */

export const CONFIG_PATH = "brain/brain.config.json"
export const CONFIG_VERSION = 1

export const REVIEW_MODES = ["total", "plan", "none"] as const
export const REVIEW_LOCATIONS = ["spec-folder", "review-tree"] as const
export const DELEGATION_MODES = ["supervised", "inline"] as const

export const ReviewMode = Schema.Literal(...REVIEW_MODES)
export type ReviewMode = typeof ReviewMode.Type
export const ReviewLocation = Schema.Literal(...REVIEW_LOCATIONS)
export type ReviewLocation = typeof ReviewLocation.Type
export const DelegationMode = Schema.Literal(...DELEGATION_MODES)
export type DelegationMode = typeof DelegationMode.Type

/** A repo-relative path: non-empty, not absolute, never escaping the repo. */
const isRepoPath = (s: string): boolean =>
  s.trim().length > 0 && !s.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(s) && !s.split(/[\\/]/).includes("..")

const RepoPath = Schema.String.pipe(
  Schema.filter(isRepoPath, { message: () => "must be a repo-relative path (not absolute, no `..`)" })
)

export interface BrainConfig {
  readonly version: number
  readonly review: { readonly mode: ReviewMode; readonly location: ReviewLocation }
  readonly paths: { readonly techDebt: string; readonly reviews: string; readonly personas: string | null }
  readonly execution: { readonly delegation: DelegationMode }
}

export const defaultConfig: BrainConfig = {
  version: CONFIG_VERSION,
  review: { mode: "total", location: "spec-folder" },
  paths: { techDebt: "brain/tech-debt", reviews: "brain/review", personas: null },
  execution: { delegation: "supervised" }
}

/** Every key is optional on decode, so a partial or older file resolves against the defaults. */
const ConfigSchema = Schema.Struct({
  version: Schema.optionalWith(Schema.Number, { default: () => CONFIG_VERSION }),
  review: Schema.optionalWith(
    Schema.Struct({
      mode: Schema.optionalWith(ReviewMode, { default: () => defaultConfig.review.mode }),
      location: Schema.optionalWith(ReviewLocation, { default: () => defaultConfig.review.location })
    }),
    { default: () => ({ ...defaultConfig.review }) }
  ),
  paths: Schema.optionalWith(
    Schema.Struct({
      techDebt: Schema.optionalWith(RepoPath, { default: () => defaultConfig.paths.techDebt }),
      reviews: Schema.optionalWith(RepoPath, { default: () => defaultConfig.paths.reviews }),
      personas: Schema.optionalWith(Schema.NullOr(RepoPath), { default: () => defaultConfig.paths.personas })
    }),
    { default: () => ({ ...defaultConfig.paths }) }
  ),
  execution: Schema.optionalWith(
    Schema.Struct({
      delegation: Schema.optionalWith(DelegationMode, { default: () => defaultConfig.execution.delegation })
    }),
    { default: () => ({ ...defaultConfig.execution }) }
  )
})

/** A config as it sits on disk: any subset of the keys (plus whatever else the project added). */
export type PartialConfig = { readonly [key: string]: unknown }

/** The dotted keys the CLI knows, in display order. */
export const CONFIG_KEYS = [
  "review.mode",
  "review.location",
  "paths.techDebt",
  "paths.reviews",
  "paths.personas",
  "execution.delegation"
] as const
export type ConfigKey = (typeof CONFIG_KEYS)[number]

export const isConfigKey = (key: string): key is ConfigKey =>
  (CONFIG_KEYS as ReadonlyArray<string>).includes(key)

/** Allowed values of a key, as shown in error messages and `--help`. */
export const allowedValues = (key: ConfigKey): string => {
  switch (key) {
    case "review.mode":
      return REVIEW_MODES.join(", ")
    case "review.location":
      return REVIEW_LOCATIONS.join(", ")
    case "execution.delegation":
      return DELEGATION_MODES.join(", ")
    case "paths.personas":
      return "a repo-relative file path, or null"
    case "paths.techDebt":
    case "paths.reviews":
      return "a repo-relative directory path"
  }
}

const formatError = (e: ParseResult.ParseError): string =>
  ParseResult.ArrayFormatter.formatErrorSync(e)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ")

/** Validate an already-parsed object and resolve it against the defaults. */
export const validateConfig = (input: unknown): Either.Either<BrainConfig, string> =>
  Schema.decodeUnknownEither(ConfigSchema, { errors: "all" })(input).pipe(Either.mapLeft(formatError))

/** Parse and validate the file's text. */
export const decodeConfig = (raw: string): Either.Either<BrainConfig, string> =>
  Either.flatMap(parseConfigObject(raw), validateConfig)

/** Parse the file's text into a plain object without resolving defaults (so absent keys stay absent). */
export const parseConfigObject = (raw: string): Either.Either<PartialConfig, string> => {
  try {
    const value: unknown = JSON.parse(raw)
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? Either.right(value as PartialConfig)
      : Either.left("the config must be a JSON object")
  } catch (e) {
    return Either.left(`not valid JSON (${(e as Error).message})`)
  }
}

export const encodeConfig = (config: PartialConfig): string => `${JSON.stringify(config, null, 2)}\n`

/** Fill every absent key of a valid partial config with its default. */
export const withDefaults = (partial: PartialConfig): BrainConfig =>
  Either.getOrElse(validateConfig(partial), () => defaultConfig)

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const hasPath = (obj: PartialConfig, key: string): boolean => {
  let cur: unknown = obj
  for (const part of key.split(".")) {
    if (!isRecord(cur) || !(part in cur)) return false
    cur = cur[part]
  }
  return true
}

export const getKey = (config: BrainConfig, key: ConfigKey): string | null => {
  const [section, leaf] = key.split(".") as ["review" | "paths" | "execution", string]
  return (config[section] as Record<string, string | null>)[leaf] ?? null
}

const setPath = (obj: PartialConfig, key: string, value: unknown): PartialConfig => {
  const [head, ...rest] = key.split(".")
  if (rest.length === 0) return { ...obj, [head!]: value }
  const child = isRecord(obj[head!]) ? (obj[head!] as PartialConfig) : {}
  return { ...obj, [head!]: setPath(child, rest.join("."), value) }
}

export interface MergeResult {
  readonly config: PartialConfig
  /** The dotted keys that were absent and got a value from `detected`. */
  readonly added: ReadonlyArray<string>
}

/**
 * Add the keys `existing` lacks, taking their values from `detected`. A key the
 * project already has is never changed — even when detection disagrees — and
 * keys the CLI does not know are kept as they are.
 */
export const mergeMissing = (existing: PartialConfig, detected: BrainConfig): MergeResult => {
  let config: PartialConfig = existing
  const added: Array<string> = []
  if (!hasPath(existing, "version")) {
    config = setPath(config, "version", detected.version)
    added.push("version")
  }
  for (const key of CONFIG_KEYS) {
    if (hasPath(existing, key)) continue
    config = setPath(config, key, getKey(detected, key))
    added.push(key)
  }
  return { config: added.length === 0 ? existing : config, added }
}

/** Parse a CLI value for `key`: `null` (only for `paths.personas`) or the string, trailing slashes dropped. */
const parseValue = (key: ConfigKey, raw: string): string | null => {
  const value = raw.trim()
  if (key === "paths.personas" && (value === "null" || value === "")) return null
  return key.startsWith("paths.") ? value.replace(/\/+$/, "") : value
}

/**
 * Set one dotted key on a config object, validating the key and its value. The
 * error message names the allowed keys or values, so a CLI can print it as-is.
 */
export const setKey = (
  config: PartialConfig,
  key: string,
  raw: string
): Either.Either<PartialConfig, string> => {
  if (!isConfigKey(key)) {
    return Either.left(`unknown config key "${key}" — known keys: ${CONFIG_KEYS.join(", ")}`)
  }
  const value = parseValue(key, raw)
  const probe = validateConfig(setPath({}, key, value))
  if (Either.isLeft(probe)) {
    return Either.left(`invalid value "${raw}" for ${key} — allowed: ${allowedValues(key)}`)
  }
  return Either.right(setPath(config, key, value))
}

/** The config as a flat `{ "review.mode": "total", … }` view, in key order. */
export const flattenConfig = (config: BrainConfig): Record<ConfigKey, string | null> =>
  Object.fromEntries(CONFIG_KEYS.map((k) => [k, getKey(config, k)])) as Record<ConfigKey, string | null>
