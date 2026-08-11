import { z } from "zod"
import { Field } from "./Foundations/Field"
import { Consultation } from "./Consultation"

// Human-in-the-loop gate, bolted onto Consultation. The node fires, consultationAPI parks it
// and mirrors the request onto the session, the workbench renders a card, and the human's
// Resolution travels back on Consultation.Signal.Responded to resume the run.
//
// No events, signals or API of its own — Consultation owns all three.
export namespace HumanReview {

    export const Id = Consultation.Id.brand("HumanReview.Id")
    export type Id = z.infer<typeof Id>

    // Variant tags are namespaced: Consultation.Variant is an open registry shared with every
    // other consulting node, so a bare "confirm" would be free to collide.
    export const Variant = {
        Confirm: Consultation.variant("human-review:confirm"),
        Choice:  Consultation.variant("human-review:choice"),
        Form:    Consultation.variant("human-review:form"),
    } as const

    // ─── Request ────────────────────────────────────────────────────────────
    // Node → human.
    export namespace Request {

        const Base = Consultation.Request.extend({
            id:        Id,
            title:     z.string().optional(),
            message:   z.string().optional(),
            timeoutMs: z.number().default(24 * 60 * 60_000),
        })

        // Approve / Reject → 2 ports (approved | rejected)
        export const Confirm = Base.extend({
            variant:      z.literal(Variant.Confirm),
            approveLabel: z.string().default("Approve"),
            rejectLabel:  z.string().default("Reject"),
        })

        // Pick one option, or many if multiple (+ optional custom) + Send → 1 Data port
        export const Choice = Base.extend({
            variant:     z.literal(Variant.Choice),
            options:     z.array(z.object({ label: z.string(), value: z.string() })),
            multiple:    z.boolean().default(false),
            allowCustom: z.boolean().default(false),
            sendLabel:   z.string().default("Send"),
        })

        // Form → 1 Data port. Reuses Foundations/Field so the existing FieldRenderer drives it.
        export const Form = Base.extend({
            variant:   z.literal(Variant.Form),
            fields:    z.array(Field.Schema),
            sendLabel: z.string().default("Send"),
        })

        export const Schema = z.discriminatedUnion("variant", [Confirm, Choice, Form])
    }
    export type Request = z.infer<typeof Request.Schema>

    // ─── Resolution ─────────────────────────────────────────────────────────
    // Human → node. Resumes the parked run.
    export namespace Resolution {

        const Base = Consultation.Resolution.extend({
            requestId: HumanReview.Id,
        })

        // approved drives the approved/rejected port split
        export const Confirm = Base.extend({
            variant:  z.literal(Variant.Confirm),
            approved: z.boolean(),
        })

        // chosen (or custom) values → Data port. Single choice = one-element array.
        export const Choice = Base.extend({
            variant: z.literal(Variant.Choice),
            values:  z.array(z.string()),
        })

        // collected field values → Data port
        export const Form = Base.extend({
            variant: z.literal(Variant.Form),
            values:  z.record(z.string(), z.any()),
        })

        export const Schema = z.discriminatedUnion("variant", [Confirm, Choice, Form])
    }
    export type Resolution = z.infer<typeof Resolution.Schema>
}
