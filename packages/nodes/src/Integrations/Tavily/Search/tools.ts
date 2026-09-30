import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import type { TavilyClient, TavilySearchOptions } from "@tavily/core";
import { z } from "zod/v3";


export function buildTool(
    tavily:  TavilyClient,
    options: TavilySearchOptions,
) {
    return tool(
        async ({ query, topic, timeRange }) => {
            const response = await tavily.search(query, {
                ...options,
                topic,
                timeRange: timeRange === "any" ? undefined : timeRange,
            });

            return ToolBudget.value({
                answer: response.answer,

                results: response.results.map(result => ({
                    title:         result.title,
                    url:           result.url,
                    publishedDate: result.publishedDate,
                    content:       result.rawContent ?? result.content,
                })),

                images: response.images.length > 0 ? response.images : undefined,
            }, {
                hint: "Ask for fewer results or switch off full page content.",
            });
        },
        {
            name:        "tavily_search",
            description: "Searches the web with Tavily and returns ranked results with their url, title, publish date and content.",
            schema: z.object({
                query:     z.string().describe("The search query."),
                topic:     z.enum(["general", "news", "finance"]).default("general")
                    .describe("Use news for current events and finance for markets and companies."),
                timeRange: z.enum(["any", "day", "week", "month", "year"]).default("any")
                    .describe("Only return results published within this window."),
            }),
        },
    );
}
