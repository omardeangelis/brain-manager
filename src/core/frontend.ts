/**
 * Frontend-stack detection for `brain scan`. The design-engineering skill's
 * framework-specific examples are written for React + Motion for React; any
 * other stack gets a researched translation (the skill's
 * `references/stack-adaptation.md`, written to `brain/chore/motion-stack.md`).
 * This module only recognizes what manifests declare — deciding what the
 * findings mean, and researching equivalents, stays with the LLM.
 */

export type FrameworkId =
  | "react"
  | "react-native"
  | "preact"
  | "vue"
  | "svelte"
  | "angular"
  | "solid"
  | "qwik"
  | "lit"
  | "ember"
  | "astro"
  | "vanilla"
  | "flutter"
  | "swift"
  | "compose"

export const NATIVE: ReadonlySet<FrameworkId> = new Set(["react-native", "flutter", "swift", "compose"])

export interface FrontendFinding {
  readonly path: string
  readonly framework: FrameworkId
  readonly version: string | null
  /** Meta-framework wrapping the framework, e.g. `next 15`. */
  readonly meta: string | null
  /** Astro UI integrations (`react`, `vue`, …). */
  readonly islands: ReadonlyArray<string>
  readonly motion: ReadonlyArray<string>
  readonly ui: ReadonlyArray<string>
  readonly styling: ReadonlyArray<string>
}

/** Meta-frameworks, checked before the libraries they wrap so the label names both. */
const META: ReadonlyArray<readonly [string, FrameworkId]> = [
  ["expo", "react-native"],
  ["next", "react"],
  ["@remix-run/react", "react"],
  ["@react-router/dev", "react"],
  ["@tanstack/react-start", "react"],
  ["gatsby", "react"],
  ["nuxt", "vue"],
  ["@sveltejs/kit", "svelte"],
  ["@analogjs/platform", "angular"],
  ["@solidjs/start", "solid"],
  ["@builder.io/qwik-city", "qwik"],
  ["astro", "astro"]
]

/** Framework libraries; the first one declared wins. */
const BASE: ReadonlyArray<readonly [string, FrameworkId]> = [
  ["react-native", "react-native"],
  ["@angular/core", "angular"],
  ["vue", "vue"],
  ["svelte", "svelte"],
  ["solid-js", "solid"],
  ["@builder.io/qwik", "qwik"],
  ["preact", "preact"],
  ["react-dom", "react"],
  ["react", "react"],
  ["lit", "lit"],
  ["ember-source", "ember"],
  ["htmx.org", "vanilla"],
  ["alpinejs", "vanilla"],
  ["@hotwired/stimulus", "vanilla"],
  ["@hotwired/turbo", "vanilla"],
  ["jquery", "vanilla"]
]

/** The package each framework's version is read from. */
const VERSION_FROM: Record<FrameworkId, string | null> = {
  react: "react",
  "react-native": "react-native",
  preact: "preact",
  vue: "vue",
  svelte: "svelte",
  angular: "@angular/core",
  solid: "solid-js",
  qwik: "@builder.io/qwik",
  lit: "lit",
  ember: "ember-source",
  astro: "astro",
  vanilla: null,
  flutter: null,
  swift: null,
  compose: null
}

const ASTRO_ISLANDS: ReadonlyArray<readonly [string, string]> = [
  ["@astrojs/react", "react"],
  ["@astrojs/preact", "preact"],
  ["@astrojs/vue", "vue"],
  ["@astrojs/svelte", "svelte"],
  ["@astrojs/solid-js", "solid"],
  ["@astrojs/lit", "lit"],
  ["@astrojs/alpinejs", "alpine"]
]

const MOTION = [
  "motion", "framer-motion", "motion-v", "@vueuse/motion", "@react-spring/web", "react-spring",
  "gsap", "animejs", "@formkit/auto-animate", "@angular/animations", "react-transition-group",
  "solid-motionone", "@motionone/solid", "react-native-reanimated", "moti", "@use-gesture/react",
  "react-native-gesture-handler", "lottie-web", "lottie-react", "@lottiefiles/dotlottie-web",
  "@lottiefiles/dotlottie-react", "tw-animate-css", "tailwindcss-animate"
]

