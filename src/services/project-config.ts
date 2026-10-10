import { Effect, Either } from "effect"
import {
  type BrainConfig,
  CONFIG_PATH,
  type ConfigKey,
  type PartialConfig,
  encodeConfig,
  getKey,
  mergeMissing,
  parseConfigObject,
  setKey,
  withDefaults
} from "../core/config.js"
import type { Suggestion } from "../core/detect.js"
import { contentHash } from "../core/hash.js"
import type { ManifestEntry } from "../core/manifest.js"
import type { ReportLine } from "../core/report.js"
import { CliError } from "../errors.js"
import { readTextOrNull, writeText } from "./fsx.js"

/**
 * Writes `brain/brain.config.json` for `init` and `upgrade`: the full config
 * when it is absent, only the missing keys when it exists (never changing a
 * value the project already has). Returns the report line, the notes that
 * explain each value, and the manifest entry (always `seed`).
 */

export interface EnsureConfigOptions {
  /** What detection suggests, one entry per key (core/detect.ts). */
  readonly suggestions: ReadonlyArray<Suggestion>
  /** Explicit values (CLI flags), applied over the suggestions. */
  readonly overrides: ReadonlyArray<readonly [ConfigKey, string]>
  readonly dryRun: boolean
}

export interface EnsureConfigResult {
  readonly line: ReportLine
  readonly notes: ReadonlyArray<string>
  readonly entry: ManifestEntry | null
  readonly config: BrainConfig | null
}

/** Apply `key=value` overrides to a config object, failing with the allowed values on a bad one. */
export const applyOverrides = (base: PartialConfig, overrides: ReadonlyArray<readonly [ConfigKey, string]>) =>
  Effect.gen(function* () {
    let config = base
    for (const [key, raw] of overrides) {
      const next = setKey(config, key, raw)
      if (Either.isLeft(next)) return yield* new CliError({ message: next.left })
      config = next.right
    }
    return config
  })

export const ensureConfig = (opts: EnsureConfigOptions) =>
  Effect.gen(function* () {
    let detected: PartialConfig = { version: 1 }
    for (const s of opts.suggestions) {
      // A suggestion that does not validate is dropped; its key falls back to the default.
      const current = detected
      detected = Either.getOrElse(setKey(current, s.key, s.value === null ? "null" : s.value), () => current)
    }
    const target = withDefaults(yield* applyOverrides(detected, opts.overrides))
    const explain = (key: ConfigKey): string => {
      const flag = opts.overrides.find(([k]) => k === key)
      const reason = flag !== undefined ? "set by flag" : (opts.suggestions.find((s) => s.key === key)?.reason ?? "default")
      return `config: ${key} = ${JSON.stringify(getKey(target, key))} — ${reason}`
    }

    const raw = yield* readTextOrNull(CONFIG_PATH)
    if (raw === null) {
      const content = encodeConfig(target as unknown as PartialConfig)
      if (!opts.dryRun) yield* writeText(CONFIG_PATH, content)
      const result: EnsureConfigResult = {
        line: { path: CONFIG_PATH, status: "created", note: `review.mode ${target.review.mode}, review.location ${target.review.location}` },
        notes: (["review.mode", "review.location", "paths.techDebt", "paths.reviews", "paths.personas"] as const).map(explain),
        entry: { path: CONFIG_PATH, role: "seed", hash: contentHash(content) },
        config: target
      }
      return result
    }

    const parsed = parseConfigObject(raw)
    if (Either.isLeft(parsed)) {
      const result: EnsureConfigResult = {
        line: { path: CONFIG_PATH, status: "kept", note: `unreadable (${parsed.left}) — left as is; \`brain doctor\` reports it` },
        notes: [],
        entry: { path: CONFIG_PATH, role: "seed", hash: contentHash(raw) },
        config: null
      }
      return result
    }

    const { config, added } = mergeMissing(parsed.right, target)
    const content = added.length > 0 ? encodeConfig(config) : raw
    if (added.length > 0 && !opts.dryRun) yield* writeText(CONFIG_PATH, content)
    const resolved = withDefaults(config)
    // A flag never changes a value the project already has: say so instead.
    const ignored = opts.overrides
      .filter(([key]) => !added.includes(key) && getKey(resolved, key) !== getKey(target, key))
      .map(([key]) => `config: ${key} kept at ${JSON.stringify(getKey(resolved, key))} — the flag does not change an existing value; run \`brain config set ${key} ${getKey(target, key)}\``)
    const result: EnsureConfigResult = {
      line: added.length > 0
        ? { path: CONFIG_PATH, status: "updated", note: `added missing key(s): ${added.join(", ")}` }
        : { path: CONFIG_PATH, status: "kept", note: "already present — left untouched" },
      notes: [...added.filter((k): k is ConfigKey => k !== "version").map(explain), ...ignored],
      entry: { path: CONFIG_PATH, role: "seed", hash: contentHash(content) },
      config: resolved
    }
    return result
  })
