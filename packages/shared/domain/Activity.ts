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

        // One event for every state a run reaches, carrying the whole row so a
        // card renders without a follow-up read. The status it landed on is in
        // the payload, which is all a board branches on.
        export namespace Execution {
            export const Upserted = Base.extend({
                type:      z.literal('activity:execution:upserted'),
                execution: ExecutionD.Meta,
            })
            export type Upserted = z.infer<typeof Upserted>

            export const Schema = z.discriminatedUnion("type", [Upserted])
        }
        export type Execution = z.infer<typeof Execution.Schema>


        export const Schema = z.discriminatedUnion("type", [Execution.Schema])
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
