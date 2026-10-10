import { execFileSync, execSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
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
      paths: { techDebt: "brain/tech-debt", reviews: "brain/review", personas: null }
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
    const newlyShipped = `${ab}/references/proxy-support.md`
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
