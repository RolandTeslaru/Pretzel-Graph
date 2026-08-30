import { z } from "zod"
import { Realtime } from "./Realtime"
import { ExecutionId } from "./Execution/ids"

// The worker process itself, rather than any run on it. One channel for the
// deployment; nothing here is scoped to an execution.
export namespace Worker {

    export namespace Event {

        export const Channel = Realtime.Channel.brand("WorkerChannel")
        export type Channel = z.infer<typeof Channel>

        export const getChannel = () => "worker" as Channel

        export const Base = Realtime.Event.Base.extend({
            channel: Channel,
        })
        export type Base = z.infer<typeof Base>

        /**
         * Sent while the process is going down, naming the runs it is abandoning.
         * They have no outcome to report and nothing else will report one, so the
         * backend records it for them.
         */
        export const ShuttingDown = Base.extend({
            type:         z.literal('worker:shutting-down'),
            executionIds: z.array(ExecutionId),
        })
        export type ShuttingDown = z.infer<typeof ShuttingDown>

        export const Schema = z.discriminatedUnion("type", [ShuttingDown])
    }
    export type Event = z.infer<typeof Event.Schema>
}
