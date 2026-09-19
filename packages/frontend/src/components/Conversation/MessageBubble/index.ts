import Human from './Human'
import AI from './AI'
import Tool from './Tool'
import { Chat } from '@pretzel-graph/shared/domain'

export const MessageBubble = { Human, AI, Tool }

export namespace MessageBubble {
    export type ToolCallStatusRecord = Record<Chat.ToolCall.Id, Chat.ToolCall.Status>
}
