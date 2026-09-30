import { Document } from "@langchain/core/documents";
import { RuntimeNode, type InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";
import { tavily, type TavilyClient, type TavilyExtractOptions } from "@tavily/core";

import { Blueprint } from "./blueprint";
import { buildTool } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    readonly #tavily: TavilyClient;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.Context) {
        super(nodeId, context);

        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.tavilyApi.blob);

        this.#tavily = tavily({ apiKey });
    }


    private getExtractOptions(): TavilyExtractOptions {
        const fields = this.fieldValues;

        return {
            extractDepth:   fields.extractDepth,
            format:         fields.format,
            includeImages:  fields.includeImages,
            includeFavicon: true,
        };
    }


    protected override async onRun() {
        const fields = this.fieldValues;

        if (fields.isConvertedToTool === true)
            return {
                tool: buildTool(this.#tavily, this.getExtractOptions()),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        const urls = fields.urls
            .map(url => url.trim())
            .filter(url => url.length > 0);

        if (urls.length === 0)
            throw new Error("Tavily Extract: at least one URL is required.");

        const query = fields.query.trim() || undefined;

        const response = await this.#tavily.extract(urls, {
            ...this.getExtractOptions(),
            query,
            chunksPerSource: query ? fields.chunksPerSource : undefined,
        });

        const pages = response.results.map(page =>
            new Document({
                pageContent: page.rawContent,
                metadata: {
                    title:    page.title ?? "",
                    source:   page.url,
                    favicon:  page.favicon ?? null,
                    images:   page.images ?? [],
                    provider: "tavily",
                },
            }),
        );

        return {
            pages,
            failures: response.failedResults,
        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }
}
