import { execFile, execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { promisify } from "node:util"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

/**
 * The `ui-review` probes, run in a real browser against their fixture page.
 *
 * The suite installs the skill with the CLI (`install-skill ui-review`) into a
 * throwaway skills dir and runs the INSTALLED copy through `bash`, so a file the
 * package does not ship, or a script that relies on the exec bit (installed
 * files are written 644), fails here. Each probe's JSON is compared with
 * `fixture/expected.json`: numbers ±1 px, only the keys the file lists.
 *
 * The CLI is compiled into its own throwaway package root instead of `dist/`:
 * the integration suite rebuilds `dist/` in parallel, and a half-written file
 * would make either suite flaky.
 *
 * Gated on `agent-browser` being on PATH. Without it the suite skips with a
 * note, and the [man] row in test/EVAL.md covers the run.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const TIMEOUT = 180_000
const SESSION = process.env.UI_REVIEW_PROBE_SESSION ?? `ui-review-probes-${process.pid}`

const agentBrowserOnPath = ((): boolean => {
  try {
    execFileSync("agent-browser", ["--version"], { stdio: "pipe", timeout: 15_000 })
    return true
  } catch {
    return false
  }
})()
if (!agentBrowserOnPath) {
  console.info("ui-review probes: skipped, agent-browser is not on PATH (test/EVAL.md has the manual run)")
}

/** An expected number given as a range: `{$approx, $tol}`, `{$gt}`, `{$lt}` (combinable). */
type Range = { $approx?: number; $tol?: number; $gt?: number; $lt?: number }
const isRange = (v: unknown): v is Range =>
  v !== null && typeof v === "object" && !Array.isArray(v) && ["$approx", "$gt", "$lt"].some((k) => k in v)
const inRange = (n: number, r: Range): boolean =>
  (r.$approx === undefined || Math.abs(n - r.$approx) <= (r.$tol ?? 0)) &&
  (r.$gt === undefined || n > r.$gt) &&
  (r.$lt === undefined || n < r.$lt)

/**
 * Differences between a probe result and its expected subset: numbers ±1 (or the
 * range an expected `{$approx, $tol}` / `{$gt}` / `{$lt}` object gives), other
 * keys starting with `$` ignored.
 */
const mismatches = (actual: unknown, expected: unknown, at = "$"): Array<string> => {
  if (isRange(expected)) {
    return typeof actual === "number" && inRange(actual, expected)
      ? []
      : [`${at}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`]
  }
  if (typeof expected === "number") {
    return typeof actual === "number" && Math.abs(actual - expected) <= 1
      ? []
      : [`${at}: expected ${expected} ±1, got ${JSON.stringify(actual)}`]
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      return [`${at}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`]
    }
    return expected.flatMap((e, i) => mismatches(actual[i], e, `${at}[${i}]`))
  }
  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object") {
      return [`${at}: expected an object, got ${JSON.stringify(actual)}`]
    }
    return Object.entries(expected)
      .filter(([key]) => !key.startsWith("$"))
      .flatMap(([key, e]) => mismatches((actual as Record<string, unknown>)[key], e, `${at}.${key}`))
  }
  return actual === expected ? [] : [`${at}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`]
}

const label = agentBrowserOnPath
  ? "ui-review probes on the fixture page"
  : "ui-review probes on the fixture page (skipped: agent-browser is not on PATH)"

/** `agent-browser --version` as [major, minor, patch]; `a11y` (axe built in) arrives in 0.33.0. */
const agentBrowserVersion = ((): Array<number> => {
  try {
    const out = execFileSync("agent-browser", ["--version"], { encoding: "utf8", stdio: "pipe", timeout: 15_000 })
    return (out.match(/(\d+)\.(\d+)\.(\d+)/) ?? []).slice(1).map(Number)
  } catch {
    return []
  }
})()
const hasA11y = agentBrowserVersion.length === 3 && (agentBrowserVersion[0] > 0 || agentBrowserVersion[1] >= 33)

