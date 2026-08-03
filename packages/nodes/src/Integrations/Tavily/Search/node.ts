import {
    InferOutputs,
    RegisterNode,
    RuntimeNode,
} from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";
import { tool } from "@langchain/core/tools";
import { Workflow } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    private retriever: TavilySearchAPIRetriever;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.tavilyApi.blob);
        const { maxResults, searchDepth, includeAnswer } = this.fieldValues;

        this.retriever = new TavilySearchAPIRetriever({
            apiKey,
            k: maxResults,
            searchDepth: searchDepth as "basic" | "advanced",
            includeGeneratedAnswer: includeAnswer,
        });
    }

    protected override async onRun() {
        const fields = this.fieldValues;

        if (fields.isConvertedToTool === true)
            return {
                tool: tool(
                    async ({ query }) => {
                        const documents = await this.retriever._getRelevantDocuments(query);
                        const content = documents
                            .map((document, index) => {
                                const title  = document.metadata?.title ?? "";
                                const source = document.metadata?.source ?? "";
                                return `[${index + 1}] ${title}\n${source}\n${document.pageContent}`;
                            })
                            .join("\n\n");

                        return [content, documents];
                    },
                    {
                        name:        "tavily_search",
                        description: "Searches the web using Tavily Search API.",
                        schema: z.object({
                            query: z.string().describe("The search query to run against the Tavily Search API."),
                        }),
                        responseFormat: "content_and_artifact",
                    },
                ),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        const documents = await this.retriever._getRelevantDocuments(fields.query);

        return { documents } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }
}
