import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    StandardFields,
    type HTTP,
} from "@pretzel-graph/node-sdk";
import { Foundations } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";
import { buildTools, executeHttpRequest } from "./tools";


const stubClient = (
    request: (config: Record<string, unknown>) => Promise<{ status: number; data?: unknown }>,
): HTTP.Client => ({
    raw: { request },
} as never);


describe("HTTP Request", () => {
    it("derives a terminal tool shape while retaining framework fields and proxy credentials", () => {
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(
            Blueprint,
            { isConvertedToTool: true } as never,
        );

        assert.equal(derivativeId, "isConvertedToTool==true");
        assert.deepEqual(blueprint.inputs.map(input => input.id), []);
        assert.deepEqual(blueprint.outputs.map(output => output.id), ["tools"]);
        assert.deepEqual(
            blueprint.fields
                .filter(field => !StandardFields.IDS.has(String(field.id)))
                .map(field => String(field.id)),
            [],
        );
        assert.deepEqual(
            blueprint.credentials?.map(credential => String(credential.id)),
            ["networkProxy"],
        );
    });

    it("keeps regular mode unchanged", () => {
        const { blueprint } = Foundations.Blueprint.derive(Blueprint, {});

        assert.deepEqual(
            blueprint.fields
                .filter(field => !StandardFields.IDS.has(String(field.id)))
                .map(field => String(field.id)),
            ["method", "url", "headers", "body"],
        );
        assert.deepEqual(blueprint.outputs.map(output => output.id), ["result"]);
    });

    it("uses the shared client contract and adds JSON content type for requests with bodies", async () => {
        let requestConfig: Record<string, unknown> | undefined;

        const result = await executeHttpRequest(
            stubClient(async config => {
                requestConfig = config;
                return { status: 201, data: { id: 7 } };
            }),
            {
                method:  "POST",
                url:     "https://api.example.com/items",
                headers: { Authorization: "Bearer test" },
                body:    { name: "item" },
            },
        );

        assert.deepEqual(requestConfig, {
            method:  "POST",
            url:     "https://api.example.com/items",
            headers: {
                Authorization: "Bearer test",
                "Content-Type": "application/json",
            },
            data: { name: "item" },
        });
        assert.deepEqual(result, { status: 201, data: { id: 7 } });
    });

    it("exposes one bounded structured tool and omits a body for GET", async () => {
        let requestConfig: Record<string, unknown> | undefined;
        const [httpRequest] = buildTools(stubClient(async config => {
            requestConfig = config;
            return { status: 404, data: { message: "missing" } };
        }));

        const result = await httpRequest.invoke({
            url: "https://api.example.com/missing",
        });

        assert.equal(httpRequest.name, "http_request");
        assert.deepEqual(requestConfig, {
            method:  "GET",
            url:     "https://api.example.com/missing",
            headers: {},
        });
        assert.deepEqual(
            JSON.parse(result),
            { status: 404, data: { message: "missing" } },
        );
    });

    it("normalizes transport failures to status 0 in both modes", async () => {
        const client = stubClient(async () => {
            throw new Error("connection refused");
        });

        assert.deepEqual(
            await executeHttpRequest(client, {
                method: "GET",
                url:    "https://api.example.com",
            }),
            { status: 0, error: "connection refused" },
        );

        const [httpRequest] = buildTools(client);
        assert.deepEqual(
            JSON.parse(await httpRequest.invoke({ url: "https://api.example.com" })),
            { status: 0, error: "connection refused" },
        );
    });
});
