import { z } from "zod"

export namespace Realtime {
    export namespace Topic {
        // Examples:
        // job:abc-123:events
        // workflow:wf-001:changes 
        export const Id = z.string().brand("topicId")
        export type Id = z.infer<typeof Id>
    }

    export namespace Event {
        export const Type = z.string()
        export type Type = z.infer<typeof Type>
        export const Base = z.object({
            topicId: Topic.Id,
            type: Type,
            payload: z.unknown(),
            timestamp: z.number().default(Date.now()),
        })
    }
    export type Event = z.infer<typeof Event.Base>
} 