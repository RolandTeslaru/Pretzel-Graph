import { z } from "zod"
import type { AxiosInstance } from "axios"
import { Workflow as WorkflowD } from "./Workflow"
import { Execution as ExecutionD } from "./Execution"
import { Realtime } from "./Realtime"

// What the workspace is doing, across every workflow. Composed from Execution
// and Workflow rather than owning a table of its own.
export namespace Activity {

    export namespace Workflow {
        export const Schema = WorkflowD.Meta.Schema.extend({
            executions: z.array(ExecutionD.Meta)
        })
    }
    export type Workflow = z.infer<typeof Workflow.Schema>


    export const Schema = z.object({
        workflows: z.record(WorkflowD.Id, Workflow.Schema)
    })


    export namespace Event {

        export const Channel = Realtime.Channel.brand("ActivityChannel")
        export type Channel = z.infer<typeof Channel>

        // One channel for the whole workspace: the board hears about runs it did
        // not start, so there is no id to derive it from.
        export const getChannel = () => "activity" as Channel

        export const Base = Realtime.Event.Base.extend({
            channel: Channel,
        })
        export type Base = z.infer<typeof Base>

        // Mirrors Execution.Event.Lifecycle, carrying the whole row so a card
        // renders without a follow-up read.
        export namespace ExecutionLifecycle {
            export const Started    = Base.extend({ type: z.literal('activity:execution:started'),    execution: ExecutionD.Meta })
            export const Paused     = Base.extend({ type: z.literal('activity:execution:paused'),     execution: ExecutionD.Meta })
            export const Resumed    = Base.extend({ type: z.literal('activity:execution:resumed'),    execution: ExecutionD.Meta })
            export const Completed  = Base.extend({ type: z.literal('activity:execution:completed'),  execution: ExecutionD.Meta })
            export const Failed     = Base.extend({ type: z.literal('activity:execution:failed'),     execution: ExecutionD.Meta })
            export const Suspended  = Base.extend({ type: z.literal('activity:execution:suspended'),  execution: ExecutionD.Meta })
            export const Terminated = Base.extend({ type: z.literal('activity:execution:terminated'), execution: ExecutionD.Meta })

            export type Started    = z.infer<typeof Started>
            export type Paused     = z.infer<typeof Paused>
            export type Resumed    = z.infer<typeof Resumed>
            export type Completed  = z.infer<typeof Completed>
            export type Failed     = z.infer<typeof Failed>
            export type Suspended  = z.infer<typeof Suspended>
            export type Terminated = z.infer<typeof Terminated>

            export const Schema = z.discriminatedUnion("type", [Started, Paused, Resumed, Completed, Failed, Suspended, Terminated])
        }
        export type ExecutionLifecycle = z.infer<typeof ExecutionLifecycle.Schema>


        export const Schema = z.discriminatedUnion("type", [ExecutionLifecycle.Schema])
    }
    export type Event = z.infer<typeof Event.Schema>


    export namespace API {

        // Everything the board renders on load, in one round trip.
        export namespace Bootstrap {
            export const Request = z.object({})
            export type Request = z.infer<typeof Request>

            export const Response = Schema
            export type Response = z.infer<typeof Response>
        }

        export async function bootstrap(api: AxiosInstance): Promise<Bootstrap.Response> {
            const { data } = await api.post<Bootstrap.Response>('/api/activity/bootstrap', {})
            return data
        }
    }
}
export type Activity = z.infer<typeof Activity.Schema>
