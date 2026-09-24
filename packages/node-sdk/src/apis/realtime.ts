import type { z } from "zod";
import type { Consultation, Execution } from "@pretzel-graph/shared/domain";



export interface RealtimeScope {
    /** Build it with the owning namespace's `create`; emit stamps the addressing. */
    emit: (event: Execution.Event.Unstamped) => void,

    /** Permanent handler. Returns its own unregister. */
    onSignal: <S extends Execution.Signal.Base>(
        schema:  z.ZodType<S>,
        handler: (signal: S) => void,
    ) => () => void,

    /**
     * Park until a signal passes both filters, or reject on timeout / terminate / suspend.
     *
     * `match` is required: schema alone cannot separate two nodes parked on the same kind
     * of signal, so without it the first reply would resolve both.
     */
    awaitSignal: <S extends Execution.Signal.Base>(
        schema:  z.ZodType<S>,
        match:   (signal: S) => boolean,
        timeout: number,
    ) => Promise<S>,

    /**
     * awaitSignal, with the waiter registered BEFORE `action` runs — for anything that
     * invites the reply it is about to wait for. An instant responder cannot slip into the
     * gap between triggering and waiting, because there is none.
     */
    awaitSignalAfter: <S extends Execution.Signal.Base>(
        schema:  z.ZodType<S>,
        match:   (signal: S) => boolean,
        timeout: number,
        action:  () => void | Promise<void>,
    ) => Promise<S>,

    /** A view whose parks also reject when `abortSignal` fires (terminate/suspend). */
    withAbort: (abortSignal: AbortSignal) => RealtimeAPI,

    /** Unsubscribes and rejects whatever is still parked. Withheld from nodes. */
    close: () => void,
}



/**
 * What a node holds: the scope minus the lifecycle controls only the host should reach.
 * Picked from the scope so the two can never drift — a capability added to the scope is
 * withheld by default, and sharing it is an explicit edit here.
 */
export type RealtimeAPI = Pick<
    RealtimeScope,
    | "emit"
    | "onSignal"
    | "awaitSignal"
    | "awaitSignalAfter"
>;



/**
 * What a node hands to `consult`, which stamps `id` and `startedAt` itself. Lives here
 * rather than in the domain because those two fields are only absent in transit to this
 * one call — a stored `Consultation.Request` always has them.
 *
 * Generic, so a domain extending `Request` keeps its own props on the way through;
 * distributive, so a domain whose `Request` is a union keeps each member's props rather
 * than collapsing to their intersection.
 */
export type UnstampedConsultationRequest<
    T_Request = Consultation.Request,
> = T_Request extends unknown ? Omit<T_Request, "id" | "startedAt"> : never;



/**
 * Ask the human something and park until they answer. Mirrors the request onto the session
 * so a client joining mid-run rebuilds the card, and rejects on timeout, terminate, or
 * suspend.
 *
 * Both schemas are the specific variant, not the domain's whole union: `requestSchema`
 * types the request argument and validates it once stamped, `resolutionSchema` fails an
 * answer of the wrong shape here rather than downstream.
 *
 * The request argument is typed off the schema's *input*, so fields carrying a
 * `.default()` are optional to pass — the parse fills them.
 */
export interface ConsultationProps<
    RQ extends Consultation.Request,
    RQ_Input,
    A extends Consultation.Answer,
> {
    /** Parses the stamped request. Keeps the domain's own fields all the way through. */
    requestSchema: z.ZodType<RQ, RQ_Input>,
    /** Everything but `id` and `startedAt` — consult stamps those. */
    request:       UnstampedConsultationRequest<RQ_Input>,
    /** Validates the reply before the node sees it. */
    answerSchema:  z.ZodType<A>,
    /**
     * Runs once the waiter is armed and the request is on the session, with the stamped
     * request in hand. Anything that *invites* the answer belongs here — registering an
     * inbound route, pinging an external system — so it cannot be satisfied before there
     * is somewhere for the reply to land. Throwing unregisters the waiter rather than
     * leaving the node parked until timeout.
     */
    onOpen?:       (request: RQ) => void | Promise<void>,
}



export interface ConsultationAPI {
    consult: <
        RQ extends Consultation.Request,
        RQ_Input,
        A extends Consultation.Answer,
    >(
        props: ConsultationProps<RQ, RQ_Input, A>,
    ) => Promise<A>,
}
