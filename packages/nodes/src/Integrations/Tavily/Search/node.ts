import { Document } from "@langchain/core/documents";
import { RuntimeNode, type InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";
import { tavily, type TavilyClient, type TavilySearchOptions } from "@tavily/core";

import { Blueprint } from "./blueprint";
import { buildTool } from "./tools";


type TavilySearchResult = Awaited<ReturnType<TavilyClient["search"]>>["results"][number];


const getDocumentForSearchResult = (result: TavilySearchResult, index: number, query: string) =>
    new Document({
        pageContent: result.rawContent ?? result.content,
        metadata: {
            title:         result.title,
            source:        result.url,
            snippet:       result.content,
            score:         result.score,
            publishedDate: result.publishedDate ?? null,
            favicon:       result.favicon ?? null,
            images:        result.images ?? [],
            rank:          index + 1,
            query,
            provider:      "tavily",
        },
    });


export class Node extends RuntimeNode<typeof Blueprint> {

    readonly #tavily: TavilyClient;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.Context) {
        super(nodeId, context);

        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.tavilyApi.blob);

        this.#tavily = tavily({ apiKey });
    }


    private getSearchOptions(): TavilySearchOptions {
        const fields = this.fieldValues;

        return {
            searchDepth:              fields.searchDepth,
            maxResults:               fields.maxResults,
            includeAnswer:            fields.answerMode === "off" ? false : fields.answerMode,
            includeRawContent:        fields.rawContent === "off" ? false : fields.rawContent,
            includeImages:            fields.includeImages,
            includeImageDescriptions: fields.includeImages,
            includeDomains:           fields.includeDomains,
            excludeDomains:           fields.excludeDomains,
            exactMatch:               fields.exactMatch,
            safe_search:              fields.safeSearch,
            includeFavicon:           true,
            include_published_date:   true,
        };
    }


    protected override async onRun() {
        const fields = this.fieldValues;

        if (fields.isConvertedToTool === true)
            return {
                tool: buildTool(this.#tavily, this.getSearchOptions()),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        const hasDateRange = Boolean(fields.dateRange?.from || fields.dateRange?.to);

        const response = await this.#tavily.search(fields.query, {
            ...this.getSearchOptions(),
            topic:     fields.topic,
            timeRange: hasDateRange || fields.timeRange === "any"
                ? undefined
                : fields.timeRange,
            startDate: fields.dateRange?.from,
            endDate:   fields.dateRange?.to,
            country:   fields.topic === "general" && fields.country
                ? fields.country
                : undefined,
            chunksPerSource: fields.searchDepth === "advanced"
                ? fields.chunksPerSource
                : undefined,
        });

        const documents = response.results.map((result, index) => getDocumentForSearchResult(result, index, fields.query));
        const images    = response.images;

        if (fields.answerMode === "off") {

            if (fields.includeImages === true)
                return {
                    documents,
                    images,
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            return {
                documents,
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        const answer = response.answer ?? "";

        if (fields.includeImages === true)
            return {
                documents,
                answer,
                images,
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        return {
            documents,
            answer,
        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }
}
