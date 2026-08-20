"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
const messages_1 = require("@langchain/core/messages");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(_incoming) {
        const fields = this.fieldValues;
        switch (fields.role) {
            case "Human":
                return { message: new messages_1.HumanMessage(fields.content) };
            case "System":
                return { message: new messages_1.SystemMessage(fields.content) };
            case "Tool": {
                if (!fields.toolCallId)
                    throw new Error("Tool Call ID is required for Tool messages");
                return {
                    message: new messages_1.ToolMessage({
                        content: fields.content,
                        tool_call_id: fields.toolCallId,
                    }),
                };
            }
        }
    }
}
exports.Node = Node;