describe.skipIf(!agentBrowserOnPath)(label, () => {
  const tmpDirs: Array<string> = []
  let skillDir = ""
  let fixtureUrl = ""
  let work = ""
  let expected: any = {}

  const ab = (args: Array<string>): string =>
    execFileSync("agent-browser", ["--session", SESSION, ...args], { encoding: "utf8", stdio: "pipe", timeout: 60_000 })

  /** A fresh load of the fixture: no state forced by an earlier probe or test. */
  const freshFixture = (): void => {
    ab(["open", fixtureUrl])
  }

  /** Click a page control: scrolled into view first (a click outside the viewport reports success without hitting it). */
  const clickOnPage = (selector: string): void => {
    ab(["scrollintoview", selector])
    ab(["click", selector])
  }

  /**
   * Run one script of the installed skill through `bash`; stdout must be exactly
   * one JSON document. Async, so a long sweep does not block the worker's event loop.
   */
  const runScript = async (script: string, argv: Array<string>, options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): Promise<any> => {
    try {
      const { stdout } = await promisify(execFile)("bash", [path.join(skillDir, "scripts", script), ...argv, "--session", SESSION], {
        encoding: "utf8",
        timeout: TIMEOUT - 10_000,
        maxBuffer: 16 * 1024 * 1024,
        ...options
      })
      return JSON.parse(stdout)
    } catch (e: any) {
      // A failing script prints its {"error": ...} document on stdout: show it.
      throw new Error(`${script} ${argv[0]}: ${e.stdout?.trim() || e.message}`)
    }
  }
  const probe = (name: string, args: unknown): Promise<any> => runScript("probe.sh", [name, JSON.stringify(args)])

  /** focus-ring visits every control of the fixture once; the focus-ring tests share that run. */
  let focusRun: Promise<any> | undefined
  const focusRing = (): Promise<any> => {
    focusRun ??= (async () => {
      freshFixture()
      return probe("focus-ring", { ...expected["focus-ring"].args, shots: path.join(work, "focus-shots") })
    })()
    return focusRun
  }
  const control = (out: any, selector: string): any => out.controls.find((c: any) => c.selector === selector)

  // Async: a synchronous tsc run blocks the worker's event loop, and on a loaded
  // machine vitest then fails the run with `Timeout calling "onTaskUpdate"`.
  beforeAll(async () => {
    const run = promisify(execFile)
    // A private package root: package.json + compiled dist, with the shipped
    // folders and node_modules linked in (dist/services/Assets.js finds assets at ../..).
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), "ui-review-pkg-"))
    work = fs.mkdtempSync(path.join(os.tmpdir(), "ui-review-probes-"))
    tmpDirs.push(pkg, work)
    fs.copyFileSync(path.join(REPO_ROOT, "package.json"), path.join(pkg, "package.json"))
    for (const dir of ["node_modules", "assets", "skills"]) {
      fs.symlinkSync(path.join(REPO_ROOT, dir), path.join(pkg, dir), "dir")
    }
    const tsc = path.join(REPO_ROOT, "node_modules", "typescript", "bin", "tsc")
    await run(process.execPath, [tsc, "-p", path.join(REPO_ROOT, "tsconfig.json"), "--outDir", path.join(pkg, "dist")])

    const skillsDir = path.join(work, "skills")
    await run(process.execPath, [path.join(pkg, "dist", "bin.js"), "install-skill", "ui-review", "--skills-dir", skillsDir, "--json"], {
      cwd: work
    })
    skillDir = path.join(skillsDir, "ui-review")
    expected = JSON.parse(fs.readFileSync(path.join(skillDir, "fixture", "expected.json"), "utf8"))
    fixtureUrl = pathToFileURL(path.join(skillDir, "fixture", "index.html")).href
    await run("agent-browser", ["--session", SESSION, "open", fixtureUrl], { timeout: 60_000 })
  }, TIMEOUT)

  afterAll(() => {
    try {
      ab(["close"])
    } catch {
      // the session may never have started
    }
    for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true })
  })

  it("width-sweep reports the third row only in the fixture's narrow width band", async () => {
    const spec = expected["width-sweep"]
    const out = await probe("width-sweep", spec.args)
    expect(out.probe).toBe("width-sweep")
    expect(mismatches(out.breakpoints, spec.breakpoints)).toEqual([])

    const ranges = (selector: string, scale: number): Array<any> =>
      out.passes.find((p: any) => p.fontScale === scale).targets.find((t: any) => t.selector === selector).ranges

    // The defect: one 3-row band at the default root font, nowhere else.
    const thirdRow = ranges(spec.defect.selector, 1).filter((r) => r.rows >= 3)
    expect(thirdRow).toHaveLength(1)
    expect(thirdRow[0].from).toBeGreaterThan(spec.args.min)
    expect(thirdRow[0].to).toBeLessThan(spec.args.max)
    // The clean twin never wraps to a third row, at either root font size.
    for (const scale of [1, 1.25]) expect(ranges(spec.clean.selector, scale).every((r) => r.rows <= 2)).toBe(true)

    for (const twin of ["defect", "clean"]) {
      for (const [scale, want] of Object.entries(spec[twin].ranges)) {
        expect(mismatches(ranges(spec[twin].selector, Number(scale)), want, `${twin}@${scale}`)).toEqual([])
      }
    }
  }, TIMEOUT)

  it("resize reports the overlay that keeps its opening width, and a twin that matches a fresh load", async () => {
    const spec = expected.resize
    const defect = await probe("resize", spec.defect.args)
    expect(defect.matchesFresh).toBe(false)
    expect(mismatches(defect, spec.defect.result, "defect")).toEqual([])

    const clean = await probe("resize", spec.clean.args)
    expect(clean.matchesFresh).toBe(true)
    expect(mismatches(clean, spec.clean.result, "clean")).toEqual([])
  }, TIMEOUT)

  it("edge reports the popover pressed against the viewport bottom, and a twin that keeps its margin", async () => {
    const spec = expected.edge
    const defect = await probe("edge", spec.defect.args)
    expect(defect.placements.map((p: any) => p.placement)).toEqual(["top", "middle", "bottom"])
    expect(mismatches(defect, spec.defect.result, "defect")).toEqual([])

    const clean = await probe("edge", spec.clean.args)
    expect(mismatches(clean, spec.clean.result, "clean")).toEqual([])
    expect(clean.placements.every((p: any) => p.distance.bottom >= 16 && !p.coversTrigger)).toBe(true)
  }, TIMEOUT)

  it("focus-ring reports the fixture's box-shadow ring as clipped by its overflow-hidden ancestor", async () => {
    const spec = expected["focus-ring"]
    const out = await focusRing()
    expect(out.probe).toBe("focus-ring")
    const shadow = control(out, "#ring-shadow-defect")
    expect(shadow).toBeDefined()
    expect(shadow.reached).toBe(true)
    expect(shadow.ringKind).toBe("box-shadow")
    expect(shadow.clipAncestor).toBe("#ring-defect-panel")
    expect(shadow.clippedFraction).toBeGreaterThan(0)
    expect(mismatches(shadow, spec.defect["#ring-shadow-defect"], "#ring-shadow-defect")).toEqual([])
    // Its twin, in a panel padded past the ring, is not cut.
    expect(mismatches(control(out, "#ring-shadow-clean"), spec.clean["#ring-shadow-clean"], "#ring-shadow-clean")).toEqual([])
  }, TIMEOUT)

  it("focus-ring reports the clipped outline, the ring that misses its label, and the control with no ring; twins are clean", async () => {
    const spec = expected["focus-ring"]
    const out = await focusRing()
    expect(out.controls.map((c: any) => c.selector)).toEqual(spec.args.controls)
    for (const twin of ["defect", "clean"]) {
      for (const [selector, want] of Object.entries(spec[twin])) {
        expect(mismatches(control(out, selector), want, `${twin} ${selector}`)).toEqual([])
      }
    }
    // The crop diff compares two screenshots of the same region, kept under `shots`.
    const outline = control(out, "#ring-outline-defect")
    expect(outline.cropDiffPct).toBeGreaterThan(0)
    for (const shot of [outline.shots.focused, outline.shots.unfocused]) {
      expect(path.isAbsolute(shot)).toBe(true)
      expect(fs.readFileSync(shot).subarray(1, 4).toString()).toBe("PNG")
    }
    expect(control(out, "#ring-none-defect").cropDiffPct).toBeLessThan(0.01)
  }, TIMEOUT)

  it("hit-area reports the inert row padding, confirmed by real clicks that restore the state; the twin responds whole", async () => {
    const spec = expected["hit-area"]
    freshFixture()
    const defect = await probe("hit-area", spec.defect.args)
    expect(mismatches(defect, spec.defect.result, "defect")).toEqual([])
    expect(defect.clicks.length).toBeGreaterThan(0)
    expect(defect.clicks.length).toBeLessThanOrEqual(8)
    // Outside the label nothing toggles; on it the state toggles, and a second click restores it.
    expect(defect.clicks.some((c: any) => c.where === "outside" && !c.responded)).toBe(true)
    const inside = defect.clicks.filter((c: any) => c.where === "inside")
    expect(inside.length).toBeGreaterThan(0)
    expect(inside.every((c: any) => c.responded && c.toggled && c.restored)).toBe(true)
    expect(ab(["eval", "document.querySelector('#hit-defect-box').checked"]).trim()).toBe("false")

    const clean = await probe("hit-area", spec.clean.args)
    expect(mismatches(clean, spec.clean.result, "clean")).toEqual([])
    expect(clean.clicks.filter((c: any) => c.where !== "outside").every((c: any) => c.responded && c.toggled)).toBe(true)
    expect(clean.clicks.every((c: any) => c.restored)).toBe(true)
  }, TIMEOUT)

  it("contrast composites the translucent field over the tinted section: the counter fails, its twin passes", async () => {
    const spec = expected.contrast
    freshFixture()
    const out = await probe("contrast", spec.args)
    const states = spec.args.states.length * (spec.args.themes?.length ?? 1)
    expect(out.measurements).toHaveLength(states * spec.args.targets.length)
    for (const twin of ["defect", "clean"]) {
      const runs = out.measurements.filter((m: any) => m.selector === spec[twin].selector)
      expect(runs).toHaveLength(states)
      for (const m of runs) expect(mismatches(m, spec[twin], `${twin} ${m.theme}/${m.state}`)).toEqual([])
    }
  }, TIMEOUT)

  it("layout-jump reports the instant re-centre as not animating while the spinner runs, and the height transition as animating", async () => {
    const spec = expected["layout-jump"]
    for (const twin of ["defect", "clean"]) {
      freshFixture()
      clickOnPage(spec[twin].open)
      const out = await probe("layout-jump", spec[twin].args)
      expect(out.shifts.length).toBeGreaterThan(0)
      expect(mismatches(out, spec[twin].result, twin)).toEqual([])
      if (twin === "defect") {
        expect(out.shifts.every((s: any) => s.animating === false)).toBe(true)
        // The unrelated spinner ran the whole time, and did not count.
        expect(out.runningElsewhere.map((a: any) => a.target)).toContain("#sync-spinner")
      } else {
        expect(out.shifts.every((s: any) => s.animating === true)).toBe(true)
      }
    }
  }, TIMEOUT)

  it("axe.sh reports no source in a folder without axe-core (a11y from agent-browser 0.33.0)", async () => {
    const spec = expected.axe
    freshFixture()
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "ui-review-no-axe-"))
    tmpDirs.push(empty)
    const env = { ...process.env }
    delete env.AXE_CORE_DIR
    const out = await runScript("axe.sh", [JSON.stringify(spec.args)], { cwd: empty, env })
    expect(out.source).toBe(hasA11y ? "a11y" : "none")
  }, TIMEOUT)

  it.skipIf(!process.env.AXE_CORE_DIR)("axe.sh injects a local axe-core (AXE_CORE_DIR) and reports the counter's color-contrast violation", async () => {
    const spec = expected.axe
    freshFixture()
    const out = await runScript("axe.sh", [JSON.stringify(spec.args)], { cwd: work })
    expect(out.source).toBe(hasA11y ? "a11y" : "node_modules")
    const rule = out.violations.find((v: any) => v.id === spec.violation.id)
    expect(rule).toBeDefined()
    expect(rule.nodes.map((n: any) => n.target.join(" "))).toContain(spec.violation.target)
  }, TIMEOUT)
})
