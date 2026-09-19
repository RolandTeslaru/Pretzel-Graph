import Human from './Human'
import AI from './AI'
import ToolCall from './ToolCall'

export const MessageBubble = { Human, AI, ToolCall }

export namespace MessageBubble {
    export type ToolCallStatus = "success" | "error"
    export type ToolCallStatusRecord = Record<string, ToolCallStatus>
}
