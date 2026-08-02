import assert from "node:assert/strict";
import test from "node:test";

import { DynamicStructuredTool } from "@langchain/core/tools";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod/v3";

import { AgentToolBridgeService } from "./service";

test("exposes live LangChain tools through an authenticated MCP endpoint", async () => {
    const service = new AgentToolBridgeService();
    const abortController = new AbortController();
    const tool = new DynamicStructuredTool({
        name: "weather.lookup",
        description: "Returns the weather for a city.",
        schema: z.object({ city: z.string() }),
        func: async ({ city }) => ({ city, temperature: 18 }),
    });
    const binding = await service.createAPI(abortController.signal).bind([tool]);
    const transport = new StreamableHTTPClientTransport(new URL(binding.url), {
        requestInit: {
            headers: { Authorization: `Bearer ${binding.bearerToken}` },
        },
    });
    const client = new Client({ name: "pretzelgraph-test", version: "1.0.0" });

    try {
        await client.connect(transport);
        const listed = await client.listTools();
        assert.deepEqual(listed.tools.map(candidate => candidate.name), ["weather_lookup"]);

        const result = await client.callTool({
            name: "weather_lookup",
            arguments: { city: "Bucharest" },
        });
        assert.equal(result.isError, undefined);
        assert.deepEqual(result.content, [{
            type: "text",
            text: '{\n  "city": "Bucharest",\n  "temperature": 18\n}',
        }]);
    } finally {
        await client.close();
        await binding.close();
    }
});

test("rejects requests without the binding bearer token", async () => {
    const service = new AgentToolBridgeService();
    const tool = new DynamicStructuredTool({
        name: "ping",
        description: "Returns pong.",
        schema: z.object({}),
        func: async () => "pong",
    });
    const binding = await service.createAPI(new AbortController().signal).bind([tool]);

    try {
        const response = await fetch(binding.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
        });
        assert.equal(response.status, 401);
    } finally {
        await binding.close();
    }
});
