import Human from './Human'
import AI from './AI'
import ToolCall from './ToolCall'
import { Chat } from '@pretzel-graph/shared/domain'

export const MessageBubble = { Human, AI, ToolCall }

export namespace MessageBubble {
    export type ToolCallStatusRecord = Record<Chat.ToolCall.Id, Chat.ToolCall.Status>
}
