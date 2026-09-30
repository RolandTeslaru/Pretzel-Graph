import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import type {
    TavilyClient,
    TavilyGetResearchResponse,
    TavilyResearchOptions,
    TavilyResearchResponse,
} from "@tavily/core";
import { z } from "zod/v3";


const RESEARCH_POLL_INTERVAL_MS = 5_000;

const RESEARCH_TIMEOUT_MS = 30 * 60 * 1_000;


export async function runResearchTask(
    tavily:  TavilyClient,
    input:   string,
    options: TavilyResearchOptions,
    wait:    (milliseconds: number) => Promise<void>,
): Promise<TavilyGetResearchResponse> {

    if (!input.trim())
        throw new Error("Tavily Research: a question is required.");

    const startedAt = Date.now();

    const { requestId } = await tavily.research(input.trim(), {
        ...options,
        stream: false,
    }) as TavilyResearchResponse;

    while (Date.now() - startedAt < RESEARCH_TIMEOUT_MS) {
        await wait(RESEARCH_POLL_INTERVAL_MS);

        const task = await tavily.getResearch(requestId);

        if (task.status === "completed")
            return task as TavilyGetResearchResponse;

        if (task.status === "failed")
            throw new Error(`Tavily Research: task ${requestId} failed.`);
    }

    throw new Error(`Tavily Research: task ${requestId} did not finish within 30 minutes.`);
}


export function buildTool(
    tavily:  TavilyClient,
    options: TavilyResearchOptions,
    wait:    (milliseconds: number) => Promise<void>,
) {
    return tool(
        async ({ input }) => {
            const task = await runResearchTask(tavily, input, options, wait);

            return ToolBudget.value({
                report:  task.content,
                sources: task.sources,
            }, {
                hint: "Ask a narrower question.",
            });
        },
        {
            name:        "tavily_research",
            description: "Researches a question in depth across many web sources and returns a cited report. Takes minutes; use tavily_search for quick lookups.",
            schema: z.object({
                input: z.string().describe("The research question or task, with any context that matters."),
            }),
        },
    );
}
