import { createHash } from "node:crypto"
import { normalizeAdvisors } from "./advisors.js"

export const sha256 = (content: string): string =>
  createHash("sha256").update(content, "utf8").digest("hex")

/**
 * Hash used everywhere a file is compared (manifest, disk, bundled asset).
 * Advisor blocks are normalized away first — see core/advisors.ts.
 */
export const contentHash = (content: string): string =>
  sha256(normalizeAdvisors(content))
