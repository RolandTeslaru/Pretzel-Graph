import { Chat } from "@pretzel-graph/shared/domain";

// The message slice any conversation store keeps.
export type State = {
    messages:       Chat.Message.Id[],
    messagesRecord: Record<Chat.Message.Id, Chat.Message>,
    toolCallStatus: Record<Chat.ToolCall.Id, Chat.ToolCall.Status>,
}

export function createChatSDKReducers() {
    return {
        upsertMessage: (s, message) => {
            if (!s.messagesRecord[message.id]) {
                s.messages.push(message.id);
            }
            s.messagesRecord[message.id] = message;

            if (message.role === "tool") {
                s.toolCallStatus[message.data.tool_call_id] = message.data.status;
            }
        },
        appendContent: (s, messageId, content) => {
            const message = s.messagesRecord[messageId];

            if (message)
                message.content += content;
        },
        resetMessages: (s) => {
            s.messages = [];
            s.messagesRecord = {};
            s.toolCallStatus = {};
        },
    } satisfies ChatSDKReducers;
}

export interface ChatSDKReducers {
    upsertMessage: (state: State, message: Chat.Message) => void
    appendContent: (state: State, messageId: Chat.Message.Id, content: string) => void
    resetMessages: (state: State) => void
}