const UI = [
  "radix-ui", "@base-ui-components/react", "@base-ui/react", "react-aria-components", "react-aria",
  "@headlessui/react", "@headlessui/vue", "reka-ui", "radix-vue", "bits-ui", "melt-ui", "@melt-ui/svelte",
  "@kobalte/core", "corvu", "@angular/cdk", "@angular/material", "@ark-ui/react", "@ark-ui/vue",
  "@ark-ui/svelte", "@ark-ui/solid", "sonner", "vue-sonner", "svelte-sonner", "ngx-sonner",
  "solid-sonner", "vaul", "vaul-vue", "vaul-svelte", "@gorhom/bottom-sheet"
]
/** Scoped families reported once, e.g. every `@radix-ui/react-*` as `@radix-ui/*`. */
const UI_FAMILIES: ReadonlyArray<readonly [string, string]> = [["@radix-ui/react-", "@radix-ui/*"]]

const STYLING = [
  "tailwindcss", "unocss", "nativewind", "styled-components", "@emotion/react", "@vanilla-extract/css",
  "@pandacss/dev", "sass"
]

/** `^19.1.0` → `19.1`; protocols and tags without a number (`workspace:*`, `latest`) → null. */
export const parseVersion = (range: string | undefined): string | null => {
  if (range === undefined) return null
  if (/^(workspace|catalog|npm|file|link|git|github|https?):/.test(range)) return null
  const m = range.match(/(\d+)(?:\.(\d+))?/)
  if (m === null) return null
  return m[2] === undefined ? m[1]! : `${m[1]}.${m[2]}`
}

/** `dependencies` win over `devDependencies` win over `peerDependencies`. */
export const collectDeps = (pkg: unknown): Record<string, string> => {
  if (typeof pkg !== "object" || pkg === null) return {}
  const out: Record<string, string> = {}
  for (const field of ["peerDependencies", "devDependencies", "dependencies"]) {
    const block = (pkg as Record<string, unknown>)[field]
    if (typeof block !== "object" || block === null) continue
    for (const [name, range] of Object.entries(block)) {
      if (typeof range === "string") out[name] = range
    }
  }
  return out
}

const label = (deps: Record<string, string>, name: string): string => {
  const v = parseVersion(deps[name])
  return v === null ? name : `${name} ${v}`
}

/** One `package.json` → a finding, or null when it declares no frontend framework. */
export const detectPackage = (path: string, deps: Record<string, string>): FrontendFinding | null => {
  const has = (name: string) => deps[name] !== undefined
  // `"react": "npm:@preact/compat"` is Preact wearing React's name.
  const preactAlias = (deps["react"] ?? "").startsWith("npm:@preact/compat")

  let framework: FrameworkId | null = null
  let meta: string | null = null
  const nativeRoot = has("react-native") || has("expo")
  const metaHit = META.find(([pkg]) => has(pkg))
  if (metaHit !== undefined && !(nativeRoot && metaHit[1] !== "react-native")) {
    framework = metaHit[1]
    // Astro is its own framework; every other meta entry wraps one.
    if (framework !== "astro") meta = label(deps, metaHit[0])
  } else {
    const baseHit = BASE.find(([pkg]) => has(pkg))
    if (baseHit !== undefined) framework = baseHit[1]
  }
  if (framework === null) return null
  if (framework === "react" && preactAlias) framework = "preact"

  const versionPkg = VERSION_FROM[framework]
  return {
    path,
    framework,
    version: versionPkg === null ? null : parseVersion(deps[versionPkg]),
    meta,
    islands: framework === "astro" ? ASTRO_ISLANDS.filter(([pkg]) => has(pkg)).map(([, id]) => id) : [],
    motion: MOTION.filter(has).map((n) => label(deps, n)),
    ui: [
      ...UI.filter(has).map((n) => label(deps, n)),
      ...UI_FAMILIES.filter(([prefix]) => Object.keys(deps).some((d) => d.startsWith(prefix))).map(([, l]) => l)
    ],
    styling: STYLING.filter(has).map((n) => label(deps, n))
  }
}

