import { z } from "zod"
import { Orchestrator } from "./Orchestrator"

export namespace Realtime {
    export const Channel = z.string().brand("Channel");
    export type Channel = z.infer<typeof Channel>

    export namespace Event {
        export const Type = z.string()
        export type Type = z.infer<typeof Type>
        
        export const Base = z.object({
            channel: Channel,
            type: Type,
        })

        export namespace Forbidden {
            export const Schema = Base.extend({
                type: z.literal("forbidden"),
                message: z.string(),
            })
            export type Type = z.infer<typeof Schema>
        }
        export type Forbidden = z.infer<typeof Forbidden.Schema>
    }
    export type Event = z.infer<typeof Event.Base>

    export namespace Signal {
        export const Type = z.string()
        export type Type = z.infer<typeof Type>
        export const Base = z.object({
            channel: Channel,
            type: Type,
        })
    }
    export type Signal = z.infer<typeof Signal.Base>
} 