import { Assistant } from "@pretzel-graph/shared/domain";
import type { AssistantSDK, AssistantSDKImpl } from "./sdk";

export type State = AssistantSDK.State;

export function createAssistantSDKReducers(_sdk: AssistantSDKImpl) {
    return {
        upsertMessage: (s, message) => {
            if (!s.messagesRecord[message.id]) {
                s.messages.push(message.id);
            }
            s.messagesRecord[message.id] = message;
        },
        appendContent: (s, messageId, content) => {
            const msg = s.messagesRecord[messageId];
            if (msg) msg.content += content;
        },
    } satisfies AssistantSDKReducers;
}

export interface AssistantSDKReducers {
    upsertMessage: (state: State, message: Assistant.Message) => void
    appendContent: (state: State, messageId: Assistant.Message.Id, content: string) => void
}
