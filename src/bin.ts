#!/usr/bin/env node
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Layer } from "effect"
import { cli } from "./Cli.js"
import { Assets } from "./services/Assets.js"

/** Assets needs FileSystem/Path, and the commands need both Assets and NodeContext. */
const MainLayer = Assets.Default.pipe(Layer.provideMerge(NodeContext.layer))

cli(process.argv).pipe(
  Effect.catchTag("CliError", (error) =>
    Console.error(`error: ${error.message}`).pipe(
      Effect.zipRight(Effect.sync(() => { process.exitCode = 1 }))
    )
  ),
  Effect.provide(MainLayer),
  NodeRuntime.runMain({ disableErrorReporting: false })
)
