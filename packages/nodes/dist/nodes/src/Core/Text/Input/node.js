"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const messages_1 = require("@langchain/core/messages");
class Node extends node_sdk_1.RuntimeNode {
    async onRun() {
        const { text } = this.fieldValues;
        return {
            output: new messages_1.HumanMessage(text)
        };
    }
}
exports.Node = Node;
