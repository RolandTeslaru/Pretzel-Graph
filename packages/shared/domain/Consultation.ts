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

    /**
     * Brands a variant tag while KEEPING its literal type. A plain `as Variant` widens the
     * tag to the branded string, and an extending schema then can't discriminate its own
     * union on it — every member narrows to `never`.
     */
    export const variant = <const T extends string>(tag: T) => tag as T & Variant
    
    /**
     * Loose, not strict: this base travels as the declared type of `Signal.Answer.answer`
     * and `Session.pending_consultations`, so a strict object would silently strip whatever the
     * extending domain added — the very fields that make the consultation meaningful. Extras
     * survive the base-typed hop and are validated by the variant schema at each end.
     */
    export const Request = z.looseObject({
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

    /** The message a human or external caller sends back. Loose for the same reason as
     *  Request — see the note there. */
    export const Answer = z.looseObject({
        requestId: Consultation.Id,
        variant: Variant
    })
    export type Answer = z.infer<typeof Answer>




    // Travels on the execution's own outbound channel — the union is Consultation's,
    // the channel is shared. See Execution/event-base.
    export namespace Event {

        // The consultation reached its terminal state: the answer parsed, the node un-parked.
        // Purely an acknowledgement — the card is already gone via the session patch that
        // clears pending_consultations.
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

        export const Answer = Base.extend({
            type: z.literal("consultation:answer"),
            answer: Consultation.Answer
        })
        export type Answer = z.infer<typeof Answer>

        export const Schema = z.discriminatedUnion("type", [Answer])
    }
    export type Signal = z.infer<typeof Signal.Schema>



    // ─── API ────────────────────────────────────────────────────────────────
    // Frontend → backend HTTP. The browser never touches Redis; the authed route below
    // verifies execution ownership then publishes the Answer signal upstream.
    export namespace API {

        // The upstream user→engine message. Event.Resolved is the DOWNSTREAM confirmation the
        // worker emits once it has consumed this and un-parked.
        // executionId is the authorization boundary, so it travels in the path and the route's
        // scope guard proves ownership before the handler runs. Strict so a stale client still
        // sending it in the body is rejected outright rather than silently stripped.
        export namespace Answer {
            export const Request = z.strictObject({
                consultationId: Consultation.Id,
                answer:         Consultation.Answer,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({ success: z.boolean() })
            export type Response = z.infer<typeof Response>
        }

        export async function answer(
            api:         AxiosInstance,
            executionId: ExecutionId,
            req:         Answer.Request,
        ): Promise<Answer.Response> {
            const { data } = await api.post<Answer.Response>(`/api/consultation/${executionId}/answer`, req)
            return data
        }
    }
}
