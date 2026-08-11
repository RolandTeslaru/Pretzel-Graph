import z from "zod";
import { NodeId } from "./Workflow/ids"
// Leaf modules only — importing the Execution barrel here would cycle, since
// Execution/session.ts embeds Consultation.Request in pending_consultations.
import { ExecutionId } from "./Execution/ids"
import { Signal as ExecutionSignal } from "./Execution/signal"
import * as ExecutionEvent from "./Execution/event-base"
import type { AxiosInstance } from "axios";

// The workflow asking the user for something and parking until it gets an answer.
// `type` is an open brand rather than a closed union, so a node can introduce a new
// kind of consultation without editing this file — extend Request/Resolution in the
// owning namespace and register a renderer on the frontend.
export namespace Consultation {

    export const Id = z.uuid().brand("Consultation.Id")
    export type Id = z.infer<typeof Id>

    export const Variant = z.string().brand("Consultation.Variant")
    export type Variant = z.infer<typeof Variant>

    export const Request = z.object({
        id: Consultation.Id,
        variant: Variant,
        // Which node is asking — drives attribution in the workbench.
        nodeId: NodeId,
        // Epoch ms, stamped by consultationAPI. With timeoutMs it gives the absolute
        // deadline, so a card rebuilt after a page rejoin resumes mid-countdown.
        startedAt: z.number(),
        timeoutMs: z.number(),
    })
    export type Request = z.infer<typeof Request>

    export const Resolution = z.object({
        requestId: Consultation.Id,
        variant: Variant
    })
    export type Resolution = z.infer<typeof Resolution>




    // Travels on the execution's own outbound channel — the union is Consultation's,
    // the channel is shared. See Execution/event-base.
    export namespace Event {

        // Engine consumed an answer and un-parked. Purely an acknowledgement — the card is
        // already gone via the session patch that clears pending_consultations.
        export const Resolved = ExecutionEvent.Base.extend({
            type:           z.literal("consultation:resolved"),
            consultationId: Consultation.Id,
        })
        export type Resolved = z.infer<typeof Resolved>

        export const Schema = z.discriminatedUnion("type", [Resolved])

        export const create = ExecutionEvent.defineEventFactory(Schema)
    }
    export type Event = z.infer<typeof Event.Schema>



    // Inbound on the execution's one signal channel. consultationId is the correlation
    // key, matched in-process by the parked node — it is not part of any channel name,
    // because only executionId is an ownership boundary and a channel suffix authorizes
    // nothing.
    export namespace Signal {

        const Base = ExecutionSignal.Base.extend({
            consultationId: Consultation.Id
        })

        export const Responded = Base.extend({
            type: z.literal("consultation:responded"),
            consultationResolution: Consultation.Resolution
        })
        export type Responded = z.infer<typeof Responded>

        export const Schema = z.discriminatedUnion("type", [Responded])
    }
    export type Signal = z.infer<typeof Signal.Schema>



    // ─── API ────────────────────────────────────────────────────────────────
    // Frontend → backend HTTP. The browser never touches Redis; the authed route below
    // verifies execution ownership then publishes the HumanResponded signal upstream.
    export namespace API {

        // Named HumanResponded (the upstream user→engine action), NOT Resolved — Event.Resolved
        // is the DOWNSTREAM confirmation the worker emits after it consumes this signal.
        export namespace HumanResponded {
            export const Request = z.object({
                executionId:    ExecutionId,
                consultationId: Consultation.Id,
                resolution:     Consultation.Resolution,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({ success: z.boolean() })
            export type Response = z.infer<typeof Response>
        }

        export async function humanResponded(api: AxiosInstance, req: HumanResponded.Request): Promise<HumanResponded.Response> {
            const { data } = await api.post<HumanResponded.Response>('/api/consultation/respond', req)
            return data
        }
    }
}
