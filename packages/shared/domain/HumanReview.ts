import { z } from "zod"
import { type AxiosInstance } from "axios"
import { Workflow } from "./Workflow"
import { Execution } from "./Execution"
import { Field } from "./Foundations/Field"
import { Realtime } from "./Realtime"

// Human-in-the-loop gate. The node fires, the engine suspends, the workbench shows a
// dialog driven by Request, and the human's Resolution resumes the run.
export namespace HumanReview {

    
    // ─── Request ────────────────────────────────────────────────────────────
    // Node → human. variant-discriminated to match Execution.Igniter / Field.
    export namespace Request {
        export const Id = z.uuid().brand("HumanReview.Id")
        export type Id = z.infer<typeof Id>

        const Base = z.object({
            id: Id,
            nodeId: Workflow.Node.Id,
            executionId: Execution.Id,
            title: z.string().optional(),
            message: z.string().optional(),
            // Epoch ms when the node created the request. Orders the inbox + gives the
            // absolute deadline when combined with timeoutMs (createdAt + timeoutMs).
            createdAt: z.number(),
            // How long the node parks waiting for a response before it times out.
            timeoutMs: z.number().default(24 * 60 * 60_000),
        })

        // Approve / Reject → 2 ports (approved | rejected)
        export const Confirm = Base.extend({
            variant: z.literal("confirm"),
            approveLabel: z.string().default("Approve"),
            rejectLabel: z.string().default("Reject"),
        })

        // Pick one option, or many if multiple (+ optional custom) + Send → 1 Data port
        export const Choice = Base.extend({
            variant: z.literal("choice"),
            options: z.array(z.object({ label: z.string(), value: z.string() })),
            multiple: z.boolean().default(false),
            allowCustom: z.boolean().default(false),
            sendLabel: z.string().default("Send"),
        })

        // Form → 1 Data port. Reuses Foundations/Field so the existing FieldRenderer drives it.
        export const Form = Base.extend({
            variant: z.literal("form"),
            fields: z.array(Field.Schema),
            sendLabel: z.string().default("Send"),
        })

        export const Schema = z.discriminatedUnion("variant", [Confirm, Choice, Form])
    }
    export type Request = z.infer<typeof Request.Schema>

    // ─── Resolution ─────────────────────────────────────────────────────────
    // Human → node. Resumes the suspended run.
    export namespace Resolution {

        // approved drives the approved/rejected port split
        export const Confirm = z.object({
            variant: z.literal("confirm"),
            approved: z.boolean(),
        })

        // chosen (or custom) values → Data port. Single choice = one-element array.
        export const Choice = z.object({
            variant: z.literal("choice"),
            values: z.array(z.string()),
        })

        // collected field values → Data port
        export const Form = z.object({
            variant: z.literal("form"),
            values: z.record(z.string(), z.any()),
        })

        export const Schema = z.discriminatedUnion("variant", [Confirm, Choice, Form])
    }
    export type Resolution = z.infer<typeof Resolution.Schema>

    export namespace Event {
        export const Channel = Realtime.Channel.brand("HumanReview.Event.Channel")
        export type Channel = z.infer<typeof Channel>

        // executionId in segment 2 so the gateway authorizes via execution ownership
        export const getChannel = (executionId: Execution.Id): Channel =>
            `human-review:${executionId}` as Channel

        // Request surfaced to the user — opens the dialog in the workbench.
        export namespace Sent {
            export const Schema = Realtime.Event.Base.extend({
                type: z.literal("human-review:sent"),
                request: Request.Schema,
            })
            export type Schema = z.infer<typeof Schema>
        }

        // Confirmation: the node consumed the human's answer and un-parked. Closes the dialog
        // in the workbench, and lets the resolve route's awaitEvent resolve.
        export namespace Resolved {
            export const Schema = Realtime.Event.Base.extend({
                type: z.literal("human-review:resolved"),
                requestId: Request.Id,
                resolution: Resolution.Schema,
            })
            export type Schema = z.infer<typeof Schema>
        }

        export const Schema = z.discriminatedUnion("type", [Sent.Schema, Resolved.Schema])
        export type Schema = z.infer<typeof Schema>
    }

    // User → engine. Published by the authed resolve route, consumed by the node's realtimeAPI.awaitSignal.
    export namespace Signal {
        export namespace HumanResponded {
            export const Channel = Realtime.Channel.brand("HumanReview.Signal.HumanResponded.Channel")
            export type Channel = z.infer<typeof Channel>

            export const getChannel = (executionId: Execution.Id, requestId: Request.Id): Channel =>
                `human-review:${executionId}:signal:responded:${requestId}` as Channel

            export const Schema = Realtime.Signal.Base.extend({
                type: z.literal("human-review:responded"),
                resolution: Resolution.Schema,
            })
            export type Schema = z.infer<typeof Schema>
        }
    }

    // ─── API ────────────────────────────────────────────────────────────────
    // Frontend → backend HTTP. The browser never touches Redis; the authed route below
    // verifies execution ownership then publishes the HumanResponded signal upstream.
    export namespace API {

        // Named HumanResponded (the upstream user→engine action), NOT Resolved — Event.Resolved
        // is the DOWNSTREAM confirmation the worker emits after it consumes this signal.
        export namespace HumanResponded {
            export const Request = z.object({
                executionId: Execution.Id,
                requestId:   HumanReview.Request.Id,
                resolution:  Resolution.Schema,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({ success: z.boolean() })
            export type Response = z.infer<typeof Response>
        }

        export async function humanResponded(api: AxiosInstance, req: HumanResponded.Request): Promise<HumanResponded.Response> {
            const { data } = await api.post<HumanResponded.Response>('/api/human-review/respond', req)
            return data
        }
    }
}
