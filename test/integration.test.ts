import { execFileSync, execSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { agentSkills } from "../src/core/companions.js"
import { contentHash } from "../src/core/hash.js"

/**
 * End-to-end smoke tests: run the built CLI against throwaway working
 * directories and assert on the real filesystem (files, symlinks, manifest).
 * These cover the `[fs]` scenarios in EVAL.md that the pure planner tests can't.
 *
 * The suite builds the package once in `beforeAll` so it exercises the current
 * source, then shells out to `dist/bin.js` with the cwd pointed at a tmp dir.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const BIN = path.join(REPO_ROOT, "dist", "bin.js")

// Each case runs the CLI several times (3-4 s on an idle machine). The 5 s
// default flakes when another suite shares the machine, such as the ui-review
// probes, which drive a browser in parallel.
vi.setConfig({ testTimeout: 30_000 })

// The cases are synchronous (`execFileSync`), so between them the worker only
// runs microtasks and never reads the replies to its RPC calls. Vitest times
// those calls out after 60 s, and on a slow CI runner the file runs longer:
// every test passes, yet the run exits 1 with `Timeout calling "onTaskUpdate"`.
// One macrotask turn per case lets the replies in.
afterEach(() => new Promise<void>((resolve) => setImmediate(resolve)))

const tmpDirs: Array<string> = []
const freshDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brain-it-"))
  tmpDirs.push(dir)
  return dir
}

interface RunResult {
  readonly code: number
  readonly stdout: string
  readonly stderr: string
}
const run = (args: Array<string>, cwd: string): RunResult => {
  try {
    const stdout = execFileSync("node", [BIN, ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
    return { code: 0, stdout, stderr: "" }
  } catch (e: any) {
    return { code: e.status ?? 1, stdout: (e.stdout ?? "").toString(), stderr: (e.stderr ?? "").toString() }
  }
}

const readManifest = (cwd: string) =>
  JSON.parse(fs.readFileSync(path.join(cwd, "brain", ".brain-manifest.json"), "utf8"))
const fileRole = (manifest: any, p: string): string | undefined =>
  manifest.files.find((f: any) => f.path === p)?.role

beforeAll(() => {
  execSync("npm run build", { cwd: REPO_ROOT, stdio: "pipe" })
}, 180_000)

afterAll(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true })
})

describe("fresh init — claude (skills-capable + agent-capable)", () => {
  it("scaffolds brain/, installs skills + agents, and wires the three symlinks", () => {
    const dir = freshDir()
    const { code } = run(["init", "--providers", "claude"], dir)
    expect(code).toBe(0)

    // scaffold + managed suites
    expect(fs.existsSync(path.join(dir, "brain", "AGENTS.md"))).toBe(true)
    expect(fs.existsSync(path.join(dir, ".agents", "skills", "create-spec", "SKILL.md"))).toBe(true)
    expect(fs.existsSync(path.join(dir, ".agents", "skills", "prototype", "SKILL.md"))).toBe(true)
    expect(fs.existsSync(path.join(dir, ".agents", "skills", "prototype", "PICKER.md"))).toBe(true)
    expect(fs.existsSync(path.join(dir, ".agents", "skills", "design-engineering", "SKILL.md"))).toBe(true)
    expect(fs.existsSync(path.join(dir, ".agents", "skills", "design-engineering", "references", "standards.md"))).toBe(true)
    expect(fs.existsSync(path.join(dir, ".agents", "agents", "ux-advisor.md"))).toBe(true)
    expect(fs.existsSync(path.join(dir, ".agents", "agents", "design-engineer.md"))).toBe(true)

    // provider symlinks
    const skillsLink = path.join(dir, ".claude", "skills")
    expect(fs.lstatSync(skillsLink).isSymbolicLink()).toBe(true)
    expect(fs.readlinkSync(skillsLink)).toBe("../.agents/skills")

    const agentsLink = path.join(dir, ".claude", "agents")
    expect(fs.lstatSync(agentsLink).isSymbolicLink()).toBe(true)
    expect(fs.readlinkSync(agentsLink)).toBe("../.agents/agents")

    const routerLink = path.join(dir, "CLAUDE.md")
    expect(fs.lstatSync(routerLink).isSymbolicLink()).toBe(true)
    expect(fs.readlinkSync(routerLink)).toBe("AGENTS.md")

    // manifest: agents link tracked, and the Brain Schema is managed (point a)
    const manifest = readManifest(dir)
    expect(manifest.links.some((l: any) => l.kind === "agents")).toBe(true)
    expect(fileRole(manifest, "brain/AGENTS.md")).toBe("managed")
    expect(fileRole(manifest, "brain/CLAUDE.md")).toBe("managed")
    expect(fileRole(manifest, "brain/index.md")).toBe("seed")
  })

  it("passes doctor with exit 0", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    expect(run(["doctor"], dir).code).toBe(0)
  })

  it("scaffolds the feature-improvement store; doctor requires it and upgrade installs it on an older brain", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    const keep = "brain/feature-improvement/.gitkeep"
    expect(fs.existsSync(path.join(dir, keep))).toBe(true)
    expect(fileRole(readManifest(dir), keep)).toBe("seed")

    // A brain from before the store: no folder, no manifest entry.
    fs.rmSync(path.join(dir, "brain", "feature-improvement"), { recursive: true })
    const manifestPath = path.join(dir, "brain", ".brain-manifest.json")
    const manifest = readManifest(dir)
    manifest.files = manifest.files.filter((f: any) => f.path !== keep)
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

    const before = run(["doctor", "--json"], dir)
    expect(before.code).toBe(1)
    expect(JSON.parse(before.stdout).lines).toContainEqual({ path: "brain/feature-improvement/", status: "missing" })

    expect(run(["upgrade"], dir).code).toBe(0)
    expect(fs.existsSync(path.join(dir, keep))).toBe(true)
    expect(fileRole(readManifest(dir), keep)).toBe("seed")
    expect(run(["doctor"], dir).code).toBe(0)
  })

  it("`init --providers claude` installs `ui-review` with `scripts/probe.sh` and `fixture/index.html`", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)

    // Every file the package ships under ui-review/ (probes, scripts, fixture,
    // bar), byte-identical and tracked as managed, and nothing else.
    const listFiles = (root: string): Array<string> =>
      (fs.readdirSync(root, { recursive: true, withFileTypes: true }) as Array<fs.Dirent>)
        .filter((e) => e.isFile())
        .map((e) => path.relative(root, path.join(e.parentPath, e.name)))
        .sort()
    const bundled = path.join(REPO_ROOT, "assets", "skills", "ui-review")
    const installed = path.join(dir, ".agents", "skills", "ui-review")
    const shipped = listFiles(bundled)
    expect(listFiles(installed)).toEqual(shipped)
    for (const rel of ["SKILL.md", "scripts/probe.sh", "scripts/axe.sh", "fixture/index.html", "fixture/expected.json"]) {
      expect(shipped, rel).toContain(rel)
    }
    expect(shipped.filter((f) => f.startsWith("probes/") && f.endsWith(".js"))).toHaveLength(7)
    const manifest = readManifest(dir)
    for (const rel of shipped) {
      expect(fs.readFileSync(path.join(installed, rel), "utf8"), rel).toBe(fs.readFileSync(path.join(bundled, rel), "utf8"))
      expect(fileRole(manifest, `.agents/skills/ui-review/${rel}`), rel).toBe("managed")
    }
    // Claude Code reaches it through the skills symlink.
    expect(fs.existsSync(path.join(dir, ".claude", "skills", "ui-review", "fixture", "index.html"))).toBe(true)
    expect(run(["doctor"], dir).code).toBe(0)
  })
})

describe("fresh init — codex (router-only, no agent format)", () => {
  it("creates AGENTS.md natively and makes no provider symlinks", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "codex"], dir).code).toBe(0)

    // canonical router is a real file the tool reads natively — not a symlink
    const router = path.join(dir, "AGENTS.md")
    expect(fs.existsSync(router)).toBe(true)
    expect(fs.lstatSync(router).isSymbolicLink()).toBe(false)

    // router-only tools get no skills/agents dirs
    expect(fs.existsSync(path.join(dir, ".codex", "skills"))).toBe(false)
    expect(fs.existsSync(path.join(dir, ".codex", "agents"))).toBe(false)

    // agents are still installed canonically (inert until an agent-capable tool is wired)
    expect(fs.existsSync(path.join(dir, ".agents", "agents", "ux-advisor.md"))).toBe(true)
    expect(fs.existsSync(path.join(dir, ".agents", "agents", "design-engineer.md"))).toBe(true)

    const manifest = readManifest(dir)
    expect(manifest.links.length).toBe(0)
  })
})

describe("upgrade — Brain Schema role reconciliation (point a)", () => {
  it("promotes a pre-split seed schema entry back to managed", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)

    // Simulate an install created before the schema/content split: brain/AGENTS.md
    // recorded as seed.
    const manifestPath = path.join(dir, "brain", ".brain-manifest.json")
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    for (const f of manifest.files) {
      if (f.path === "brain/AGENTS.md") f.role = "seed"
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

    expect(run(["upgrade"], dir).code).toBe(0)

    expect(fileRole(readManifest(dir), "brain/AGENTS.md")).toBe("managed")
  })
})

describe("upgrade --skill — one skill at a time", () => {
  it("installs the named skill with its linked agent and leaves everything else alone", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)

    // Simulate a project on an older release: design-engineering and its
    // design-engineer agent not shipped yet, and create-spec untouched at an
    // older version (disk = manifest hash, so a full upgrade would update it).
    const manifestPath = path.join(dir, "brain", ".brain-manifest.json")
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    const deDir = ".agents/skills/design-engineering/"
    const deAgent = ".agents/agents/design-engineer.md"
    manifest.files = manifest.files.filter((f: any) => !f.path.startsWith(deDir) && f.path !== deAgent)
    manifest.packageVersion = "0.5.0"
    const createSpec = ".agents/skills/create-spec/SKILL.md"
    const older = "# create-spec (older release)\n"
    fs.writeFileSync(path.join(dir, createSpec), older)
    for (const f of manifest.files) if (f.path === createSpec) f.hash = contentHash(older)
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    fs.rmSync(path.join(dir, deDir), { recursive: true })
    fs.rmSync(path.join(dir, deAgent))

    const { code, stdout } = run(["upgrade", "--skill", "design-engineering", "--json"], dir)
    expect(code).toBe(0)
    const report = JSON.parse(stdout)
    expect(report.lines.length).toBeGreaterThan(1)
    expect(report.lines.every((l: any) => l.path.startsWith(deDir) || l.path === deAgent)).toBe(true)
    expect(report.lines.every((l: any) => l.status === "installed")).toBe(true)

    expect(fs.existsSync(path.join(dir, deDir, "SKILL.md"))).toBe(true)
    expect(fs.existsSync(path.join(dir, deAgent))).toBe(true)
    expect(fs.existsSync(path.join(dir, ".agents", "agents", "ux-advisor.md"))).toBe(true)
    expect(fs.readFileSync(path.join(dir, createSpec), "utf8")).toBe(older)
    const after = readManifest(dir)
    expect(after.packageVersion).toBe("0.5.0")
    expect(after.files.find((f: any) => f.path === createSpec).hash).toBe(contentHash(older))
    expect(after.files.some((f: any) => f.path === `${deDir}SKILL.md`)).toBe(true)
    expect(after.files.some((f: any) => f.path === deAgent)).toBe(true)

    // A full upgrade still picks up what the scoped run skipped.
    expect(run(["upgrade"], dir).code).toBe(0)
    expect(fs.readFileSync(path.join(dir, createSpec), "utf8")).not.toBe(older)
    expect(readManifest(dir).packageVersion).not.toBe("0.5.0")
  })

  it("rejects a name that is not a bundled skill", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    const before = fs.readFileSync(path.join(dir, "brain", ".brain-manifest.json"), "utf8")

    const { code, stderr } = run(["upgrade", "--skill", "nope"], dir)
    expect(code).toBe(1)
    expect(stderr).toContain("unknown skill nope")
    expect(stderr).toContain("design-engineering")
    expect(fs.readFileSync(path.join(dir, "brain", ".brain-manifest.json"), "utf8")).toBe(before)
  })
})

describe("install-skill <name> — untracked single-skill copy", () => {
  it("copies the skill and its linked agent, then keeps a modified copy unless --force", () => {
    const dir = freshDir()
    const skills = path.join(dir, "kit", "skills")
    const agentFile = path.join(dir, "kit", "agents", "design-engineer.md")
    const args = ["install-skill", "design-engineering", "--skills-dir", skills, "--json"]

    const first = run(args, dir)
    expect(first.code).toBe(0)
    expect(JSON.parse(first.stdout).lines.map((l: any) => l.status)).toEqual(["installed", "installed"])
    expect(fs.existsSync(path.join(skills, "design-engineering", "references", "stack-adaptation.md"))).toBe(true)
    expect(fs.readFileSync(agentFile, "utf8")).toContain("- design-engineering")
    // only the named skill, no brain/ and no other suite skill
    expect(fs.readdirSync(skills)).toEqual(["design-engineering"])
    expect(fs.existsSync(path.join(dir, "brain"))).toBe(false)

    expect(JSON.parse(run(args, dir).stdout).lines.map((l: any) => l.status)).toEqual(["up-to-date", "up-to-date"])

    fs.appendFileSync(agentFile, "\nlocal note\n")
    expect(JSON.parse(run(args, dir).stdout).lines.map((l: any) => l.status)).toEqual(["up-to-date", "exists"])
    expect(fs.readFileSync(agentFile, "utf8")).toContain("local note")

    expect(JSON.parse(run([...args, "--force"], dir).stdout).lines.map((l: any) => l.status)).toEqual(["up-to-date", "updated"])
    expect(fs.readFileSync(agentFile, "utf8")).not.toContain("local note")
  })

  it("installs a skill with no linked agent on its own, and rejects unknown names", () => {
    const dir = freshDir()
    const skills = path.join(dir, "skills")
    const { code, stdout } = run(["install-skill", "tdd", "--skills-dir", skills, "--json"], dir)
    expect(code).toBe(0)
    expect(JSON.parse(stdout).lines).toHaveLength(1)
    expect(fs.existsSync(path.join(skills, "tdd", "SKILL.md"))).toBe(true)
    expect(fs.existsSync(path.join(dir, "agents"))).toBe(false)

    const bad = run(["install-skill", "nope", "--skills-dir", skills], dir)
    expect(bad.code).toBe(1)
    expect(bad.stderr).toContain("unknown skill nope")
    expect(bad.stderr).toContain("init-brain")
  })
})

describe("ui-review — the skill documents what it ships", () => {
  it("the installed ui-review/SKILL.md has name: ui-review and documents every file in probes/", () => {
    const dir = freshDir()
    const skills = path.join(dir, "skills")
    expect(run(["install-skill", "ui-review", "--skills-dir", skills, "--json"], dir).code).toBe(0)
    const skill = path.join(skills, "ui-review")
    const md = fs.readFileSync(path.join(skill, "SKILL.md"), "utf8")

    const front = md.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? ""
    expect(front).toMatch(/^name: ui-review$/m)
    expect(front).toMatch(/^description: .*`ui-reviewer`.*UI pass/m)

    // Every probe file, and only those, is documented and invoked through bash
    // (installed files are written 644, so a bare ./probe.sh fails in projects).
    const probes = fs.readdirSync(path.join(skill, "probes")).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, -3))
    expect(probes).toHaveLength(7)
    for (const probe of probes) {
      expect(md).toContain(`probes/${probe}.js`)
      expect(md).toContain(`bash <skillsDir>/ui-review/scripts/probe.sh ${probe} '`)
    }
    const invoked = [...md.matchAll(/scripts\/probe\.sh ([a-z-]+) '/g)].map((m) => m[1])
    expect(invoked.filter((p) => !probes.includes(p))).toEqual([])
    for (const script of fs.readdirSync(path.join(skill, "scripts"))) {
      expect(md).toContain(`bash <skillsDir>/ui-review/scripts/${script}`)
    }
    expect(md).not.toMatch(/(^|[\s`(])\.\/(probe|axe)\.sh/m)

    // Relative links resolve inside the installed copy; each class page of the bar
    // carries its rule source, the project override and the evidence.
    const links = [...md.matchAll(/\]\(((?!https?:)[^)#\s]+)\)/g)].map((m) => m[1])
    for (const link of links) expect(fs.existsSync(path.join(skill, link)), link).toBe(true)
    const classes = links.filter((l) => l.startsWith("references/"))
    expect(classes.length).toBeGreaterThanOrEqual(7)
    for (const page of classes) {
      const text = fs.readFileSync(path.join(skill, page), "utf8")
      for (const heading of ["## Rule", "## Project override", "## Proof and evidence"]) expect(text, `${page}: ${heading}`).toContain(heading)
    }
  })
})

describe("ui-reviewer — the agent ships with ui-review", () => {
  const AGENT = ".agents/agents/ui-reviewer.md"
  const SKILL_DIR = ".agents/skills/ui-review/"
  const touchesPair = (l: any) => l.path === AGENT || l.path.startsWith(SKILL_DIR)

  /** doctor exits 0 and has nothing to say about the pair: both tracked, both current. */
  const expectTracked = (dir: string) => {
    const manifest = readManifest(dir)
    expect(fileRole(manifest, AGENT)).toBe("managed")
    expect(fileRole(manifest, `${SKILL_DIR}SKILL.md`)).toBe("managed")
    const doctor = run(["doctor", "--json"], dir)
    expect(doctor.code).toBe(0)
    expect(JSON.parse(doctor.stdout).lines.filter(touchesPair)).toEqual([])
  }

  it("`init --providers claude` installs 5 agents, `ui-reviewer` among them, linked to `ui-review`", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)

    const agents = fs.readdirSync(path.join(dir, ".agents", "agents")).filter((f) => f.endsWith(".md"))
    expect(agents).toHaveLength(5)
    expect(agents).toContain("ui-reviewer.md")
    // Claude Code sees it through the agents symlink, with ui-review preloaded.
    const agent = fs.readFileSync(path.join(dir, ".claude", "agents", "ui-reviewer.md"), "utf8")
    expect(agentSkills(agent)).toEqual(["ui-review"])
    expect(fs.existsSync(path.join(dir, SKILL_DIR, "SKILL.md"))).toBe(true)
    expectTracked(dir)
  })

  it("`install-skill ui-review` installs `ui-reviewer.md` with it", () => {
    const dir = freshDir()
    const skills = path.join(dir, "kit", "skills")
    const { code, stdout } = run(["install-skill", "ui-review", "--skills-dir", skills, "--json"], dir)
    expect(code).toBe(0)
    const agentFile = path.join(dir, "kit", "agents", "ui-reviewer.md")
    expect(JSON.parse(stdout).lines).toEqual([
      { path: `${skills}/ui-review`, status: "installed" },
      { path: agentFile, status: "installed" }
    ])
    expect(fs.readdirSync(path.join(dir, "kit", "agents"))).toEqual(["ui-reviewer.md"])
    expect(agentSkills(fs.readFileSync(agentFile, "utf8"))).toEqual(["ui-review"])
  })

  it.each([
    ["upgrade --skill ui-review", ["upgrade", "--skill", "ui-review"]],
    ["upgrade", ["upgrade"]]
  ])("`%s` on an older install adds both, and doctor tracks them", (_label, args) => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)

    // An install from before ui-review: neither the skill nor its agent on disk
    // or in the manifest.
    const manifestPath = path.join(dir, "brain", ".brain-manifest.json")
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    manifest.files = manifest.files.filter((f: any) => !touchesPair(f))
    manifest.packageVersion = "0.6.0"
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    fs.rmSync(path.join(dir, SKILL_DIR), { recursive: true })
    fs.rmSync(path.join(dir, AGENT))
    expect(run(["doctor"], dir).code).toBe(1)

    const { code, stdout } = run([...args, "--json"], dir)
    expect(code).toBe(0)
    const installed = JSON.parse(stdout).lines.filter((l: any) => touchesPair(l))
    expect(installed.every((l: any) => l.status === "installed")).toBe(true)
    expect(installed.map((l: any) => l.path)).toEqual(expect.arrayContaining([AGENT, `${SKILL_DIR}SKILL.md`]))
    expect(fs.existsSync(path.join(dir, AGENT))).toBe(true)
    expect(fs.existsSync(path.join(dir, SKILL_DIR, "scripts", "probe.sh"))).toBe(true)
    expectTracked(dir)
  })

  it("the agent carries the ownership table, every method step and the output sections in order", () => {
    const dir = freshDir()
    const skills = path.join(dir, "skills")
    expect(run(["install-skill", "ui-review", "--skills-dir", skills, "--json"], dir).code).toBe(0)
    const md = fs.readFileSync(path.join(dir, "agents", "ui-reviewer.md"), "utf8")
    const skillMd = fs.readFileSync(path.join(skills, "ui-review", "SKILL.md"), "utf8")
    const inOrder = (text: string, needles: Array<string>) => {
      const at = needles.map((n) => text.indexOf(n))
      for (const [i, n] of needles.entries()) expect(at[i], n).toBeGreaterThanOrEqual(0)
      expect(at).toEqual([...at].sort((a, b) => a - b))
    }

    // Frontmatter: a reviewer that cannot write and has no memory of its own.
    const front = md.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? ""
    expect(front).toMatch(/^name: "?ui-reviewer"?$/m)
    expect(front).toMatch(/^tools: Read, Grep, Glob, Bash$/m)
    expect(front).not.toMatch(/^memory:/m)
    expect(front).not.toMatch(/\b(Write|Edit)\b/)
    expect(agentSkills(md)).toEqual(["ui-review"])
    expect(front.match(/<example>/g)).toHaveLength(2)

    // Ownership: the table the skill carries, verbatim, plus the shared lines.
    const ownership = skillMd.split("## Ownership\n")[1]!.split("\n## ")[0]!
    const rows = ownership.split("\n").filter((l) => l.startsWith("|"))
    expect(rows).toHaveLength(6)
    for (const row of rows) expect(md).toContain(row)
    expect(md).toContain("If it changes while an animation or transition runs on the surface, it is motion; an instant re-layout with nothing animating is UI.")
    expect(md).toContain("Target size belongs to the `ui-review` bar: 24 px by default, 44 or 48 px when the project says touch-first (`brain/chore/ui-review.md` → Project bar).")

    // Role and moments: the three moments and the three verdicts.
    inOrder(md, ["**Prototype review**", "**Live-surface review**", "**Anything else**"])
    expect(md).toMatch(/UI pass\*\* of `adversarial-review`/)
    for (const verdict of ["`proceed`", "`proceed with decisions`", "`iterate`"]) expect(md).toContain(verdict)

    // Method: the guide-load line first, then steps 1-6 of SPEC §2 in order (the lean method, D10).
    const guide = "Before the first `agent-browser` command, run `agent-browser skills get core` and follow it: it is the usage guide for the installed version."
    inOrder(md, [
      "## Method",
      guide,
      "### 1. Read the project",
      "### 2. Cover every state and width",
      "### 3. Measure what you report",
      "### 4. Device rendering",
      "### 5. Evidence and scope",
      "### 6. Degraded mode",
      "## Output contract"
    ])
    expect(md).toContain("**Report every failure you measured,**")
    expect(md).toMatch(/\*\*Every number you state\*\* .* is in a file in the run folder or visible in a screenshot there/)
    expect(md).toContain("Read `brain/brain.config.json` (keys in `brain/AGENTS.md` → Project configuration). If it is absent, use the defaults listed there.")
    expect(md).toContain("brain/chore/ui-review.md")
    expect(md).toContain("appium driver list --installed")
    // Every script it runs exists in the installed skill, and goes through bash.
    const scripts = [...md.matchAll(/bash <skillsDir>\/ui-review\/scripts\/([a-z.-]+)/g)].map((m) => m[1]!)
    expect(scripts.length).toBeGreaterThan(0)
    for (const s of scripts) expect(fs.existsSync(path.join(skills, "ui-review", "scripts", s)), s).toBe(true)
    expect(md).not.toMatch(/(^|[\s`(])\.\/(probe|axe)\.sh/m)

    // Output: the SPEC §3 contract, sections in order, axe named on the Engines line.
    const contract = md.split("## Output contract")[1]!.match(/```\n([\s\S]*?)\n```/)?.[1] ?? ""
    inOrder(contract, [
      "## Verdict: proceed | proceed with decisions | iterate",
      "## Engines",
      "## Prototype changes",
      "## Decisions",
      "## Mechanical fixes",
      "## Not verified on device",
      "## Checked and clean",
      "## Not tested",
      "## Open questions"
    ])
    expect(contract).toMatch(/^## Engines .*axe <source> \| not available/m)
    expect(contract).toMatch(/^## Decisions +\(all of them, ranked\)/m)
    expect(contract).toMatch(/^## Not verified on device .*rule · fix/m)
    expect(md).toContain("No scores, no praise, no prose sections. Never drop a finding to keep the review short.")
    expect(md).not.toMatch(/120 lines|≤ 6/)

    // Calibration: kept and rejected examples, the rejected ones naming the other owners.
    inOrder(md, ["## Calibration", "**Kept**", "**Rejected**"])
    const rejected = md.split("**Rejected**")[1]!
    for (const owner of ["`ux-advisor`", "`design-engineer`"]) expect(rejected).toContain(owner)
  })
})

describe("prototype — Phase 6: two reviewers, one loop", () => {
  it("names both reviewers wherever it hands the winner on, and states the shared loop", () => {
    const dir = freshDir()
    const skills = path.join(dir, "skills")
    expect(run(["install-skill", "prototype", "--skills-dir", skills], dir).code).toBe(0)
    const md = fs.readFileSync(path.join(skills, "prototype", "SKILL.md"), "utf8")
    const between = (start: string, end: string) => md.split(start)[1]!.split(end)[0]!
    const lineOf = (prefix: string) => md.split("\n").find((l) => l.startsWith(prefix)) ?? prefix

    // The contract, the brain-flow line and the keep command name both reviewers.
    for (const prefix of ["- **Delegates to:**", "- **Downstream:**", "- **Promotion (Phase 6)", "| `keep <variant>` |"]) {
      const line = lineOf(prefix)
      for (const agent of ["`ux-advisor`", "`ui-reviewer`"]) expect(line, prefix).toContain(agent)
    }

    // The harness check loads the guide of the installed CLI.
    expect(between("### Phase 5", "### Phase 6")).toContain(
      "Before the first `agent-browser` command, run `agent-browser skills get core` and follow it: it is the usage guide for the installed version."
    )

    const phase6 = between("### Phase 6", "## In a brain project")
    // Spawn: both, in parallel, on the winner only, each on its own session; the UI bar in the brief.
    expect(phase6).toContain(
      "UX → `ux-advisor` · static UI of the rendered page → `ui-reviewer` (bar and probes: the `ui-review` skill) · motion and interaction craft → `design-engineer` (`design-engineering`)"
    )
    for (const needle of ["in parallel", "winner only", "--session ux-<slug>", "--session ui-<slug>", "`brain/chore/ui-review.md`"]) {
      expect(phase6, needle).toContain(needle)
    }
    // When an agent can't run.
    expect(phase6).toMatch(/`ui-reviewer` is not installed, skip it and say so/)
    expect(phase6).toContain("`.agents/agents/ui-reviewer.md`")
    // One combined verdict, the stricter of the two.
    expect(phase6).toContain("the stricter of the two")
    // The shared loop: ≤ 3 changes from both reviews, ≤ 2 rounds, both regression passes.
    for (const needle of ["at most 3", "from both reviews", "at most 2 rounds", "**both** run their regression pass", "Checked and clean"]) {
      expect(phase6, needle).toContain(needle)
    }
    // On stop: both reviews saved verbatim, deleted with the surface.
    expect(phase6).toMatch(/`UI-REVIEW\.md` next to `UX-REVIEW\.md`/)
  })
})

describe("create-spec and the Brain Schema — the UI review reaches the spec", () => {
  const inOrder = (text: string, needles: Array<string>) => {
    const at = needles.map((n) => text.indexOf(n))
    for (const [i, n] of needles.entries()) expect(at[i], n).toBeGreaterThanOrEqual(0)
    expect(at).toEqual([...at].sort((a, b) => a - b))
  }

  it("flow-map maps every section of the ui-reviewer contract, merges by element, and suppresses on ui-review.md", () => {
    const dir = freshDir()
    const skills = path.join(dir, "skills")
    expect(run(["install-skill", "create-spec", "--skills-dir", skills], dir).code).toBe(0)
    expect(run(["install-skill", "ui-review", "--skills-dir", skills], dir).code).toBe(0)
    const skill = fs.readFileSync(path.join(skills, "create-spec", "SKILL.md"), "utf8")
    const flowMap = fs.readFileSync(path.join(skills, "create-spec", "references", "flow-map.md"), "utf8")
    const agent = fs.readFileSync(path.join(dir, "agents", "ui-reviewer.md"), "utf8")

    // Every §3 section, as the shipped agent's output contract names it, has a row.
    const contract = agent.split("## Output contract")[1]!.match(/```\n([\s\S]*?)\n```/)?.[1] ?? ""
    const sections = [...contract.matchAll(/^## ([A-Z][a-z]+(?: [a-z]+)*)/gm)].map((m) => m[1]!.toLowerCase())
    expect(sections).toHaveLength(9)
    const table = (flowMap.split("| UI review section | Goes to |")[1] ?? "").split("\n\n")[0]!
    const rows = table.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("|---"))
    const rowFor = (section: string) => rows.find((r) => r.split("|")[1]!.toLowerCase().includes(section)) ?? ""
    for (const section of sections) expect(rowFor(section), section).not.toBe("")
    expect(rowFor("decisions")).toContain("one acceptance criterion each")
    expect(rowFor("mechanical fixes")).toMatch(/one\**\s+criterion that lists them/)
    expect(rowFor("not verified on device")).toContain("Constraints")
    expect(rowFor("open questions")).toContain("Open Questions")
    expect(rowFor("prototype changes")).toContain("Decision Log")
    expect(rowFor("checked and clean")).toContain("not copied")

    // Source: context, or UI-REVIEW.md after an interrupted run.
    expect(flowMap).toContain("`UI-REVIEW.md`")
    // The merge rule.
    expect(flowMap).toContain(
      "A UX finding and a UI finding on the same element become one criterion. The UI wording carries the cause and the fix; the UX wording carries the task consequence."
    )
    // A rejected UI finding: brain/chore/ui-review.md, four sections, base frontmatter, Project bar left to the user.
    expect(flowMap).toContain("`brain/chore/ui-review.md`")
    const page = [...flowMap.matchAll(/```markdown\n([\s\S]*?)\n```/g)].map((m) => m[1]!).find((b) => b.includes("## Project bar")) ?? ""
    inOrder(page, ["domain: _root", "type: concept", "## Project bar", "## Component traps", "## Kept examples", "## Suppressed findings"])

    // SKILL.md: reads the UI review, routes rejections by reviewer, never spawns the agent.
    for (const needle of ["`ui-reviewer` review", "`UI-REVIEW.md`", "`brain/chore/ui-review.md`", "Never spawn `ux-advisor` or `ui-reviewer` yourself"]) {
      expect(skill, needle).toContain(needle)
    }
  })

  it("the twins are byte-identical and give ui-reviewer its place next to ux-advisor", () => {
    const agentsMd = fs.readFileSync(path.join(REPO_ROOT, "assets", "brain", "AGENTS.md"))
    expect(agentsMd.equals(fs.readFileSync(path.join(REPO_ROOT, "assets", "brain", "CLAUDE.md")))).toBe(true)
    const schema = agentsMd.toString("utf8")
    const lineOf = (prefix: string) => schema.split("\n").find((l) => l.startsWith(prefix)) ?? ""

    // Skill routing: prototype has both reviewers review the winner.
    for (const agentName of ["`ux-advisor`", "`ui-reviewer`"]) expect(lineOf("- Use `prototype`")).toContain(agentName)
    // Advisor list: the ux-advisor bullet hands static UI and motion on; ui-reviewer has its own bullet.
    const ux = lineOf("- `ux-advisor` — ")
    expect(ux).toContain("Static UI goes to `ui-reviewer`, motion and interaction craft to `design-engineer`.")
    expect(ux).not.toContain("stays with `design-engineer`")
    inOrder(schema, ["### Advisor subagents", "- `ux-advisor` — ", "- `ui-reviewer` — ", "> **No subagent runtime?**"])
    // chore/: ui-review.md listed next to ux-review.md, with its four parts.
    const chore = schema.split("### `chore/`")[1]!.split("\n### ")[0]!
    inOrder(chore, ["- `ux-review.md`", "- `ui-review.md`"])
    inOrder(chore.split("- `ui-review.md`")[1]!, ["**Project bar**", "**Component traps**", "**Kept examples**", "**Suppressed findings**"])
  })
})

describe("adversarial-review — the UI pass", () => {
  const GUIDE_LOAD =
    "Before the first `agent-browser` command, run `agent-browser skills get core` and follow it: it is the usage guide for the installed version."
  const agent = (name: string) => fs.readFileSync(path.join(REPO_ROOT, "assets", "agents", `${name}.md`), "utf8")
  const paragraph = (text: string, start: string) => start + text.split(start)[1]!.split("\n\n")[0]!

  it("review-classifier charters a UI pass on the rendered-UI signals, and the motion-craft pass drops target size", () => {
    const md = agent("review-classifier")
    const ui = paragraph(md, "**Separate UI concern")
    // The §4.3 signals, listed the way the motion paragraph lists its own.
    for (const signal of ["markup", "stylesheets", "style props", "utility classes", "colour", "spacing", "type", "radius", "ARIA", "role", "label attributes", "inline SVG icons"]) {
      expect(ui, signal).toContain(signal)
    }
    for (const needle of ["`UI pass:`", "`ui-review`", "changed lines"]) expect(ui, needle).toContain(needle)
    const motion = paragraph(md, "**Separate craft concern")
    expect(motion).toContain("`Motion-craft pass:`")
    expect(motion).toMatch(/keeps motion and leaves target size to the UI pass/)
    expect(motion).not.toContain("generic UI pass")
  })

  it("the orchestrator serves the route, the phase docs carry the UI pass, and the verifier stays read-only", () => {
    const dir = freshDir()
    const skills = path.join(dir, "skills")
    expect(run(["install-skill", "adversarial-review", "--skills-dir", skills], dir).code).toBe(0)
    const read = (...p: Array<string>) => fs.readFileSync(path.join(skills, "adversarial-review", ...p), "utf8")
    const inOrder = (text: string, needles: Array<string>) => {
      const at = needles.map((n) => text.indexOf(n))
      for (const [i, n] of needles.entries()) expect(at[i], n).toBeGreaterThanOrEqual(0)
      expect(at).toEqual([...at].sort((a, b) => a - b))
    }

    // SKILL.md: the four orchestrator steps, in order, and the two fallbacks.
    const skill = read("SKILL.md")
    const serve = skill.split("### UI pass: serve the route")[1]!.split("\n### ")[0]!
    inOrder(serve, ["1. **Start or locate the dev server**", "2. **Map each changed surface to a route","3. **Pass the URLs", "4. **Stop the server"])
    for (const needle of ["root `AGENTS.md`", "prototype route", "`PLAN.md` task", "router", "only if you started it", "`DEGRADED`", "not installed"]) {
      expect(serve, needle).toContain(needle)
    }

    // verification-phase.md: a "UI pass only" paragraph next to the motion-craft one.
    const phase = read("references", "verification-phase.md")
    inOrder(phase, ["- **Motion-craft pass only", "- **UI pass only"])
    const uiPass = phase.split("- **UI pass only")[1]!.split("\n- **The project non-negotiables")[0]!
    for (const needle of [GUIDE_LOAD, "`ui-review`", "Case A", "Case B", "DOM injection", "`network route`", "No file, server or data changes", "bash <skillsDir>/ui-review/scripts/", "`DEGRADED`", "not installed"]) {
      expect(uiPass, needle).toContain(needle)
    }
    expect(phase.split("- **Motion-craft pass only")[1]!.split("\n- **")[0]!).toContain("target size")

    // classification-phase.md: the RUBRIC is checked for the craft passes.
    expect(read("references", "classification-phase.md")).toMatch(/UI pass/)

    // REPORT-TEMPLATE.md: Coverage states the UI pass, with both fallbacks.
    const coverage = read("assets", "REPORT-TEMPLATE.md").split("## Coverage")[1]!.split("\n## ")[0]!
    for (const needle of ["UI pass", "`DEGRADED`", "not installed"]) expect(coverage, needle).toContain(needle)

    // adversarial-verifier: the in-contract sentence for the UI pass, and the guide-load line.
    const verifier = agent("adversarial-verifier").split("## Read-only evidence")[1]!.split("\n## ")[0]!
    for (const needle of [GUIDE_LOAD, "UI pass", "DOM injection", "`network route`", "no file, server or data changes"]) {
      expect(verifier, needle).toContain(needle)
    }
  })

  it("the Brain Schema matrix has the UI verifier pass row, in both twins", () => {
    const agentsMd = fs.readFileSync(path.join(REPO_ROOT, "assets", "brain", "AGENTS.md"))
    expect(agentsMd.equals(fs.readFileSync(path.join(REPO_ROOT, "assets", "brain", "CLAUDE.md")))).toBe(true)
    const rows = agentsMd.toString("utf8").split("### Review modes")[1]!.split("\n\n").find((b) => b.startsWith("| Gate |"))!.split("\n")
    const motion = rows.indexOf("| Motion-craft verifier pass | whenever a review runs | same | same |")
    expect(motion).toBeGreaterThan(0)
    expect(rows[motion + 1]).toBe("| UI verifier pass | whenever a review runs | same | same |")
  })
})

describe("scan — frontend stack", () => {
  it("reports a non-React stack and asks for the design-engineering adaptation", () => {
    const dir = freshDir()
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ dependencies: { nuxt: "^3.14.0", vue: "^3.5.0", "reka-ui": "^2.0.0" } })
    )
    // Native shells inside the JS app and node_modules must not count as stacks.
    fs.mkdirSync(path.join(dir, "ios", "App.xcodeproj"), { recursive: true })
    fs.mkdirSync(path.join(dir, "node_modules", "react"), { recursive: true })
    fs.writeFileSync(path.join(dir, "node_modules", "react", "package.json"), JSON.stringify({ dependencies: { react: "19.0.0" } }))

    const { code, stdout } = run(["scan", "--json"], dir)
    expect(code).toBe(0)
    const report = JSON.parse(stdout)
    const frontends = report.lines.filter((l: any) => l.status === "frontend")
    expect(frontends).toEqual([
      { path: "package.json", status: "frontend", note: "vue 3.5 (nuxt 3.14) · ui: reka-ui 2.0" }
    ])
    expect(report.notes.join("\n")).toMatch(/run the design-engineering stack adaptation/)
  })

  it("tells the LLM to ask when no frontend is declared", () => {
    const dir = freshDir()
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ dependencies: { express: "^5.0.0" } }))
    const { stdout } = run(["scan"], dir)
    expect(stdout).toMatch(/frontend: none detected — ask the user/)
  })
})

const write = (dir: string, rel: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
  fs.writeFileSync(path.join(dir, rel), content)
}
const readConfig = (cwd: string) => JSON.parse(fs.readFileSync(path.join(cwd, "brain", "brain.config.json"), "utf8"))

describe("scan — project context", () => {
  it("reports persona sources, the tech-debt store, the review tree, the router, and a suggested config", () => {
    const dir = freshDir()
    write(dir, ".claude/agents/ux-flow-strategist.md", "---\nname: ux-flow-strategist\n---\n\n# UX\n\n## The four Acme personas\n\n### Freelance\n")
    write(dir, "brain/tech-debt/company/linkedin-sync.md", "# debt\n")
    write(dir, "brain/specs/company/linkedin-sync/SPEC.md", "# spec\n")
    write(dir, "brain/review/company/linkedin-sync/REPORT.md", "# report\n")
    write(dir, "package.json", JSON.stringify({ scripts: { test: "vitest", typecheck: "tsc --noEmit" } }))
    write(dir, "AGENTS.md", "# AGENTS.md\n\n## Gates\n\n```bash\npnpm typecheck\npnpm test\n```\n")
    write(dir, "CLAUDE.md", "# CLAUDE.md\n\n## Gates\n\n```bash\npnpm typecheck\npnpm test\n```\n\n## Agent workflow\n\n### Step 7 — Review (optional, only on request)\n\nRun `adversarial-review` only when asked; reports go to `brain/review/<domain>/<spec>/`.\n")

    const { code, stdout } = run(["scan", "--json"], dir)
    expect(code).toBe(0)
    const report = JSON.parse(stdout)
    const byStatus = (s: string) => report.lines.filter((l: any) => l.status === s)

    expect(byStatus("persona-source")).toEqual([
      { path: ".claude/agents/ux-flow-strategist.md", status: "persona-source", note: 'section "The four Acme personas"' }
    ])
    expect(byStatus("tech-debt-store")).toEqual([{ path: "brain/tech-debt", status: "tech-debt-store", note: "1 page(s), per-spec" }])
    expect(byStatus("review-store")[0]).toMatchObject({ path: "brain/review/", note: expect.stringMatching(/^review-tree/) })
    const claude = byStatus("router").find((l: any) => l.path === "CLAUDE.md")
    expect(claude.note).toMatch(/state divergent/)
    expect(claude.note).toMatch(/review on-request/)
    expect(claude.note).toMatch(/only here: "Agent workflow"/)

    expect(report.context.router.state).toBe("divergent")
    expect(report.context.suggestedConfig).toEqual({
      version: 1,
      review: { mode: "none", location: "review-tree" },
      paths: { techDebt: "brain/tech-debt", reviews: "brain/review", personas: null },
      execution: { delegation: "supervised" }
    })
    expect(report.notes.join("\n")).toMatch(/config: review\.mode = "none" — CLAUDE\.md states review only on request/)

    // the text report carries the same four line kinds
    const text = run(["scan"], dir).stdout
    for (const kind of ["persona-source", "tech-debt-store", "review-store", "router"]) expect(text).toContain(`${kind} (`)
  })
})

describe("config lifecycle", () => {
  it("init writes the config from flags, a re-run keeps it, config set round-trips and validates", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude", "--review-mode", "plan"], dir).code).toBe(0)
    expect(readConfig(dir).review.mode).toBe("plan")
    const manifest = readManifest(dir)
    expect(fileRole(manifest, "brain/brain.config.json")).toBe("seed")

    const before = fs.readFileSync(path.join(dir, "brain", "brain.config.json"), "utf8")
    const again = run(["init", "--providers", "claude", "--review-mode", "none"], dir)
    expect(again.code).toBe(0)
    expect(fs.readFileSync(path.join(dir, "brain", "brain.config.json"), "utf8")).toBe(before)
    expect(again.stdout).toMatch(/review\.mode kept at "plan"/)

    const set = run(["config", "set", "review.mode", "none"], dir)
    expect(set.code).toBe(0)
    expect(readConfig(dir).review.mode).toBe("none")
    expect(run(["config", "get", "review.mode"], dir).stdout.trim()).toBe("none")
    expect(JSON.parse(run(["config", "get", "--json"], dir).stdout).config.review.mode).toBe("none")

    const bad = run(["config", "set", "review.mode", "bad"], dir)
    expect(bad.code).not.toBe(0)
    expect(bad.stderr).toMatch(/allowed: total, plan, none/)
    expect(readConfig(dir).review.mode).toBe("none")

    const unknown = run(["config", "set", "review.depth", "1"], dir)
    expect(unknown.code).not.toBe(0)
    expect(unknown.stderr).toMatch(/known keys: review\.mode/)
  })

  it("upgrade on a pre-config install creates it with detected paths and review.mode total", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    // Simulate a 0.6.0 install: no config file, no manifest entry.
    fs.rmSync(path.join(dir, "brain", "brain.config.json"))
    const manifestPath = path.join(dir, "brain", ".brain-manifest.json")
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    manifest.files = manifest.files.filter((f: any) => f.path !== "brain/brain.config.json")
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    write(dir, "brain/specs/auth/login/SPEC.md", "# spec\n")
    write(dir, "brain/review/auth/login/REPORT.md", "# report\n")
    // doctor: no config is a note, not a problem
    expect(run(["doctor"], dir).code).toBe(0)

    const { code, stdout } = run(["upgrade", "--json"], dir)
    expect(code).toBe(0)
    const report = JSON.parse(stdout)
    expect(report.lines.find((l: any) => l.path === "brain/brain.config.json")?.status).toBe("created")
    expect(report.notes.join("\n")).toMatch(/review\.mode defaulted to total/)
    const config = readConfig(dir)
    expect(config.review).toEqual({ mode: "total", location: "review-tree" })
    expect(fileRole(readManifest(dir), "brain/brain.config.json")).toBe("seed")

    // An older config gains only its missing keys.
    fs.writeFileSync(path.join(dir, "brain", "brain.config.json"), JSON.stringify({ version: 1, review: { mode: "none" } }))
    const second = JSON.parse(run(["upgrade", "--json"], dir).stdout)
    expect(second.lines.find((l: any) => l.path === "brain/brain.config.json")).toMatchObject({ status: "updated" })
    expect(readConfig(dir).review).toEqual({ mode: "none", location: "review-tree" })
    expect(readConfig(dir).paths.techDebt).toBe("brain/tech-debt")
  })

  it("doctor fails on an invalid review mode and on a configured path that does not exist", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    const configPath = path.join(dir, "brain", "brain.config.json")
    const valid = fs.readFileSync(configPath, "utf8")

    fs.writeFileSync(configPath, valid.replace('"total"', '"strict"'))
    const strict = run(["doctor"], dir)
    expect(strict.code).toBe(1)
    expect(strict.stdout).toMatch(/invalid/)
    expect(strict.stdout).toMatch(/review\.mode/)

    fs.writeFileSync(configPath, valid)
    expect(run(["config", "set", "paths.personas", "brain/personas.md"], dir).code).toBe(0)
    const missing = run(["doctor"], dir)
    expect(missing.code).toBe(1)
    expect(missing.stdout).toMatch(/brain\/personas\.md\s+— configured as paths\.personas/)

    write(dir, "brain/personas.md", "# Personas\n")
    expect(run(["doctor"], dir).code).toBe(0)
  })
})

describe("link — router states", () => {
  it("links an identical CLAUDE.md without --force", () => {
    const dir = freshDir()
    write(dir, "AGENTS.md", "# Rules\n\n- run the tests\n")
    write(dir, "CLAUDE.md", "# Rules\n\n- run the tests\n")
    expect(run(["link", "--providers", "claude"], dir).code).toBe(0)
    expect(fs.lstatSync(path.join(dir, "CLAUDE.md")).isSymbolicLink()).toBe(true)
    expect(fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8")).toBe("# Rules\n\n- run the tests\n")
  })

  it("never discards a differing CLAUDE.md, not even with --force", () => {
    const dir = freshDir()
    write(dir, "AGENTS.md", "# Rules\n\n- run the tests\n")
    write(dir, "CLAUDE.md", "# Rules\n\n## Solid reactivity\n\n- never destructure props\n")
    const { stdout } = run(["link", "--providers", "claude", "--force"], dir)
    expect(stdout).toMatch(/refusing to discard differing CLAUDE\.md content/)
    expect(fs.lstatSync(path.join(dir, "CLAUDE.md")).isSymbolicLink()).toBe(false)
    expect(fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8")).toContain("Solid reactivity")
  })
})

describe("doctor — leftover files in a bundled skill", () => {
  it("lists a file the package does not ship as untracked, without failing", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    write(dir, ".agents/skills/design-engineering/references/solid-motion.md", "# old project copy\n")
    const { code, stdout } = run(["doctor", "--json"], dir)
    expect(code).toBe(0)
    expect(JSON.parse(stdout).lines).toContainEqual(
      expect.objectContaining({ path: ".agents/skills/design-engineering/references/solid-motion.md", status: "untracked" })
    )
  })
})

describe("upgrade — the orphan rule", () => {
  const manifestPath = (dir: string) => path.join(dir, "brain", ".brain-manifest.json")
  /** Write a file and track it in the manifest as `managed` with `hash` (default: its own). */
  const track = (dir: string, rel: string, content: string | null, hash?: string) => {
    if (content !== null) write(dir, rel, content)
    const manifest = readManifest(dir)
    manifest.files.push({ path: rel, role: "managed", hash: hash ?? contentHash(content ?? "") })
    fs.writeFileSync(manifestPath(dir), JSON.stringify(manifest, null, 2))
  }
  const linesFor = (stdout: string, p: string) => JSON.parse(stdout).lines.filter((l: any) => l.path === p)
  const tracked = (dir: string, p: string) => readManifest(dir).files.some((f: any) => f.path === p)

  const retired = ".agents/skills/retired-skill"
  const legacy = ".agents/skills/design-engineering/references/legacy/old.md"

  it("removes an untouched orphan and the folders it leaves empty, after a dry run that changes nothing", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    track(dir, `${retired}/SKILL.md`, "# retired\n")
    track(dir, `${retired}/references/notes.md`, "# notes\n")
    track(dir, legacy, "# legacy reference\n")
    const orphans = [`${retired}/SKILL.md`, `${retired}/references/notes.md`, legacy]

    // doctor reports them and stays green
    const before = run(["doctor", "--json"], dir)
    expect(before.code).toBe(0)
    for (const p of orphans) expect(linesFor(before.stdout, p)).toEqual([expect.objectContaining({ status: "orphan" })])

    const manifestBefore = fs.readFileSync(manifestPath(dir), "utf8")
    const dry = run(["upgrade", "--dry-run", "--json"], dir)
    expect(dry.code).toBe(0)
    for (const p of orphans) {
      expect(linesFor(dry.stdout, p)).toEqual([expect.objectContaining({ status: "would remove" })])
      expect(fs.existsSync(path.join(dir, p))).toBe(true)
    }
    expect(fs.readFileSync(manifestPath(dir), "utf8")).toBe(manifestBefore)

    const real = run(["upgrade", "--json"], dir)
    expect(real.code).toBe(0)
    for (const p of orphans) {
      expect(linesFor(real.stdout, p)).toEqual([expect.objectContaining({ status: "removed" })])
      expect(fs.existsSync(path.join(dir, p))).toBe(false)
      expect(tracked(dir, p)).toBe(false)
    }
    expect(fs.existsSync(path.join(dir, retired))).toBe(false)
    expect(fs.existsSync(path.join(dir, ".agents/skills/design-engineering/references/legacy"))).toBe(false)
    expect(fs.existsSync(path.join(dir, ".agents/skills/design-engineering/references/standards.md"))).toBe(true)
    expect(fs.existsSync(path.join(dir, ".agents/skills"))).toBe(true)

    expect(run(["doctor"], dir).code).toBe(0)
  })

  it("keeps an edited or advisor-wired orphan even with --force, and drops a missing one", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    const edited = `${retired}/SKILL.md`
    track(dir, edited, "# retired, edited here\n", contentHash("# retired\n"))
    const wired = `${retired}/wired.md`
    // Same normalized hash as installed, but the advisor block holds content.
    const wiredContent = "# wired\n\n<!-- init-brain:advisors:start -->\n- **`ux-advisor`** — flows\n<!-- init-brain:advisors:end -->\n"
    track(dir, wired, wiredContent)
    const missing = `${retired}/missing.md`
    track(dir, missing, null, contentHash("# gone\n"))

    const { code, stdout } = run(["upgrade", "--force", "--json"], dir)
    expect(code).toBe(0)
    expect(linesFor(stdout, edited)).toEqual([expect.objectContaining({ status: "orphan", note: expect.stringMatching(/locally modified, left on disk/) })])
    expect(linesFor(stdout, wired)).toEqual([expect.objectContaining({ status: "orphan", note: expect.stringMatching(/locally modified, left on disk/) })])
    expect(linesFor(stdout, missing)).toEqual([expect.objectContaining({ status: "orphan", note: expect.stringMatching(/missing on disk and no longer shipped/) })])
    expect(fs.readFileSync(path.join(dir, edited), "utf8")).toBe("# retired, edited here\n")
    expect(fs.readFileSync(path.join(dir, wired), "utf8")).toBe(wiredContent)
    for (const p of [edited, wired, missing]) expect(tracked(dir, p)).toBe(false)
  })

  it("a scoped run leaves another skill's orphan alone and handles its own", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    track(dir, legacy, "# legacy reference\n")

    const other = run(["upgrade", "--skill", "tdd", "--json"], dir)
    expect(other.code).toBe(0)
    expect(linesFor(other.stdout, legacy)).toEqual([])
    expect(fs.existsSync(path.join(dir, legacy))).toBe(true)
    expect(tracked(dir, legacy)).toBe(true)

    const own = run(["upgrade", "--skill", "design-engineering", "--json"], dir)
    expect(linesFor(own.stdout, legacy)).toEqual([expect.objectContaining({ status: "removed" })])
    expect(fs.existsSync(path.join(dir, legacy))).toBe(false)
  })
})

describe("upgrade and doctor — a project-owned (seed) skill folder", () => {
  it("gets no newly shipped file, and doctor stays green before and after", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    const ab = ".agents/skills/agent-browser"
    const newlyShipped = `${ab}/LICENSE`
    // A project-owned copy recorded as seed, lacking a file this version ships,
    // plus a project file of its own.
    const manifestPath = path.join(dir, "brain", ".brain-manifest.json")
    const manifest = readManifest(dir)
    manifest.files = manifest.files
      .filter((f: any) => f.path !== newlyShipped)
      .map((f: any) => (f.path.startsWith(`${ab}/`) ? { ...f, role: "seed" } : f))
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    fs.rmSync(path.join(dir, newlyShipped))
    write(dir, `${ab}/references/our-login.md`, "# our login flow\n")

    const before = run(["doctor", "--json"], dir)
    expect(before.code).toBe(0)
    const beforeLines = JSON.parse(before.stdout).lines
    expect(beforeLines.filter((l: any) => l.path.startsWith(`${ab}/`))).toEqual([])

    const up = run(["upgrade", "--json"], dir)
    expect(up.code).toBe(0)
    expect(JSON.parse(up.stdout).lines).toContainEqual(
      expect.objectContaining({ path: newlyShipped, status: "kept", note: expect.stringMatching(/project-owned skill/) })
    )
    expect(fs.existsSync(path.join(dir, newlyShipped))).toBe(false)
    expect(fs.existsSync(path.join(dir, `${ab}/references/our-login.md`))).toBe(true)
    expect(readManifest(dir).files.some((f: any) => f.path === newlyShipped)).toBe(false)

    expect(run(["doctor"], dir).code).toBe(0)
  })
})

describe("agent-browser — the upstream stub", () => {
  const ab = ".agents/skills/agent-browser"
  const bundled = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, "assets", "skills", "agent-browser", rel), "utf8")
  /** Every file under `root`, relative and sorted ([] when the folder is gone). */
  const filesUnder = (root: string): Array<string> =>
    fs.existsSync(root)
      ? (fs.readdirSync(root, { recursive: true, withFileTypes: true }) as Array<fs.Dirent>)
          .filter((e) => e.isFile())
          .map((e) => path.relative(root, path.join(e.parentPath, e.name)))
          .sort()
      : []
  const lineFor = (stdout: string, p: string) => JSON.parse(stdout).lines.find((l: any) => l.path === p)
  const entryFor = (dir: string, p: string) => readManifest(dir).files.find((f: any) => f.path === p)

  /** The long third-party copy an 0.6 install shipped (contents shortened). */
  const OLD: Record<string, string> = {
    "SKILL.md": "---\nname: agent-browser\ndescription: the 0.6 copy\n---\n\n# Agent Browser\n",
    "references/commands.md": "# Command reference (0.6)\n",
    "references/snapshot-refs.md": "# Snapshot refs (0.6)\n",
    "templates/form-automation.sh": "#!/bin/bash\necho form\n"
  }
  const oldPaths = Object.keys(OLD).filter((rel) => rel !== "SKILL.md").map((rel) => `${ab}/${rel}`)

  /**
   * Turn a fresh install into an 0.6 one: the old agent-browser files on disk,
   * tracked with `role` and matching hashes, no LICENSE; optionally with the
   * manifest recorded under another skills dir (the legacy `.claude/skills`,
   * which init links to `.agents/skills`).
   */
  const install06 = (dir: string, role: "managed" | "seed", skillsDir = ".agents/skills") => {
    fs.rmSync(path.join(dir, ab), { recursive: true, force: true })
    for (const [rel, content] of Object.entries(OLD)) write(dir, `${ab}/${rel}`, content)
    const manifest = readManifest(dir)
    manifest.packageVersion = "0.6.0"
    manifest.files = [
      ...manifest.files.filter((f: any) => !f.path.startsWith(`${ab}/`)),
      ...Object.entries(OLD).map(([rel, content]) => ({ path: `${ab}/${rel}`, role, hash: contentHash(content) }))
    ].map((f: any) => (f.path.startsWith(".agents/skills/") ? { ...f, path: `${skillsDir}${f.path.slice(".agents/skills".length)}` } : f))
    manifest.skillsDir = skillsDir
    fs.writeFileSync(path.join(dir, "brain", ".brain-manifest.json"), JSON.stringify(manifest, null, 2))
  }

  /** After the upgrade: only the stub and its license, the old folders gone, doctor green. */
  const expectStubOnly = (dir: string) => {
    expect(filesUnder(path.join(dir, ab))).toEqual(["LICENSE", "SKILL.md"])
    expect(fs.readFileSync(path.join(dir, ab, "SKILL.md"), "utf8")).toBe(bundled("SKILL.md"))
    expect(fs.readFileSync(path.join(dir, ab, "LICENSE"), "utf8")).toBe(bundled("LICENSE"))
    expect(fs.existsSync(path.join(dir, ab, "references"))).toBe(false)
    expect(fs.existsSync(path.join(dir, ab, "templates"))).toBe(false)
    const entries = readManifest(dir).files.filter((f: any) => f.path.startsWith(`${ab}/`))
    expect(entries.map((f: any) => [f.path, f.role])).toEqual([[`${ab}/LICENSE`, "managed"], [`${ab}/SKILL.md`, "managed"]])
    expect(run(["doctor"], dir).code).toBe(0)
  }

  it("init on an empty project installs exactly the stub and its Apache-2.0 license", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    expect(filesUnder(path.join(dir, ab))).toEqual(["LICENSE", "SKILL.md"])

    const skill = fs.readFileSync(path.join(dir, ab, "SKILL.md"), "utf8")
    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? ""
    expect(frontmatter).toMatch(/^name: agent-browser$/m)
    expect(frontmatter).not.toMatch(/^hidden:/m)
    const allowed = frontmatter.match(/^allowed-tools:(.*)$/m)?.[1] ?? ""
    expect(allowed).toContain("Bash(agent-browser:*)")
    expect(allowed).not.toContain("npx")
    // The Apache-2.0 §4(b) notice: upstream, commit, license and both changes.
    const notice = skill.slice(skill.indexOf("---\n", 4)).match(/<!--([\s\S]*?)-->/)?.[1] ?? ""
    for (const fact of ["vercel-labs/agent-browser", "skills/agent-browser/SKILL.md", "021d9255", "2026-08-24", "Apache-2.0", "hidden: true", "Bash(npx agent-browser:*)"]) {
      expect(notice).toContain(fact)
    }
    expect(fs.readFileSync(path.join(dir, ab, "LICENSE"), "utf8")).toMatch(/Apache License\s+Version 2\.0, January 2004/)
  })

  it("upgrade from a 0.6 install replaces the long agent-browser copy with the stub and removes its references", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    install06(dir, "managed")

    const up = run(["upgrade", "--json"], dir)
    expect(up.code).toBe(0)
    expect(lineFor(up.stdout, `${ab}/SKILL.md`)?.status).toBe("updated")
    expect(lineFor(up.stdout, `${ab}/LICENSE`)?.status).toBe("installed")
    for (const p of oldPaths) expect(lineFor(up.stdout, p)?.status).toBe("removed")
    expect(lineFor(up.stdout, `${ab}/references/`)?.status).toBe("removed")
    expect(lineFor(up.stdout, `${ab}/templates/`)?.status).toBe("removed")
    expectStubOnly(dir)
  })

  it("keeps and reports an edited old reference, even with --force", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    install06(dir, "managed")
    const edited = `${ab}/references/commands.md`
    fs.appendFileSync(path.join(dir, edited), "\nour own notes\n")

    const up = run(["upgrade", "--force", "--json"], dir)
    expect(up.code).toBe(0)
    expect(lineFor(up.stdout, edited)).toMatchObject({ status: "orphan", note: expect.stringMatching(/locally modified, left on disk/) })
    expect(fs.readFileSync(path.join(dir, edited), "utf8")).toContain("our own notes")
    expect(entryFor(dir, edited)).toBeUndefined()
    expect(filesUnder(path.join(dir, ab))).toEqual(["LICENSE", "SKILL.md", path.join("references", "commands.md")])
    expect(fs.readFileSync(path.join(dir, ab, "SKILL.md"), "utf8")).toBe(bundled("SKILL.md"))
  })

  it("leaves a project-owned (seed) 0.6 copy alone: nothing changes, no LICENSE, doctor exits 0", () => {
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    install06(dir, "seed")

    const up = run(["upgrade", "--json"], dir)
    expect(up.code).toBe(0)
    expect(lineFor(up.stdout, `${ab}/LICENSE`)).toMatchObject({ status: "kept", note: expect.stringMatching(/project-owned skill/) })
    expect(filesUnder(path.join(dir, ab))).toEqual(Object.keys(OLD).sort())
    for (const [rel, content] of Object.entries(OLD)) expect(fs.readFileSync(path.join(dir, ab, rel), "utf8")).toBe(content)
    expect(entryFor(dir, `${ab}/LICENSE`)).toBeUndefined()
    expect(run(["doctor"], dir).code).toBe(0)

    // A re-run of init still treats the untracked-as-managed copy as project-owned.
    const again = run(["init", "--providers", "claude", "--json"], dir)
    expect(lineFor(again.stdout, ab)).toMatchObject({ status: "kept", note: expect.stringMatching(/project-specific copy/) })
    expect(entryFor(dir, `${ab}/SKILL.md`)?.role).toBe("seed")
    expect(fs.existsSync(path.join(dir, ab, "LICENSE"))).toBe(false)
    expect(run(["doctor"], dir).code).toBe(0)
  })

  it.each([".agents/skills", ".claude/skills"])(
    "re-running init on a 0.6 install (manifest under %s) keeps the tracked copy managed, and upgrade then installs the stub",
    (manifestSkillsDir) => {
      const dir = freshDir()
      expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
      install06(dir, "managed", manifestSkillsDir)

      const again = run(["init", "--providers", "claude", "--json"], dir)
      expect(again.code).toBe(0)
      expect(lineFor(again.stdout, ab)).toMatchObject({ status: "adopted", note: expect.stringMatching(/tracked copy kept; run `brain upgrade`/) })
      const manifest = readManifest(dir)
      expect(manifest.skillsDir).toBe(".agents/skills")
      for (const [rel, content] of Object.entries(OLD)) {
        expect(entryFor(dir, `${ab}/${rel}`)).toEqual({ path: `${ab}/${rel}`, role: "managed", hash: contentHash(content) })
        expect(fs.readFileSync(path.join(dir, ab, rel), "utf8")).toBe(content)
      }

      const up = run(["upgrade", "--json"], dir)
      expect(up.code).toBe(0)
      expect(lineFor(up.stdout, `${ab}/SKILL.md`)?.status).toBe("updated")
      for (const p of oldPaths) expect(lineFor(up.stdout, p)?.status).toBe("removed")
      expectStubOnly(dir)
    }
  )
})

describe("init-brain — the shipped lists, the UI-review twins and the verify step", () => {
  /** The playbook exactly as `brain onboard --json` serves it: the SKILL.md body and every reference. */
  const playbook = (): { body: string; refs: Record<string, string> } => {
    const { code, stdout } = run(["onboard", "--json"], freshDir())
    expect(code).toBe(0)
    const out = JSON.parse(stdout)
    return { body: out.playbook, refs: out.references }
  }
  const bundledSkills = fs.readdirSync(path.join(REPO_ROOT, "assets", "skills")).sort()
  const bundledAgents = fs
    .readdirSync(path.join(REPO_ROOT, "assets", "agents"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -".md".length))
    .sort()
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"]
  const lineOf = (text: string, prefix: string) => text.split("\n").find((l) => l.startsWith(prefix)) ?? ""
  const section = (text: string, heading: string) => (text.split(heading)[1] ?? "").split("\n## ")[0]!
  const paragraph = (text: string, start: string) => start + (text.split(start)[1] ?? "").split("\n\n")[0]!
  const inOrder = (text: string, needles: Array<string>) => {
    const at = needles.map((n) => text.indexOf(n))
    for (const [i, n] of needles.entries()) expect(at[i], n).toBeGreaterThanOrEqual(0)
    expect(at).toEqual([...at].sort((a, b) => a - b))
  }

  it("verify reports agent-browser with its version and Appium as optional, and installs neither", () => {
    const verify = playbook().refs["references/verify.md"]!
    const tools = section(verify, "## 3. Browser and device tools")
    const code = [...tools.matchAll(/```bash\n([\s\S]*?)\n```/g)].map((m) => m[1]!).join("\n")

    // agent-browser: needed for the reviews, reported with the installed version, guide from the CLI.
    expect(code).toContain("command -v agent-browser")
    expect(code).toContain("agent-browser --version")
    for (const needle of ["`ux-advisor`", "`ui-reviewer`", "UI pass", "0.27.1", "`DEGRADED`", "agent-browser skills get core"]) {
      expect(tools, needle).toContain(needle)
    }
    // Appium with the XCUITest driver: optional, it adds Mobile Safari for the device classes.
    expect(code).toContain("command -v appium")
    expect(code).toContain("appium driver list --installed")
    expect(code).toContain("xcuitest")
    for (const needle of ["optional", "Mobile Safari", "not verified on device"]) expect(tools, needle).toContain(needle)
    // Neither is installed, and the device route is never tried to find out.
    expect(tools).toMatch(/never install/i)
    expect(code).not.toMatch(/^\s*(npm|npx|pnpm|yarn|brew)\s|appium driver install|-p ios/m)
    // The final report names both, with the version.
    const report = lineOf(section(verify, "## 6. Print the report"), "- **Tools:**")
    for (const needle of ["`agent-browser`", "version", "Appium", "XCUITest", "optional"]) expect(report, needle).toContain(needle)
  })

  it("every list and count of shipped skills and agents matches assets/", () => {
    // init installs every bundled skill and agent: 12 and 5.
    const dir = freshDir()
    expect(run(["init", "--providers", "claude"], dir).code).toBe(0)
    expect(fs.readdirSync(path.join(dir, ".agents", "skills")).sort()).toEqual(bundledSkills)
    expect(bundledSkills).toHaveLength(12)
    expect(bundledSkills).toContain("ui-review")
    const installedAgents = fs.readdirSync(path.join(dir, ".agents", "agents")).filter((f) => f.endsWith(".md")).sort()
    expect(installedAgents).toEqual(bundledAgents.map((a) => `${a}.md`))
    expect(bundledAgents).toHaveLength(5)
    expect(bundledAgents).toContain("ui-reviewer")

    const { body, refs } = playbook()
    const detection = refs["references/advisor-detection.md"]!
    const verify = refs["references/verify.md"]!
    const count = WORDS[bundledAgents.length]!
    const Count = count[0]!.toUpperCase() + count.slice(1)

    // Every list of the shipped advisors names each of them.
    const lists: Record<string, string> = {
      "SKILL.md → What a run produces": lineOf(body, `- ${Count} shipped **advisor subagents**`),
      "SKILL.md → Step 3": paragraph(body, `The ${count} shipped advisors`),
      "SKILL.md → Never do": lineOf(body, "- Hardcode *project-specific* advisor names"),
      "advisor-detection → intro": paragraph(detection, `The bundled skills ship with ${count} default advisors`),
      "advisor-detection → exclusion": lineOf(detection, "**Exclude the shipped advisors**"),
      "advisor-detection → carried-over blocks": lineOf(detection, "**Blocks carried over from an older install.**"),
      "verify → report": lineOf(verify, "- **Agents:**"),
      "providers → Agents": lineOf(refs["references/providers.md"]!, "- **Agents** → ")
    }
    for (const [where, text] of Object.entries(lists)) {
      for (const agent of bundledAgents) expect(text, `${where}: ${agent}`).toContain(`\`${agent}\``)
    }
    expect(lists["advisor-detection → exclusion"]).toMatch(new RegExp(`beyond\\*? these ${count}\\b`))
    for (const [name, text] of Object.entries({ "SKILL.md": body, ...refs })) {
      expect(text, name).not.toMatch(/shipped four|four shipped|these four|four default|four advisor/i)
    }

    // Every bundled skill is named where the run's output is listed; the token grep covers all but the third-party stub.
    const produces = section(body, "## What a run produces")
    for (const skill of bundledSkills) expect(produces, skill).toMatch(new RegExp(`\\b${skill}\\b`))
    expect(produces).toContain("agent-browser skills get core")
    const grepped = verify.match(/"\$SKILLS_DIR"\/\{([^}]*)\}/)?.[1]?.split(",").sort()
    expect(grepped).toEqual(bundledSkills.filter((s) => s !== "agent-browser"))
  })

  it("a project's own UI-review agents are twins of ui-reviewer, and UX, UI and motion knowledge go to three pages", () => {
    const { body, refs } = playbook()
    const detection = refs["references/advisor-detection.md"]!
    const migration = refs["references/migration.md"]!

    // UI-review or visual-QA agents → twins of ui-reviewer, their knowledge → brain/chore/ui-review.md, the Project bar only offered.
    const ui = paragraph(detection, "**UI-review agents.**")
    for (const needle of ["`ui-reviewer`", "visual-QA", "`brain/chore/ui-review.md`", "**Component traps**", "**Kept examples**", "**Suppressed findings**", "never fill it in"]) {
      expect(ui, needle).toContain(needle)
    }
    expect(ui).toMatch(/Project bar[^.]*offer/)
    inOrder(detection, ["**Recognize legacy twins.**", "**UI-review agents.**", "For each twin:"])

    // The ux/design bucket splits: UX → ux-review.md, static UI → ui-review.md, motion → motion.md.
    inOrder(lineOf(detection, "- **ux/design**"), ["`brain/chore/ux-review.md`", "`brain/chore/ui-review.md`", "`brain/chore/motion.md`"])
    expect(lineOf(detection, "- **ux/design**")).toContain(
      "UX → `ux-advisor` · static UI of the rendered page → `ui-reviewer` (bar and probes: the `ui-review` skill) · motion and interaction craft → `design-engineer` (`design-engineering`)"
    )

    // Agent memory: UI component traps → ui-review.md, UX ones → ux-review.md.
    const memory = section(migration, "## 7. Agent memory")
    expect(lineOf(memory, "  - UI component traps")).toContain("`brain/chore/ui-review.md`")
    expect(lineOf(memory, "  - UX component traps")).toContain("`brain/chore/ux-review.md`")

    // Legacy agent names appear only in the alias table.
    const aliasRows = detection.split("\n").filter((l) => /^\| `[^`]+` \| `[^`]+` \|$/.test(l))
    const legacy = aliasRows.map((l) => l.split("`")[1]!)
    expect(legacy.length).toBeGreaterThan(0)
    const outsideTable = [body, ...Object.values(refs).map((t) => t.split("\n").filter((l) => !aliasRows.includes(l)).join("\n"))]
    for (const name of legacy) for (const text of outsideTable) expect(text, name).not.toContain(name)
  })

  it("upgrade explains the orphan rule, the agent-browser stub, a project-owned copy and a re-run of init", () => {
    const upgrade = playbook().refs["references/upgrade.md"]!
    // Preview first; what `removed` and "left on disk" mean.
    inOrder(upgrade, ["$BRAIN upgrade --dry-run", "**Files this version no longer ships.**"])
    const orphans = paragraph(upgrade, "**Files this version no longer ships.**")
    inOrder(orphans, ["`would remove`", "`removed`", "`orphan` with \"left on disk\"", "`orphan` with \"missing on disk\""])
    for (const needle of ["`managed`", "`--force`", "`--skill`", "`$BRAIN doctor`"]) expect(orphans, needle).toContain(needle)
    // The stub, the version-matched guide, a project-owned copy, and a re-run of init.
    const stub = paragraph(upgrade, "**The `agent-browser` skill.**")
    for (const needle of ["stub", "`LICENSE`", "agent-browser skills get core", "`seed`", "`kept`", "`adopted`", "managed"]) {
      expect(stub, needle).toContain(needle)
    }
  })
})

