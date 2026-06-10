import { Data } from "effect"

/** User-facing failure: caught at the top level and printed without a stack trace. */
export class CliError extends Data.TaggedError("CliError")<{
  readonly message: string
}> {}
