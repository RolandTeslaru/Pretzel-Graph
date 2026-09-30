import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import type { TavilyClient, TavilyExtractOptions } from "@tavily/core";
import { z } from "zod/v3";


export function buildTool(
    tavily:  TavilyClient,
    options: TavilyExtractOptions,
) {
    return tool(
        async ({ urls, query }) => {
            const response = await tavily.extract(urls, {
                ...options,
                query,
            });

            return ToolBudget.value({
                pages: response.results.map(page => ({
                    url:     page.url,
                    title:   page.title,
                    content: page.rawContent,
                })),

                failures: response.failedResults.length > 0 ? response.failedResults : undefined,
            }, {
                hint: "Pass fewer urls, or a query to keep only the relevant parts of each page.",
            });
        },
        {
            name:        "tavily_extract",
            description: "Reads web pages and returns their main content. Use it to get the full text behind search results.",
            schema: z.object({
                urls:  z.array(z.string()).min(1).max(20).describe("Page urls to read."),
                query: z.string().optional()
                    .describe("Optional: keep only the parts of each page relevant to this text. Use it for long pages."),
            }),
        },
    );
}
