import { execFileSync, execSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

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
}
const run = (args: Array<string>, cwd: string): RunResult => {
  try {
    const stdout = execFileSync("node", [BIN, ...args], { cwd, encoding: "utf8" })
    return { code: 0, stdout }
  } catch (e: any) {
    return { code: e.status ?? 1, stdout: (e.stdout ?? "").toString() }
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
    expect(fs.existsSync(path.join(dir, ".agents", "agents", "ux-advisor.md"))).toBe(true)

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
