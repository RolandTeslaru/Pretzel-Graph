import z from "zod"
import { ChatSchema } from "./chat"
import * as MessageMod from "./message"
import * as EventMod from "./event"
import * as ApiMod from "./api"
import { ChatId, createId as createChatId } from "./ids"

export namespace Chat {

    export const Id = ChatId
    export type Id = ChatId
    export const createId = createChatId

    export import Attachment    = MessageMod.Attachment
    export import ToolCall      = MessageMod.ToolCall
    export import UsageMetadata = MessageMod.UsageMetadata
    export import Message       = MessageMod.Message

    export const Schema = ChatSchema

    export import Event = EventMod.Event
    export import API   = ApiMod.API
}
export type Chat = z.infer<typeof Chat.Schema>
