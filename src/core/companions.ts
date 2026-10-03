/**
 * Agent ↔ skill links. A shipped agent names the skills it runs on in its
 * frontmatter `skills:` list — Claude Code preloads them into the agent's
 * context — and the CLI reads the same list so a scoped install or update
 * (`upgrade --skill`, `install-skill <name>`) carries the agent along: the
 * two always ship at the same version.
 */

const unquote = (s: string): string => s.trim().replace(/^["']|["']$/g, "").trim()

/** The `skills:` list of an agent definition's frontmatter — YAML block list or inline `[a, b]` / `a, b`. */
export const agentSkills = (content: string): Array<string> => {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (fm === null) return []
  const lines = fm[1]!.split(/\r?\n/)
  const at = lines.findIndex((l) => /^skills\s*:/.test(l))
  if (at === -1) return []

  const inline = lines[at]!.replace(/^skills\s*:/, "").trim()
  if (inline.length > 0) {
    return inline.replace(/^\[|\]$/g, "").split(",").map(unquote).filter((s) => s.length > 0)
  }
  const out: Array<string> = []
  for (const line of lines.slice(at + 1)) {
    const item = line.match(/^\s*-\s*(.+)$/)
    if (item === null) break
    out.push(unquote(item[1]!))
  }
  return out.filter((s) => s.length > 0)
}

/** Skill name → the agent files (relative to the agents dir) that declare it, in file order. */
export const companionAgents = (
  agents: ReadonlyMap<string, { readonly content: string }>
): Map<string, Array<string>> => {
  const out = new Map<string, Array<string>>()
  for (const [rel, agent] of [...agents].sort(([a], [b]) => a.localeCompare(b))) {
    for (const skill of agentSkills(agent.content)) {
      out.set(skill, [...(out.get(skill) ?? []), rel])
    }
  }
  return out
}

/** `design-engineer.md` → `design-engineer`. */
export const agentName = (rel: string): string => rel.replace(/\.md$/, "")
