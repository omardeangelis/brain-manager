import { Either } from "effect"
import { describe, expect, it } from "vitest"
import {
  CONFIG_KEYS,
  CONFIG_PATH,
  type PartialConfig,
  decodeConfig,
  defaultConfig,
  encodeConfig,
  flattenConfig,
  mergeMissing,
  setKey,
  validateConfig,
  withDefaults
} from "./config.js"
import { defaultRole } from "./manifest.js"

const right = <A>(e: Either.Either<A, string>): A => {
  if (Either.isLeft(e)) throw new Error(`expected Right, got Left: ${e.left}`)
  return e.right
}
const left = <A>(e: Either.Either<A, string>): string => {
  if (Either.isRight(e)) throw new Error("expected Left, got Right")
  return e.left
}

describe("defaults", () => {
  it("match the SPEC table (0.6.0 behavior)", () => {
    expect(defaultConfig).toEqual({
      version: 1,
      review: { mode: "total", location: "spec-folder" },
      paths: { techDebt: "brain/tech-debt", reviews: "brain/review", personas: null }
    })
  })

  it("resolve an empty object to the defaults", () => {
    expect(right(validateConfig({}))).toEqual(defaultConfig)
    expect(withDefaults({})).toEqual(defaultConfig)
  })

  it("round-trip through encode/decode", () => {
    expect(right(decodeConfig(encodeConfig(defaultConfig as unknown as PartialConfig)))).toEqual(defaultConfig)
  })
})

describe("decodeConfig", () => {
  it("fills the keys a partial or older file lacks", () => {
    const config = right(decodeConfig(JSON.stringify({ review: { mode: "none" }, paths: { personas: "brain/personas.md" } })))
    expect(config.review).toEqual({ mode: "none", location: "spec-folder" })
    expect(config.paths).toEqual({ techDebt: "brain/tech-debt", reviews: "brain/review", personas: "brain/personas.md" })
    expect(config.version).toBe(1)
  })

  it("rejects an unknown review mode, naming the key", () => {
    expect(left(decodeConfig(JSON.stringify({ review: { mode: "strict" } })))).toMatch(/review\.mode/)
  })

  it("rejects an absolute or escaping path", () => {
    expect(left(decodeConfig(JSON.stringify({ paths: { techDebt: "/etc/debt" } })))).toMatch(/paths\.techDebt/)
    expect(left(decodeConfig(JSON.stringify({ paths: { reviews: "../elsewhere" } })))).toMatch(/paths\.reviews/)
  })

  it("rejects text that is not a JSON object", () => {
    expect(left(decodeConfig("{ not json"))).toMatch(/not valid JSON/)
    expect(left(decodeConfig("[]"))).toMatch(/JSON object/)
  })
})

describe("mergeMissing", () => {
  const detected = {
    ...defaultConfig,
    review: { mode: "none" as const, location: "review-tree" as const },
    paths: { ...defaultConfig.paths, personas: "brain/personas.md" }
  }

  it("never overwrites a value the project already has", () => {
    const existing = { version: 1, review: { mode: "plan" }, paths: { techDebt: "docs/debt" } }
    const { config, added } = mergeMissing(existing, detected)
    const resolved = withDefaults(config)
    expect(resolved.review.mode).toBe("plan")
    expect(resolved.paths.techDebt).toBe("docs/debt")
    // only the absent keys came from detection
    expect(resolved.review.location).toBe("review-tree")
    expect(resolved.paths.personas).toBe("brain/personas.md")
    expect(added).toEqual(["review.location", "paths.reviews", "paths.personas"])
  })

  it("keeps a present null and keys the CLI does not know", () => {
    const existing = { version: 1, review: { mode: "total", location: "spec-folder" }, paths: { techDebt: "brain/tech-debt", reviews: "brain/review", personas: null }, custom: { x: 1 } }
    const { config, added } = mergeMissing(existing, detected)
    expect(added).toEqual([])
    expect(config).toBe(existing)
    expect(withDefaults(config).paths.personas).toBeNull()
  })

  it("writes every key into an empty config", () => {
    const { config, added } = mergeMissing({}, detected)
    expect(added).toEqual(["version", ...CONFIG_KEYS])
    expect(withDefaults(config)).toEqual(detected)
  })
})

describe("setKey", () => {
  it("sets a valid value", () => {
    const next = right(setKey({ version: 1 }, "review.mode", "none"))
    expect(withDefaults(next).review.mode).toBe("none")
  })

  it("rejects an unknown key, listing the known keys", () => {
    const message = left(setKey({}, "review.depth", "x"))
    expect(message).toMatch(/unknown config key "review\.depth"/)
    for (const key of CONFIG_KEYS) expect(message).toContain(key)
  })

  it("rejects an invalid value with the allowed set", () => {
    expect(left(setKey({}, "review.mode", "bad"))).toMatch(/allowed: total, plan, none/)
    expect(left(setKey({}, "review.location", "nowhere"))).toMatch(/allowed: spec-folder, review-tree/)
    expect(left(setKey({}, "paths.techDebt", "/abs"))).toMatch(/repo-relative/)
  })

  it("accepts null for personas and drops trailing slashes on paths", () => {
    expect(withDefaults(right(setKey({ paths: { personas: "x.md" } }, "paths.personas", "null"))).paths.personas).toBeNull()
    expect(withDefaults(right(setKey({}, "paths.techDebt", "docs/tech-debt/"))).paths.techDebt).toBe("docs/tech-debt")
  })

  it("leaves sibling keys alone", () => {
    const next = right(setKey({ review: { mode: "plan", location: "review-tree" } }, "review.mode", "none"))
    expect(withDefaults(next).review).toEqual({ mode: "none", location: "review-tree" })
  })
})

describe("flattenConfig", () => {
  it("lists every key in display order", () => {
    expect(Object.keys(flattenConfig(defaultConfig))).toEqual([...CONFIG_KEYS])
  })
})

describe("manifest role", () => {
  it("records the config as project-owned seed", () => {
    expect(defaultRole(CONFIG_PATH)).toBe("seed")
  })
})
