import { readFileSync } from "node:fs"

/** Compiled location is dist/version.js, so package.json sits one level up. */
export const VERSION: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
).version
