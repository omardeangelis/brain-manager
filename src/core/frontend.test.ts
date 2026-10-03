import { describe, expect, it } from "vitest"
import {
  type FrontendFinding,
  collectDeps,
  describeFinding,
  detectNative,
  detectPackage,
  dropNativeShells,
  parseVersion,
  stackVerdict
} from "./frontend.js"

describe("parseVersion", () => {
  it("keeps major.minor from a range", () => {
    expect(parseVersion("^19.1.0")).toBe("19.1")
    expect(parseVersion("~3.5.13")).toBe("3.5")
    expect(parseVersion(">=5")).toBe("5")
  })

  it("returns null for protocols and tags", () => {
    expect(parseVersion("workspace:*")).toBeNull()
    expect(parseVersion("catalog:")).toBeNull()
    expect(parseVersion("npm:@preact/compat@10")).toBeNull()
    expect(parseVersion("latest")).toBeNull()
    expect(parseVersion(undefined)).toBeNull()
  })
})

describe("collectDeps", () => {
  it("merges all dependency blocks, dependencies winning", () => {
    const deps = collectDeps({
      dependencies: { react: "^19.0.0" },
      devDependencies: { react: "^18.0.0", vitest: "^3.0.0" },
      peerDependencies: { "react-dom": "^19.0.0" }
    })
    expect(deps).toEqual({ react: "^19.0.0", vitest: "^3.0.0", "react-dom": "^19.0.0" })
  })

  it("tolerates garbage", () => {
    expect(collectDeps(null)).toEqual({})
    expect(collectDeps({ dependencies: "nope" })).toEqual({})
  })
})

describe("detectPackage", () => {
  it("names the meta-framework next to the framework", () => {
    const f = detectPackage("package.json", {
      next: "15.1.0",
      react: "^19.1.0",
      "react-dom": "^19.1.0",
      motion: "^12.4.0",
      "@radix-ui/react-dialog": "^1.1.0",
      "@radix-ui/react-popover": "^1.1.0",
      sonner: "^2.0.0",
      tailwindcss: "^4.1.0"
    })!
    expect(f.framework).toBe("react")
    expect(f.version).toBe("19.1")
    expect(f.meta).toBe("next 15.1")
    expect(f.motion).toEqual(["motion 12.4"])
    expect(f.ui).toEqual(["sonner 2.0", "@radix-ui/*"])
    expect(f.styling).toEqual(["tailwindcss 4.1"])
  })

  it.each([
    [{ nuxt: "^3.14.0", vue: "^3.5.0" }, "vue", "nuxt 3.14"],
    [{ "@sveltejs/kit": "^2.0.0", svelte: "^5.0.0" }, "svelte", "@sveltejs/kit 2.0"],
    [{ "@angular/core": "^20.0.0", rxjs: "^7.8.0" }, "angular", null],
    [{ "solid-js": "^1.9.0" }, "solid", null],
    [{ lit: "^3.2.0" }, "lit", null],
    [{ "htmx.org": "^2.0.0" }, "vanilla", null]
  ] as const)("detects %o as %s", (deps, framework, meta) => {
    const f = detectPackage("package.json", { ...deps })!
    expect(f.framework).toBe(framework)
    expect(f.meta).toBe(meta)
  })

  it("prefers React Native over the React it depends on", () => {
    const f = detectPackage("package.json", { react: "19.0.0", "react-native": "0.79.0", expo: "~53.0.0" })!
    expect(f.framework).toBe("react-native")
    expect(f.meta).toBe("expo 53.0")
    expect(f.version).toBe("0.79")
  })

  it("does not let a web meta-framework mask React Native", () => {
    const f = detectPackage("package.json", { next: "15.0.0", react: "19.0.0", "react-native": "0.79.0" })!
    expect(f.framework).toBe("react-native")
  })

  it("reads Preact aliased as react", () => {
    const f = detectPackage("package.json", { react: "npm:@preact/compat", preact: "^10.25.0" })!
    expect(f.framework).toBe("preact")
  })

  it("lists Astro islands", () => {
    const f = detectPackage("package.json", { astro: "^5.1.0", "@astrojs/react": "^4.0.0", "@astrojs/vue": "^5.0.0" })!
    expect(f.framework).toBe("astro")
    expect(f.version).toBe("5.1")
    expect(f.meta).toBeNull()
    expect(f.islands).toEqual(["react", "vue"])
  })

  it("returns null for a backend-only package", () => {
    expect(detectPackage("package.json", { express: "^5.0.0", zod: "^3.0.0" })).toBeNull()
  })
})

