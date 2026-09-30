import z from "zod"
import { Consultation as ConsultationModule } from "../Consultation"
import { Message } from "./message"

export namespace Consultation {

    export const Variant = ConsultationModule.variant("chat:message")

    // Node → user: park the run until a chat message arrives.
    export const Request = ConsultationModule.Request.extend({
        variant: z.literal(Variant),
    })
    export type Request = z.infer<typeof Request>

    // User → node: the message that answers it.
    export const Answer = ConsultationModule.Answer.extend({
        variant: z.literal(Variant),
        message: Message.Human,
    })
    export type Answer = z.infer<typeof Answer>
}
