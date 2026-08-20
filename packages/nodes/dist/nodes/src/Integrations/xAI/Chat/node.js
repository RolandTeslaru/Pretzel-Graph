"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const blueprint_1 = require("./blueprint");
const xai_1 = require("@langchain/xai");
class Node extends node_sdk_1.RuntimeNode {
    static Blueprint = blueprint_1.Blueprint;
    llm;
    constructor(nodeId, context) {
        super(nodeId, context);
        const { maxTokens, ...fieldValues } = this.fieldValues;
        this.llm = new xai_1.ChatXAI({
            ...fieldValues,
            ...(typeof maxTokens === "number" ? { maxTokens } : {}),
        });
    }
    async onRun(incoming) {
        return {
            languageModel: this.llm
        };
    }
}
exports.Node = Node;
