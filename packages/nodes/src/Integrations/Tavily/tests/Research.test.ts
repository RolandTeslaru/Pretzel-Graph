import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { TavilyClient } from "@tavily/core";

import { runResearchTask } from "../Research/tools";


const noWait = async () => {};

const createTavilyClient = (statuses: string[]) => {
    const researchCalls: { input: string, options: Record<string, unknown> }[] = [];

    const client = {
        research: async (input: string, options: Record<string, unknown>) => {
            researchCalls.push({ input, options });

            return { requestId: "task-1", status: "pending" };
        },

        getResearch: async (requestId: string) => ({
            requestId,
            status:  statuses.shift(),
            content: "Report",
            sources: [{ title: "Source", url: "https://source.example" }],
        }),
    } as unknown as TavilyClient;

    return { client, researchCalls };
};


describe("runResearchTask", () => {

    it("polls until the task completes and returns its result", async () => {
        const { client, researchCalls } = createTavilyClient(["pending", "in_progress", "completed"]);

        const task = await runResearchTask(client, " Why are pretzels knotted? ", { model: "mini" }, noWait);

        assert.equal(task.content, "Report");
        assert.deepEqual(researchCalls, [{
            input:   "Why are pretzels knotted?",
            options: { model: "mini", stream: false },
        }]);
    });


    it("throws when the task fails", async () => {
        const { client } = createTavilyClient(["failed"]);

        await assert.rejects(runResearchTask(client, "x", {}, noWait), /task-1 failed/);
    });


    it("requires a question", async () => {
        const { client } = createTavilyClient([]);

        await assert.rejects(runResearchTask(client, " ", {}, noWait), /question is required/);
    });
});
