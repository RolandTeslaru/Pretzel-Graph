import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";

import { HumanMessage } from "@langchain/core/messages";
import { InputBuilder } from "@pretzel-graph/node-sdk";

import { NodeIOService } from "./node-io-service";

test("synthesizes static Message inputs and preserves static Data inputs", () => {
    const nodeId = "Test.StaticInputs-node";
    const data = { nested: { value: 42 } };
    const service = new NodeIOService({} as never);
    const context = {
        workflowData: {
            staticValues: {
                [nodeId]: {
                    prompt: "hello",
                    data,
                },
            },
        },
        workflowCache: {
            inputHandlesMap: { [nodeId]: {} },
            edges: {},
        },
        workflowQueryAPI: {
            getInputs: () => [
                InputBuilder.Message("prompt", "Prompt"),
                InputBuilder.Data("data", "Data"),
            ],
        },
    };

    const incoming = service.getIncomingData(context as never, nodeId as never);
    const values = incoming as Record<string, unknown>;

    assert.ok(values.prompt instanceof HumanMessage);
    assert.equal(values.prompt.content, "hello");
    assert.strictEqual(values.data, data);
});
