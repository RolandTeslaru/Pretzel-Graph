"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const tavily_search_api_1 = require("@langchain/community/retrievers/tavily_search_api");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.tavilyApi.blob);
        const { maxResults, searchDepth, includeAnswer } = this.fieldValues;
        const retriever = new tavily_search_api_1.TavilySearchAPIRetriever({
            apiKey,
            k: maxResults,
            searchDepth: searchDepth,
            includeGeneratedAnswer: includeAnswer,
        });
        return { retriever };
    }
}
exports.Node = Node;
