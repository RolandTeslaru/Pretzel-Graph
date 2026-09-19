import z from "zod"
import { Realtime } from "../Realtime"
import { ChatId } from "./ids"
import { Message as MessageD } from "./message"

export namespace Event {
    export const Channel = Realtime.Channel.brand("ChatChannel");
    export type Channel = z.infer<typeof Channel>

    export function getChannel(chatId: ChatId) {
        return `chat:${chatId}` as Channel
    }

    const Base = Realtime.Event.Base.extend({
        chatId: ChatId,
    })

    export namespace Message {
        export namespace Added {
            export const Schema = Base.extend({
                type: z.literal("message:added"),
                messages: z.array(MessageD.Schema),
            })
        }
        export type Added = z.infer<typeof Schema>

        export namespace Updated {
            export const Schema = Base.extend({
                type: z.literal("message:updated"),
                message: MessageD.Schema,
            })
        }
        export type Updated = z.infer<typeof Schema>

        export namespace Erased {
            export const Schema = Base.extend({
                type: z.literal("message:erased"),
                messageId: MessageD.Id,
            })
        }
        export type Erased = z.infer<typeof Schema>
    }


    export const Schema = z.discriminatedUnion("type", [
        Message.Added.Schema,
        Message.Updated.Schema,
        Message.Erased.Schema,
    ])
}
export type Event = z.infer<typeof Event.Schema>