describe("README and EVAL — the shipped counts and lists", () => {
  const bundledSkills = fs.readdirSync(path.join(REPO_ROOT, "assets", "skills")).sort()
  const bundledAgents = fs
    .readdirSync(path.join(REPO_ROOT, "assets", "agents"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -".md".length))
    .sort()
  const readme = fs.readFileSync(path.join(REPO_ROOT, "README.md"), "utf8")
  const evalMd = fs.readFileSync(path.join(REPO_ROOT, "test", "EVAL.md"), "utf8")
  const lineOf = (text: string, prefix: string) => text.split("\n").find((l) => l.startsWith(prefix)) ?? ""
  const section = (text: string, heading: string) => (text.split(heading)[1] ?? "").split("\n## ")[0]!

  it("the README and EVAL counts agree with assets/, and every shipped skill and advisor is named", () => {
    const skills = bundledSkills.length
    const agents = bundledAgents.length
    expect([skills, agents]).toEqual([12, 5])

    // The init row of the command table and the repo tree.
    const initRow = lineOf(readme, "| `brain init` |")
    expect(initRow).toContain(`install the ${skills} skills`)
    expect(initRow).toContain(`the ${agents} advisor subagents`)
    expect(readme).toMatch(new RegExp(`agents/ +# the ${agents} shipped advisor subagents`))
    expect(readme).toMatch(new RegExp(`skills/ +# the ${skills} bundled suite skills`))

    // What ends up in a project: every bundled skill, and the advisor bullet with every agent.
    const produces = section(readme, "## What ends up in a project")
    for (const skill of bundledSkills) expect(produces, skill).toContain(`\`${skill}\``)
    expect(lineOf(produces, "- **Nine process skills**")).not.toBe("")
    expect(lineOf(produces, "- **The `ui-review` reference skill**")).toContain("`ui-reviewer`")
    const advisors = lineOf(produces, "- **Five advisor subagents**")
    for (const agent of bundledAgents) expect(advisors, agent).toContain(`\`${agent}\``)
    expect(lineOf(produces, "- **The `agent-browser` tool skill**")).toContain("agent-browser skills get core")
    expect(readme).not.toMatch(/four advisor|11 skills|11 bundled|4 advisor|4 shipped/i)

    // The 0.7.0 release notes name the agent, the UI pass, the stub and the orphan rule.
    const notes = section(readme, "## Release notes — 0.7.0")
    for (const needle of ["`ui-reviewer`", "`ui-review`", "UI pass", "agent-browser skills get core", "`orphan`"]) {
      expect(notes, needle).toContain(needle)
    }

    // The 0.9.0 release notes name the gate, the store, its saved state and the upgrade.
    const notes090 = section(readme, "## Release notes — 0.9.0")
    for (const needle of ["Approval gate", "`brain/feature-improvement/<domain>/<spec>.md`", "`CHANGES.md`", "Upgrading from 0.8"]) {
      expect(notes090, needle).toContain(needle)
    }

    // The 0.8.0 release notes name the config key, the ratings, the shared brief and the upgrade.
    const notes080 = section(readme, "## Release notes — 0.8.0")
    for (const needle of ["`execution.delegation`", "`complexity`", "`worker-brief.md`", "Upgrading from 0.7"]) {
      expect(notes080, needle).toContain(needle)
    }
    expect(readme).not.toContain("## Release notes — unreleased")

    // EVAL's fresh-init row.
    const evalInit = lineOf(evalMd, "| Claude (skills + agents) |")
    expect(evalInit).toContain(`${skills} skills`)
    expect(evalInit).toContain(`${agents} agents`)
  })
})
