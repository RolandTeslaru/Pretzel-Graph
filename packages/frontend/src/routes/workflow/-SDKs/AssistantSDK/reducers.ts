import { Chat } from "@pretzel-graph/shared/domain";
import type { AssistantSDK, AssistantSDKImpl } from "./sdk";

export type State = AssistantSDK.State;

export function createAssistantSDKReducers(_sdk: AssistantSDKImpl) {
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
            const msg = s.messagesRecord[messageId];
            if (msg) msg.content += content;
        },
        resetMessages: (s) => {
            s.messages = [];
            s.messagesRecord = {};
            s.toolCallStatus = {};
        },
    } satisfies AssistantSDKReducers;
}

export interface AssistantSDKReducers {
    upsertMessage: (state: State, message: Chat.Message) => void
    appendContent: (state: State, messageId: Chat.Message.Id, content: string) => void
    resetMessages: (state: State) => void
}
