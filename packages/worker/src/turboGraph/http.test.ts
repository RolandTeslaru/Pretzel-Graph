import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";

import type { AxiosAdapter } from "axios";
import { AxiosHeaders } from "axios";
import { HTTP } from "@pretzel-graph/node-sdk";

import { createHTTPClientAPI } from "./http";


const failing = (status: number, data: unknown) => {
    let attempts = 0;

    const adapter: AxiosAdapter = async config => {
        attempts += 1;

        throw Object.assign(new Error(`Request failed with status code ${status}`), {
            isAxiosError: true,
            config,
            response: { status, statusText: "Internal Server Error", data, headers: new AxiosHeaders(), config },
        });
    };

    return { adapter, attempts: () => attempts };
};


test("retries a server fault the configured number of times", async () => {
    const server = failing(500, { error: "overloaded" });
    const client = createHTTPClientAPI(new AbortController().signal)
        .create({ vendor: "Test", retries: 1, adapter: server.adapter });

    await assert.rejects(() => client.post("/x", {}), HTTP.Error);
    assert.equal(server.attempts(), 2);
});


test("a request's retryable predicate can rule out an otherwise retryable status", async () => {
    const server = failing(500, null);
    const client = createHTTPClientAPI(new AbortController().signal)
        .create({ vendor: "Test", retries: 1, adapter: server.adapter });

    await assert.rejects(
        () => client.post("/x", {}, { retryable: (status, body) => !(status === 500 && body == null) }),
        HTTP.Error,
    );
    assert.equal(server.attempts(), 1);
});


test("the predicate cannot widen the retry rule past a 4xx", async () => {
    const server = failing(400, { error: "bad request" });
    const client = createHTTPClientAPI(new AbortController().signal)
        .create({ vendor: "Test", retries: 2, adapter: server.adapter });

    await assert.rejects(() => client.post("/x", {}, { retryable: () => true }), HTTP.Error);
    assert.equal(server.attempts(), 1);
});
