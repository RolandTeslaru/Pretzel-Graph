import axios from "axios";
import { Document } from "@langchain/core/documents";
import { tool } from "@langchain/core/tools";
import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";

import { Blueprint, ToolBlueprint } from "./blueprint";

type GoogleSearchType = "web" | "image";
type GoogleSafeSearch = "off" | "active";

type GoogleCustomSearchItem = {
    title?: string;
    link?: string;
    snippet?: string;
    displayLink?: string;
    mime?: string;
    fileFormat?: string;
    image?: {
        contextLink?: string;
        thumbnailLink?: string;
        height?: number;
        width?: number;
    };
    pagemap?: Record<string, unknown>;
};

type GoogleCustomSearchResponse = {
    items?: GoogleCustomSearchItem[];
    searchInformation?: {
        totalResults?: string;
        searchTime?: number;
    };
};

function clampMaxResults(maxResults: number) {
    return Math.min(Math.max(maxResults || 5, 1), 10);
}

function itemToDocument(item: GoogleCustomSearchItem, index: number, query: string, searchType: GoogleSearchType) {
    const title = item.title ?? "";
    const link = item.link ?? "";
    const snippet = item.snippet ?? "";
    const source = searchType === "image" ? item.image?.contextLink ?? link : link;

    return new Document({
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

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    public readonly Blueprint = Blueprint;

    private async search(query: string) {
        const { apiKey, searchEngineId } = this.context.credentialsAPI.getDecryptedValue(this.credentials.googleSearchApi.blob);

        if (!apiKey)
            throw new Error("Google Search: API key is required.");
        if (!searchEngineId)
            throw new Error("Google Search: Search Engine ID is required.");

        const searchType = this.fieldValues.searchType as GoogleSearchType;
        const safeSearch = this.fieldValues.safeSearch as GoogleSafeSearch;
        const num = clampMaxResults(this.fieldValues.maxResults);

        const response = await axios.get<GoogleCustomSearchResponse>("https://www.googleapis.com/customsearch/v1", {
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

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const documents = await this.search(incoming.query);

        return { documents };
    }

    protected override async onBuildTool(
        incoming: InferIncoming<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        return {
            tool: tool(
                async ({ query }) => {
                    const documents = await this.search(query);
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
                    name: "google_search",
                    description: "Searches the web using Google Custom Search API.",
                    schema: z.object({
                        query: z.string().describe("The search query to run against the Google Custom Search API."),
                    }),
                    responseFormat: "content_and_artifact",
                },
            ),
        };
    }
}
