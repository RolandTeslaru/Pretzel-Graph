import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint, ToolBlueprint } from "./blueprint";
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";
import { tool } from "@langchain/core/tools";
import { Workflow } from "@vx-agent-editor/shared/domain";
import { z } from "zod/v3";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    public readonly Blueprint = Blueprint;

    private retriever: TavilySearchAPIRetriever;

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
        const { apiKey, maxResults, searchDepth, includeAnswer } = this.fields;
    
        this.retriever = new TavilySearchAPIRetriever({
            apiKey: apiKey || process.env.TAVILY_API_KEY,
            k: maxResults,
            searchDepth: searchDepth as "basic" | "advanced",
            includeGeneratedAnswer: includeAnswer,
        });
    }


    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const documents = await this.retriever._getRelevantDocuments(inputs.query);

        return { documents };
    }


    protected override async onBuildTool(
        inputs: InferInputs<typeof ToolBlueprint>,
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
