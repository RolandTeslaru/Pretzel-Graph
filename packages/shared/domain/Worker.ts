import { z } from "zod"
import { Realtime } from "./Realtime"
import { ExecutionId } from "./Execution/ids"

// The worker process itself, rather than any run on it. One channel for the
// deployment; nothing here is scoped to an execution.
export namespace Worker {

    export const Id = z.string().min(1).brand("Worker.Id")
    export type  Id = z.infer<typeof Id>

    export const RequestId = z.uuid().brand("Worker.RequestId")
    export type  RequestId = z.infer<typeof RequestId>

    export namespace Signal {

        export const Channel = Realtime.Channel.brand("Worker.Signal.Channel")
        export type Channel = z.infer<typeof Channel>

        export const getChannel = (workerId: Id) => `worker:${workerId}:signal` as Channel

        export const Base = Realtime.Signal.Base.extend({
            channel:   Channel,
            workerId:  Id,
            requestId: RequestId,
        })
        export type Base = z.infer<typeof Base>

        export namespace Sleep {

            // Asks an idle worker to let go of its connections before its machine is suspended.
            export const Prepare = Base.extend({
                type: z.literal("worker:sleep:prepare"),
            })
            export type Prepare = z.infer<typeof Prepare>
        }

        export namespace Consumption {

            // Asks a woken worker to take jobs again.
            export const Resume = Base.extend({
                type: z.literal("worker:consumption:resume"),
            })
            export type Resume = z.infer<typeof Resume>
        }

        export const Schema = z.discriminatedUnion("type", [Sleep.Prepare, Consumption.Resume])
    }
    export type Signal = z.infer<typeof Signal.Schema>

    export namespace Event {

        export const Channel = Realtime.Channel.brand("WorkerChannel")
        export type Channel = z.infer<typeof Channel>

        export const getChannel = () => "worker" as Channel

        export const Base = Realtime.Event.Base.extend({
            channel:  Channel,
            // Null when the worker runs without an assigned id.
            workerId: Id.nullable(),
        })
        export type Base = z.infer<typeof Base>

        // A reply to one signal, matched by its request id.
        export const Reply = Base.extend({
            workerId:  Id,
            requestId: RequestId,
        })
        export type Reply = z.infer<typeof Reply>

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

        export namespace Sleep {

            // The worker has let go of its connections and its machine may be suspended.
            export const Ready = Reply.extend({
                type: z.literal("worker:sleep:ready"),
            })
            export type Ready = z.infer<typeof Ready>
        }

        export namespace Consumption {

            // The worker is taking jobs again.
            export const Ready = Reply.extend({
                type: z.literal("worker:consumption:ready"),
            })
            export type Ready = z.infer<typeof Ready>
        }

        export const Schema = z.discriminatedUnion("type", [ShuttingDown, Sleep.Ready, Consumption.Ready])
    }
    export type Event = z.infer<typeof Event.Schema>
}
