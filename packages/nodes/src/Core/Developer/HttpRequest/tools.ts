import { tool } from "@langchain/core/tools";
import {
    type HTTP,
    ToolBudget,
} from "@pretzel-graph/node-sdk";
import { z } from "zod/v3";


const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
const BODYLESS_METHODS: readonly string[] = ["GET", "HEAD"];

type HttpMethod = typeof METHODS[number];

type HttpRequest = {
    method:   HttpMethod;
    url:      string;
    headers?: Record<string, string>;
    body?:    unknown;
};

type HttpResult =
    | { status: number; data: unknown }
    | { status: 0; error: string };


/**
 * The one request boundary shared by node mode and tool mode. It deliberately preserves HTTP
 * error responses as data while normalizing transport failures to status 0.
 */
export async function executeHttpRequest(
    client:  HTTP.Client,
    request: HttpRequest,
): Promise<HttpResult> {
    const requestHeaders = { ...(request.headers ?? {}) };
    const sendsBody      = !BODYLESS_METHODS.includes(request.method);

    if (sendsBody && !Object.keys(requestHeaders).some(header => header.toLowerCase() === "content-type"))
        requestHeaders["Content-Type"] = "application/json";

    try {
        const response = await client.raw.request({
            method:  request.method,
            url:     request.url,
            headers: requestHeaders,
            ...(sendsBody && { data: request.body }),
        });

        return {
            status: response.status,
            data:   response.data ?? null,
        };
    }
    catch (error) {
        return {
            status: 0,
            error:  error instanceof Error ? error.message : String(error),
        };
    }
}


export function buildTools(client: HTTP.Client) {
    const httpRequest = tool(
        async ({ method, url, headers, body }) =>
            ToolBudget.value(
                await executeHttpRequest(client, { method, url, headers, body }),
                {
                    hint: "Request a smaller response or use an endpoint that supports filtering and pagination.",
                },
            ),
        {
            name: "http_request",
            description:
                "Make one HTTP or HTTPS request and return its status code and parsed response body. "
                + "Use only URLs the user has supplied or authorized. HTTP error statuses are returned "
                + "normally; transport failures return status 0.",
            schema: z.object({
                method: z.enum(METHODS).default("GET")
                    .describe("HTTP method."),
                url: z.string().url()
                    .refine(value => {
                        const protocol = new URL(value).protocol;
                        return protocol === "http:" || protocol === "https:";
                    }, "URL must use HTTP or HTTPS.")
                    .describe("Absolute HTTP or HTTPS URL."),
                headers: z.record(z.string()).default({})
                    .describe("Optional request headers as string key-value pairs."),
                body: z.unknown().optional()
                    .describe("Optional JSON request body. Ignored for GET requests."),
            }),
        },
    );

    return [httpRequest];
}
