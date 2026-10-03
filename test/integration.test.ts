import { execFileSync, execSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
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
