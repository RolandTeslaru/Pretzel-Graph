import { Chat } from "@pretzel-graph/shared/domain";
import { HTTP } from "@pretzel-graph/node-sdk";

/**
 * Chat writes from a running execution.
 *
 * The client is passed in — `RuntimeNode.context.internalAPI` — rather than imported,
 * so a node cannot reach an authenticated client by accident. No executionId either:
 * the backend reads it from the execution token, so a node names what it wants written
 * but not whose privileges write it. See SPECS/execution-token-delegation.md.
 */
export const InternalChatAPI = {

    // persist: store the messages. broadcast: publish message:added on the chat channel.
    // They are independent — Chat.Output broadcasts whether or not it stores.
    messageAdd: (
        client: HTTP.Client,
        chatId: Chat.Id,
        messages: Chat.Message[],
        opts?: { persist?: boolean; broadcast?: boolean },
    ) =>
        client.raw.post('/api/internal/chat/message/add', { chatId, messages, ...opts }),

    messageUpdate: (client: HTTP.Client, chatId: Chat.Id, payload: Chat.API.Message.Update.Request) =>
        client.raw.post('/api/internal/chat/message/update', { chatId, ...payload }),

    messageList: (client: HTTP.Client, chatId: Chat.Id) =>
        client.raw.post<{ messages: Chat.Message[] }>('/api/internal/chat/message/list', { chatId }),

    messageOverwrite: (client: HTTP.Client, chatId: Chat.Id, messages: Chat.Message[]) =>
        client.raw.post('/api/internal/chat/message/overwrite', { chatId, messages }),
};
