"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const messages_1 = require("@langchain/core/messages");
const domain_1 = require("../../../../../shared/domain");
const internal_api_1 = require("../internal-api");
class Node extends node_sdk_1.RuntimeNode {
    static WEBHOOK_PATH = "chat";
    static WEBHOOK_TIMEOUT = 120_000; // 2 minutes
    message = null;
    onIgniter(igniter) {
        if (igniter.variant === "chat_message")
            this.message = igniter.message;
    }
    async onRun() {
        if (!this.message)
            return {};
        const chatId = domain_1.Chat.Id.parse(this.fieldValues.chat_id);
        if (this.fieldValues.write_to_session)
            await internal_api_1.InternalChatAPI.messageAdd(this.context.internalAPI, chatId, [this.message]);
        const msg = new messages_1.HumanMessage({ content: this.message.content });
        return { response: msg };
    }
    // Registering the route is what invites the reply, so it runs inside awaitSignalAfter —
    // the waiter is already in place when the first message can arrive.
    async waitForMessage() {
        const { workflowId } = this.context;
        const signal = await this.context.realtimeAPI.awaitSignalAfter(
        // @ts-expect-error TODO: Chat.Signal not defined yet
        domain_1.Chat.Signal.MessageSent.Schema, () => true, Node.WEBHOOK_TIMEOUT, () => domain_1.Webhook.Test.API.register(this.context.internalAPI.raw, { workflowId, path: Node.WEBHOOK_PATH, method: "POST", timeoutMs: Node.WEBHOOK_TIMEOUT }).then(() => { }));
        return new messages_1.HumanMessage({
            // @ts-expect-error TODO: Chat.Signal not defined yet
            content: signal.message.content,
        });
    }
}
exports.Node = Node;
