import z from "zod"
import { Realtime } from "../Realtime"
import { ExecutionId } from "./ids"

// ─── Signals ──────────────────────────────────────────────────────────────
// Single signal channel per execution: execution:<executionId>:signal

export namespace Signal {
    export const Channel = Realtime.Channel.brand("Execution.Signal.Channel")
    export type Channel = z.infer<typeof Channel>

    export const getChannel = (executionId: ExecutionId) =>
        `execution:${executionId}:signal` as Channel

    const Base = Realtime.Signal.Base.extend({ executionId: ExecutionId })

    export const Terminate = Base.extend({ type: z.literal("terminate") })
    export const Pause     = Base.extend({ type: z.literal("pause") })
    export const Resume    = Base.extend({ type: z.literal("resume") })
    export const Suspend   = Base.extend({ type: z.literal("suspend") })
    export const Heartbeat = Base.extend({ type: z.literal("heartbeat") })

    export type Terminate = z.infer<typeof Terminate>
    export type Pause     = z.infer<typeof Pause>
    export type Resume    = z.infer<typeof Resume>
    export type Suspend   = z.infer<typeof Suspend>
    export type Heartbeat = z.infer<typeof Heartbeat>

    export const Schema = z.discriminatedUnion("type", [
        Terminate, Pause, Resume, Suspend, Heartbeat,
    ])
}
export type Signal = z.infer<typeof Signal.Schema>
