"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const blueprint_1 = require("./blueprint");
const node_sdk_2 = require("../../../../../node-sdk/src/index.js");
const domain_1 = require("../../../../../shared/domain");
const internal_api_1 = require("../internal-api");
class Node extends node_sdk_2.RuntimeNode {
    static Blueprint = blueprint_1.Blueprint;
    async onRun(incoming) {
        const { overwrite, append } = incoming;
        const chatId = domain_1.Chat.Id.parse(this.fieldValues.chat_id);
        if (overwrite) {
            const messages = overwrite.map(msg => node_sdk_1.Synthesizer.lcToChatMessage(msg));
            await internal_api_1.InternalChatAPI.messageOverwrite(this.context.internalAPI, chatId, messages);
            return { history: overwrite };
        }
        else if (append) {
            const messages = append.map(msg => node_sdk_1.Synthesizer.lcToChatMessage(msg));
            await internal_api_1.InternalChatAPI.messageAdd(this.context.internalAPI, chatId, messages);
        }
        const { data } = await internal_api_1.InternalChatAPI.messageList(this.context.internalAPI, chatId);
        return {
            history: (data?.messages ?? []).map(msg => node_sdk_1.Synthesizer.chatMessageToLC(msg)),
        };
    }
}
exports.Node = Node;
