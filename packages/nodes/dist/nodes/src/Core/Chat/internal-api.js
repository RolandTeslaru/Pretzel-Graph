"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalChatAPI = void 0;
/**
 * Chat writes from a running execution.
 *
 * The client is passed in — `RuntimeNode.context.internalAPI` — rather than imported,
 * so a node cannot reach an authenticated client by accident. No executionId either:
 * the backend reads it from the execution token, so a node names what it wants written
 * but not whose privileges write it. See SPECS/execution-token-delegation.md.
 */
exports.InternalChatAPI = {
    // persist: store the messages. broadcast: publish message:added on the chat channel.
    // They are independent — Chat.Output broadcasts whether or not it stores.
    messageAdd: (client, chatId, messages, opts) => client.raw.post('/api/internal/chat/message/add', { chatId, messages, ...opts }),
    messageUpdate: (client, chatId, payload) => client.raw.post('/api/internal/chat/message/update', { chatId, ...payload }),
    messageList: (client, chatId) => client.raw.post('/api/internal/chat/message/list', { chatId }),
    messageOverwrite: (client, chatId, messages) => client.raw.post('/api/internal/chat/message/overwrite', { chatId, messages }),
};
