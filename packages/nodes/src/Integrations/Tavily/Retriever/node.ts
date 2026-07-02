import { RegisterNode, RuntimeNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.tavilyApi.blob);
        const { maxResults, searchDepth, includeAnswer } = this.fieldValues;

        const retriever = new TavilySearchAPIRetriever({
            apiKey,
            k: maxResults,
            searchDepth: searchDepth as "basic" | "advanced",
            includeGeneratedAnswer: includeAnswer,
        });

        return { retriever };
    }
}
