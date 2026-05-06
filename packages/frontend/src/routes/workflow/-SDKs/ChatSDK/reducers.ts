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
        },
        appendContent: (s, messageId, content) => {
            s.messagesRecord[messageId].content += content;
        },
    } satisfies ChatSDKReducers;
}

export interface ChatSDKReducers {
    upsertMessage: (state: State, message: Chat.Message) => void
    appendContent: (state: State, messageId: Chat.Message.Id, content: string) => void
}