describe("detectNative", () => {
  it("recognizes Flutter, Swift, and Compose markers", () => {
    expect(detectNative("pubspec.yaml", "pubspec.yaml", "dependencies:\n  flutter:\n    sdk: flutter\n")?.framework).toBe("flutter")
    expect(detectNative("App.xcodeproj", "App.xcodeproj", null)?.framework).toBe("swift")
    expect(detectNative("Package.swift", "Package.swift", "platforms: [.iOS(.v17)]")?.framework).toBe("swift")
    expect(detectNative("app/build.gradle.kts", "build.gradle.kts", "buildFeatures { compose = true }")?.framework).toBe("compose")
  })

  it("ignores manifests that are not UI apps", () => {
    expect(detectNative("pubspec.yaml", "pubspec.yaml", "name: pure_dart_lib\n")).toBeNull()
    expect(detectNative("Package.swift", "Package.swift", "platforms: [.linux]")).toBeNull()
    expect(detectNative("build.gradle", "build.gradle", "apply plugin: 'java'")).toBeNull()
  })
})

const finding = (path: string, framework: FrontendFinding["framework"], islands: Array<string> = []): FrontendFinding => ({
  path, framework, version: null, meta: null, islands, motion: [], ui: [], styling: []
})

describe("dropNativeShells", () => {
  it("drops the ios/android shells of a JS app but keeps a separate native app", () => {
    const kept = dropNativeShells([
      finding("apps/mobile/package.json", "react-native"),
      finding("apps/mobile/ios/Mobile.xcodeproj", "swift"),
      finding("apps/mobile/android/app/build.gradle", "compose"),
      finding("apps/watch/Watch.xcodeproj", "swift")
    ])
    expect(kept.map((f) => f.path)).toEqual(["apps/mobile/package.json", "apps/watch/Watch.xcodeproj"])
  })
})

describe("stackVerdict", () => {
  it("asks the user when nothing is detected", () => {
    expect(stackVerdict([])).toMatch(/none detected — ask the user/)
  })

  it("applies the references as written for React, including React-only Astro", () => {
    expect(stackVerdict([finding("package.json", "react")])).toMatch(/apply as written/)
    expect(stackVerdict([finding("package.json", "astro", ["react"])])).toMatch(/apply as written/)
  })

  it("asks for the stack adaptation for anything else", () => {
    expect(stackVerdict([finding("package.json", "vue")])).toMatch(/^frontend: vue — run the design-engineering stack adaptation/)
    expect(stackVerdict([finding("package.json", "astro")])).toMatch(/stack adaptation/)
    expect(stackVerdict([finding("pubspec.yaml", "flutter")])).toMatch(/native: the CSS\/browser sections are replaced/)
  })

  it("asks which frontends are in scope when there are several", () => {
    const v = stackVerdict([finding("apps/web/package.json", "react"), finding("apps/admin/package.json", "vue")])
    expect(v).toMatch(/several frontends \(react, vue\) — confirm with the user/)
  })
})

describe("describeFinding", () => {
  it("renders one compact line", () => {
    const f = detectPackage("apps/web/package.json", { nuxt: "^3.14.0", vue: "^3.5.0", "motion-v": "^1.0.0", "reka-ui": "^2.0.0" })!
    expect(describeFinding(f)).toBe("vue 3.5 (nuxt 3.14) · motion: motion-v 1.0 · ui: reka-ui 2.0")
  })
})
