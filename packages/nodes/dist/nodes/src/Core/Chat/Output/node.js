"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const node_sdk_2 = require("../../../../../node-sdk/src/index.js");
const domain_1 = require("../../../../../shared/domain");
const internal_api_1 = require("../internal-api");
class Node extends node_sdk_2.RuntimeNode {
    constructor(nodeId, context) {
        super(nodeId, context);
    }
    async onRun(incoming) {
        const { messages: lcMessages } = incoming;
        const chatId = domain_1.Chat.Id.parse(this.fieldValues.chat_id);
        const messages = lcMessages.map(lcMsg => node_sdk_1.Synthesizer.lcToChatMessage(lcMsg));
        // chat_id is a user-editable field, so the backend owns both the ownership check and
        // the broadcast — this node never publishes to a chat channel directly.
        await internal_api_1.InternalChatAPI.messageAdd(this.context.internalAPI, chatId, messages, { persist: this.fieldValues.write_to_session, broadcast: true });
        return {};
    }
}
exports.Node = Node;
