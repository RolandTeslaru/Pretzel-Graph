"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeHttpRequest = executeHttpRequest;
exports.buildTools = buildTools;
const tools_1 = require("@langchain/core/tools");
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const v3_1 = require("zod/v3");
const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const BODYLESS_METHODS = ["GET", "HEAD"];
/**
 * The one request boundary shared by node mode and tool mode. It deliberately preserves HTTP
 * error responses as data while normalizing transport failures to status 0.
 */
async function executeHttpRequest(client, request) {
    const requestHeaders = { ...(request.headers ?? {}) };
    const sendsBody = !BODYLESS_METHODS.includes(request.method);
    if (sendsBody && !Object.keys(requestHeaders).some(header => header.toLowerCase() === "content-type"))
        requestHeaders["Content-Type"] = "application/json";
    try {
        const response = await client.raw.request({
            method: request.method,
            url: request.url,
            headers: requestHeaders,
            ...(sendsBody && { data: request.body }),
        });
        return {
            status: response.status,
            data: response.data ?? null,
        };
    }
    catch (error) {
        return {
            status: 0,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
function buildTools(client) {
    const httpRequest = (0, tools_1.tool)(async ({ method, url, headers, body }) => node_sdk_1.ToolBudget.value(await executeHttpRequest(client, { method, url, headers, body }), {
        hint: "Request a smaller response or use an endpoint that supports filtering and pagination.",
    }), {
        name: "http_request",
        description: "Make one HTTP or HTTPS request and return its status code and parsed response body. "
            + "Use only URLs the user has supplied or authorized. HTTP error statuses are returned "
            + "normally; transport failures return status 0.",
        schema: v3_1.z.object({
            method: v3_1.z.enum(METHODS).default("GET")
                .describe("HTTP method."),
            url: v3_1.z.string().url()
                .refine(value => {
                const protocol = new URL(value).protocol;
                return protocol === "http:" || protocol === "https:";
            }, "URL must use HTTP or HTTPS.")
                .describe("Absolute HTTP or HTTPS URL."),
            headers: v3_1.z.record(v3_1.z.string()).default({})
                .describe("Optional request headers as string key-value pairs."),
            body: v3_1.z.unknown().optional()
                .describe("Optional JSON request body. Ignored for GET requests."),
        }),
    });
    return [httpRequest];
}
