"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const blueprint_1 = require("./blueprint");
const google_genai_1 = require("@langchain/google-genai");
class Node extends node_sdk_1.RuntimeNode {
    static Blueprint = blueprint_1.Blueprint;
    llm;
    constructor(nodeId, context) {
        super(nodeId, context);
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.googleGeminiApi.blob);
        const thinkingBudget = this.fieldValues.thinkingBudget;
        const maxOutputTokens = this.fieldValues.maxOutputTokens;
        this.llm = new google_genai_1.ChatGoogleGenerativeAI({
            model: this.fieldValues.model,
            temperature: this.fieldValues.temperature,
            ...(typeof maxOutputTokens === "number" ? { maxOutputTokens } : {}),
            topP: this.fieldValues.topP,
            topK: this.fieldValues.topK,
            // Omit thinkingConfig for legacy nodes saved before this field existed
            // (thinkingBudget === undefined) so the model keeps its default behavior.
            ...(typeof thinkingBudget === "number" ? { thinkingConfig: { thinkingBudget } } : {}),
            apiKey
        });
    }
    async onRun(incoming) {
        return {
            languageModel: this.llm
        };
    }
}
exports.Node = Node;
