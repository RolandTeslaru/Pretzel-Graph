import z from "zod"
import { Realtime } from "../Realtime"
import { WorkflowId } from "../Workflow/ids"
import { ExecutionId } from "../Execution/ids"

// One channel per workflow: workbench:<workflowId>. Carries what happens to a workflow as a
// document rather than as a run — today, who holds it.
export namespace Event {
    export const Channel = Realtime.Channel.brand("Workbench.Event.Channel")
    export type Channel = z.infer<typeof Channel>

    export const getChannel = (workflowId: WorkflowId) => `workbench:${workflowId}` as Channel

    const Base = Realtime.Event.Base.extend({
        channel:    Channel,
        workflowId: WorkflowId,
    })

    export namespace Lock {
        export const Acquired = Base.extend({
            type:        z.literal("lock:acquired"),
            executionId: ExecutionId,
        })
        export const Released = Base.extend({
            type:        z.literal("lock:released"),
            executionId: ExecutionId,
        })
        export type Acquired = z.infer<typeof Acquired>
        export type Released = z.infer<typeof Released>
    }

    export const Schema = z.discriminatedUnion("type", [Lock.Acquired, Lock.Released])
}
export type Event = z.infer<typeof Event.Schema>
