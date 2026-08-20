"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const axios_1 = __importDefault(require("axios"));
const documents_1 = require("@langchain/core/documents");
const tools_1 = require("@langchain/core/tools");
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const v3_1 = require("zod/v3");
function clampMaxResults(maxResults) {
    return Math.min(Math.max(maxResults || 5, 1), 10);
}
function itemToDocument(item, index, query, searchType) {
    const title = item.title ?? "";
    const link = item.link ?? "";
    const snippet = item.snippet ?? "";
    const source = searchType === "image" ? item.image?.contextLink ?? link : link;
    return new documents_1.Document({
        pageContent: snippet || title || link,
        metadata: {
            title,
            source,
            link,
            displayLink: item.displayLink,
            snippet,
            rank: index + 1,
            query,
            provider: "google_custom_search",
            searchType,
            mime: item.mime,
            fileFormat: item.fileFormat,
            image: item.image,
            pagemap: item.pagemap,
        },
    });
}
class Node extends node_sdk_1.RuntimeNode {
    async search(query) {
        const { apiKey, searchEngineId } = this.context.credentialsAPI.getDecryptedValue(this.credentials.googleSearchApi.blob);
        if (!apiKey)
            throw new Error("Google Search: API key is required.");
        if (!searchEngineId)
            throw new Error("Google Search: Search Engine ID is required.");
        const searchType = this.fieldValues.searchType;
        const safeSearch = this.fieldValues.safeSearch;
        const num = clampMaxResults(this.fieldValues.maxResults);
        const response = await axios_1.default.get("https://www.googleapis.com/customsearch/v1", {
            params: {
                key: apiKey,
                cx: searchEngineId,
                q: query,
                num,
                safe: safeSearch,
                ...(searchType === "image" ? { searchType: "image" } : {}),
            },
        });
        return (response.data.items ?? []).map((item, index) => itemToDocument(item, index, query, searchType));
    }
    async onRun() {
        const fields = this.fieldValues;
        if (fields.isConvertedToTool === true)
            return {
                tool: (0, tools_1.tool)(async ({ query }) => {
                    const documents = await this.search(query);
                    const content = documents
                        .map((document, index) => {
                        const title = document.metadata?.title ?? "";
                        const source = document.metadata?.source ?? "";
                        return `[${index + 1}] ${title}\n${source}\n${document.pageContent}`;
                    })
                        .join("\n\n");
                    return [content, documents];
                }, {
                    name: "google_search",
                    description: "Searches the web using Google Custom Search API.",
                    schema: v3_1.z.object({
                        query: v3_1.z.string().describe("The search query to run against the Google Custom Search API."),
                    }),
                    responseFormat: "content_and_artifact",
                }),
            };
        const documents = await this.search(fields.query);
        return { documents };
    }
}
exports.Node = Node;
