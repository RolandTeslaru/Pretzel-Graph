"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const blueprint_1 = require("./blueprint");
const openai_1 = require("@langchain/openai");
class Node extends node_sdk_1.RuntimeNode {
    static Blueprint = blueprint_1.Blueprint;
    llm;
    constructor(nodeId, context) {
        super(nodeId, context);
        const { maxTokens, ...fieldValues } = this.fieldValues;
        this.llm = new openai_1.ChatOpenAI({
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
