import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint, ToolBlueprint } from "./blueprint";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";
import { tool } from "@langchain/core/tools";
import { Workflow } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    private retriever: TavilySearchAPIRetriever;

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.tavilyApi.blob);
        const { maxResults, searchDepth, includeAnswer } = this.fieldValues;

        this.retriever = new TavilySearchAPIRetriever({
            apiKey,
            k: maxResults,
            searchDepth: searchDepth as "basic" | "advanced",
            includeGeneratedAnswer: includeAnswer,
        });
    }

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const documents = await this.retriever._getRelevantDocuments(incoming.query);

        return { documents };
    }

    protected override async onBuildTool(
        incoming: InferIncoming<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        return {
            tool: tool(
                async ({ query }) => {
                    const documents = await this.retriever._getRelevantDocuments(query);
                    const content = documents
                        .map((d, i) => {
                            const title = d.metadata?.title ?? "";
                            const source = d.metadata?.source ?? "";
                            return `[${i + 1}] ${title}\n${source}\n${d.pageContent}`;
                        })
                        .join("\n\n");
                    return [content, documents];
                },
                {
                    name: "tavily_search",
                    description: `Searches the web using Tavily Search API.`,
                    schema: z.object({
                        query: z.string().describe("The search query to run against the Tavily Search API."),
                    }),
                    responseFormat: "content_and_artifact",
                }
            )
        };
    }
}
