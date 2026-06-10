/**
 * The `## Project Advisors` block in create-spec / create-plan / implement-spec
 * is the one region of a managed SKILL.md that the LLM (advisor detection) is
 * expected to edit after install. Everything here treats that block as
 * user-owned: hashing normalizes it away, and upgrades carry it over.
 */

export const ADVISORS_START = "<!-- init-brain:advisors:start -->"
export const ADVISORS_END = "<!-- init-brain:advisors:end -->"

const PLACEHOLDER_PREFIX = "_No project advisor agents detected"

export const hasAdvisorMarkers = (content: string): boolean =>
  content.includes(ADVISORS_START) && content.includes(ADVISORS_END)

/** Content strictly between the markers, trimmed. `null` when markers are absent. */
export const extractAdvisorsBlock = (content: string): string | null => {
  const start = content.indexOf(ADVISORS_START)
  const end = content.indexOf(ADVISORS_END)
  if (start === -1 || end === -1 || end < start) return null
  return content.slice(start + ADVISORS_START.length, end).trim()
}

export const isPlaceholderBlock = (block: string): boolean =>
  block === "" || block.startsWith(PLACEHOLDER_PREFIX)

/** Replace whatever sits between the markers with `block` (markers kept). */
export const replaceAdvisorsBlock = (content: string, block: string): string => {
  const start = content.indexOf(ADVISORS_START)
  const end = content.indexOf(ADVISORS_END)
  if (start === -1 || end === -1 || end < start) return content
  return (
    content.slice(0, start + ADVISORS_START.length) +
    "\n" + block + "\n" +
    content.slice(end)
  )
}

/**
 * Canonical form used for hashing: the advisors block is emptied so that
 * LLM-wired advisors never count as a local modification.
 */
export const normalizeAdvisors = (content: string): string =>
  hasAdvisorMarkers(content) ? replaceAdvisorsBlock(content, "") : content

/**
 * Carry the advisors block of `current` into `incoming` (the bundled version),
 * unless the current block is just the placeholder.
 */
export const carryAdvisorsOver = (current: string, incoming: string): string => {
  const block = extractAdvisorsBlock(current)
  if (block === null || isPlaceholderBlock(block)) return incoming
  if (!hasAdvisorMarkers(incoming)) return incoming
  return replaceAdvisorsBlock(incoming, block)
}
