"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const blueprint_1 = require("./blueprint");
const anthropic_1 = require("@langchain/anthropic");
class Node extends node_sdk_1.RuntimeNode {
    static Blueprint = blueprint_1.Blueprint;
    llm;
    constructor(nodeId, context) {
        super(nodeId, context);
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.anthropicApi.blob);
        this.llm = new anthropic_1.ChatAnthropic({
            model: this.fieldValues.model,
            ...(typeof this.fieldValues.maxTokens === "number" ? { maxTokens: this.fieldValues.maxTokens } : {}),
            apiKey,
        });
    }
    async onRun(incoming) {
        return {
            languageModel: this.llm
        };
    }
}
exports.Node = Node;
