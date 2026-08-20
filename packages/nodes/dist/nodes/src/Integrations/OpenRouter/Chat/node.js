"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const blueprint_1 = require("./blueprint");
const openrouter_1 = require("@langchain/openrouter");
function selectedModel(fields) {
    switch (fields.provider) {
        case "Anthropic": return fields.anthropicModel;
        case "Google": return fields.googleModel;
        case "OpenAI": return fields.openAIModel;
        case "Meta": return fields.metaModel;
        case "DeepSeek": return fields.deepSeekModel;
        case "Mistral": return fields.mistralModel;
        case "Cohere": return fields.cohereModel;
        case "xAI": return fields.xaiModel;
    }
}
class Node extends node_sdk_1.RuntimeNode {
    static Blueprint = blueprint_1.Blueprint;
    llm;
    constructor(nodeId, context) {
        super(nodeId, context);
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.openRouterApi.blob);
        const fields = this.fieldValues;
        this.llm = new openrouter_1.ChatOpenRouter({
            model: selectedModel(fields),
            temperature: fields.temperature,
            ...(typeof fields.maxTokens === "number" ? { maxTokens: fields.maxTokens } : {}),
            topP: fields.topP,
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
