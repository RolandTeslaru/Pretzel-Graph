import { z } from "zod"
import { Orchestrator } from "./Orchestrator"

export namespace Realtime {
    export const Topic = z.string().brand("topicId");
    export type Topic = z.infer<typeof Topic>

    export namespace Event {
        export const Type = z.string()
        export type Type = z.infer<typeof Type>
        export const Base = z.object({
            topic: Topic,
            type: Type,
        })
    }
    export type Event = z.infer<typeof Event.Base>
} 