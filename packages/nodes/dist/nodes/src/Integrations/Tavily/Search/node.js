"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const tavily_search_api_1 = require("@langchain/community/retrievers/tavily_search_api");
const tools_1 = require("@langchain/core/tools");
const v3_1 = require("zod/v3");
class Node extends node_sdk_1.RuntimeNode {
    retriever;
    constructor(nodeId, context) {
        super(nodeId, context);
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.tavilyApi.blob);
        const { maxResults, searchDepth, includeAnswer } = this.fieldValues;
        this.retriever = new tavily_search_api_1.TavilySearchAPIRetriever({
            apiKey,
            k: maxResults,
            searchDepth: searchDepth,
            includeGeneratedAnswer: includeAnswer,
        });
    }
    async onRun() {
        const fields = this.fieldValues;
        if (fields.isConvertedToTool === true)
            return {
                tool: (0, tools_1.tool)(async ({ query }) => {
                    const documents = await this.retriever._getRelevantDocuments(query);
                    const content = documents
                        .map((document, index) => {
                        const title = document.metadata?.title ?? "";
                        const source = document.metadata?.source ?? "";
                        return `[${index + 1}] ${title}\n${source}\n${document.pageContent}`;
                    })
                        .join("\n\n");
                    return [content, documents];
                }, {
                    name: "tavily_search",
                    description: "Searches the web using Tavily Search API.",
                    schema: v3_1.z.object({
                        query: v3_1.z.string().describe("The search query to run against the Tavily Search API."),
                    }),
                    responseFormat: "content_and_artifact",
                }),
            };
        const documents = await this.retriever._getRelevantDocuments(fields.query);
        return { documents };
    }
}
exports.Node = Node;