/**
 * Native app markers outside the JS ecosystem. `name` is the entry's basename;
 * `content` is the file's text (null for directories such as `*.xcodeproj`).
 */
export const detectNative = (path: string, name: string, content: string | null): FrontendFinding | null => {
  let framework: FrameworkId | null = null
  if (name === "pubspec.yaml" && content !== null && /^\s*flutter\s*:/m.test(content)) framework = "flutter"
  else if (name.endsWith(".xcodeproj")) framework = "swift"
  else if (name === "Package.swift" && content !== null && /\.(iOS|macOS|visionOS|tvOS|watchOS)\(/.test(content)) framework = "swift"
  else if ((name === "build.gradle" || name === "build.gradle.kts") && content !== null && /compose/i.test(content)) framework = "compose"
  if (framework === null) return null
  return { path, framework, version: null, meta: null, islands: [], motion: [], ui: [], styling: [] }
}

const dirOf = (p: string): string => (p.includes("/") ? p.slice(0, p.lastIndexOf("/") + 1) : "")

/**
 * Drop Swift/Compose markers that sit inside a JS frontend's directory — the
 * `ios/` and `android/` shells of React Native, Flutter, or Capacitor apps are
 * not separate stacks.
 */
export const dropNativeShells = (findings: ReadonlyArray<FrontendFinding>): Array<FrontendFinding> => {
  const roots = findings
    .filter((f) => f.framework !== "swift" && f.framework !== "compose")
    .map((f) => dirOf(f.path))
  return findings.filter(
    (f) => (f.framework !== "swift" && f.framework !== "compose") || !roots.some((r) => f.path.startsWith(r))
  )
}

export const describeFinding = (f: FrontendFinding): string => {
  const head = [f.framework === "vanilla" ? "no framework (vanilla / server-rendered JS)" : f.framework]
  if (f.version !== null) head.push(f.version)
  let out = head.join(" ")
  if (f.meta !== null) out += ` (${f.meta})`
  const parts = [out]
  if (f.islands.length > 0) parts.push(`islands: ${f.islands.join(", ")}`)
  if (f.motion.length > 0) parts.push(`motion: ${f.motion.join(", ")}`)
  if (f.ui.length > 0) parts.push(`ui: ${f.ui.join(", ")}`)
  if (f.styling.length > 0) parts.push(`styling: ${f.styling.join(", ")}`)
  return parts.join(" · ")
}

/** Astro sites whose only islands are React read the React references as written. */
const readsAsReact = (f: FrontendFinding): boolean =>
  f.framework === "react" || (f.framework === "astro" && f.islands.length > 0 && f.islands.every((i) => i === "react"))

/** The one-line instruction scan hands to the LLM about adapting design-engineering. */
export const stackVerdict = (findings: ReadonlyArray<FrontendFinding>): string => {
  if (findings.length === 0) {
    return "frontend: none detected — ask the user which UI stack the project uses (if any) before adapting the design-engineering skill"
  }
  const kinds = [...new Set(findings.map((f) => f.framework))]
  if (findings.every(readsAsReact)) {
    return "frontend: React — design-engineering's references apply as written; record the installed motion/UI libraries in brain/chore/motion-stack.md"
  }
  const native = kinds.some((k) => NATIVE.has(k)) ? " (native: the CSS/browser sections are replaced, not translated)" : ""
  const several = kinds.length > 1 ? `several frontends (${kinds.join(", ")}) — confirm with the user which are in scope, then ` : ""
  return `frontend: ${kinds.join(", ")}${native} — ${several}run the design-engineering stack adaptation (references/stack-adaptation.md) to research the equivalents and write brain/chore/motion-stack.md`
}
