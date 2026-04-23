import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { apiKey, maxResults, searchDepth, includeAnswer } = this.fields;

        const retriever = new TavilySearchAPIRetriever({
            apiKey: apiKey || process.env.TAVILY_API_KEY,
            k: maxResults,
            searchDepth: searchDepth as "basic" | "advanced",
            includeGeneratedAnswer: includeAnswer,
        });

        return { retriever };
    }
}
