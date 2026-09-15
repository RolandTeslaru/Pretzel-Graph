import { Chat } from "@pretzel-graph/shared/domain";
import type { ChatSDK, ChatSDKImpl } from "./sdk";

export type State = ChatSDK.State;

export function createChatSDKReducers(_sdk: ChatSDKImpl) {
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
            s.messagesRecord[messageId].content += content;
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
