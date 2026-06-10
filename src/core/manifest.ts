import { Schema } from "effect"

/**
 * The manifest (`brain/.brain-manifest.json`) is what makes `upgrade` safe:
 * for every installed file it records the content hash at install time, so a
 * later upgrade can tell "untouched since we wrote it" from "locally edited".
 *
 * Roles:
 * - `managed` — owned by brain-manager; upgraded when the bundled version
 *   changes, as long as the file on disk is unmodified.
 * - `seed`    — written once, then owned by the project (brain/ content, or a
 *   pre-existing agent-browser skill we chose not to clobber). Upgrades only
 *   restore it when it is missing.
 */

export const FileRole = Schema.Literal("managed", "seed")
export type FileRole = typeof FileRole.Type

export const ManifestEntry = Schema.Struct({
  path: Schema.String,
  role: FileRole,
  hash: Schema.String
})
export type ManifestEntry = typeof ManifestEntry.Type

export const Manifest = Schema.Struct({
  packageVersion: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  skillsDir: Schema.String,
  files: Schema.Array(ManifestEntry)
})
export type Manifest = typeof Manifest.Type

export const MANIFEST_PATH = "brain/.brain-manifest.json"

export const decodeManifest = Schema.decodeUnknown(Schema.parseJson(Manifest))
export const encodeManifest = Schema.encode(Schema.parseJson(Manifest, { space: 2 }))
