import z from "zod"
import { Realtime } from "../Realtime"
import { WorkflowId } from "../Workflow/ids"
import { ExecutionId } from "./ids"

// ─── Outbound base ────────────────────────────────────────────────────────
// Every execution-scoped domain extends `Base` so they all travel on the one
// outbound channel, execution:<executionId>.
//
// Split out of event.ts, which reaches Consultation through session.ts — so the
// domains extending this cannot import event.ts without closing a cycle. Kept a
// leaf: zod, Realtime, and the two id modules only. Note ../Workflow/ids rather
// than the Workflow barrel, which reaches back here through Workflow/node.ts.

export const Channel = Realtime.Channel.brand("ExecutionChannel")
export type Channel = z.infer<typeof Channel>

export const getChannel = (executionId: ExecutionId) =>
    `execution:${executionId}` as Channel

export const Base = Realtime.Event.Base.extend({
    channel:     Channel,
    executionId: ExecutionId,
    workflowId:  WorkflowId,
})
export type Base = z.infer<typeof Base>

/** Written by realtimeAPI.emit from the execution it is bound to, never by the caller. */
type Stamped = "channel" | "executionId" | "workflowId"

/** What a factory returns: a member minus the fields emit stamps. */
export type Unstamped<T_Event extends Base = Base> = Omit<T_Event, Stamped>

/**
 * Builds a namespace's `create` from its union, so each domain owns a typed factory
 * without a hand-written copy of the OfType/Rest/RestArg block.
 *
 * The schema is the inference source only — nothing is parsed. The result is incomplete
 * by construction (emit supplies the rest), so there is nothing here to validate.
 */
export function defineEventFactory<T_Schema extends z.ZodType<Base>>(_schema: T_Schema) {

    type Event = z.infer<T_Schema>

    type OfType<T extends Event["type"]> = Extract<Event, { type: T }>

    type Rest<T extends Event["type"]> = Omit<OfType<T>, Stamped | "type">

    /** Variants with no props of their own (`started`, `terminated`, …) take no second argument. */
    type RestArg<T extends Event["type"]> =
        {} extends Rest<T> ? [rest?: Rest<T>] : [rest: Rest<T>]

    return function create<T extends Event["type"]>(
        type:      T,
        ...[rest]: RestArg<T>
    ): Unstamped<OfType<T>> {
        return { ...rest, type } as Unstamped<OfType<T>>
    }
}
