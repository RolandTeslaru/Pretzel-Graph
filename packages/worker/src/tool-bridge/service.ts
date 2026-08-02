import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { LC, RuntimeNode } from "@pretzel-graph/node-sdk";

type BindingEntry = {
    token:     string;
    server:    McpServer;
    transport: StreamableHTTPServerTransport;
};

const DEFAULT_TOOL_TIMEOUT_MS = 60_000;

export class AgentToolBridgeService {
    private readonly bindings = new Map<string, BindingEntry>();
    private httpServer: HttpServer | null = null;
    private starting: Promise<void> | null = null;
    private port: number | null = null;

    public createAPI(abortSignal: AbortSignal): RuntimeNode.ExecutionContext["agentToolBridgeAPI"] {
        return {
            bind: (tools, options) => this.bind(tools, abortSignal, options),
        };
    }

    private async bind(
        tools:       readonly LC.Tool[],
        abortSignal: AbortSignal,
        options:     { timeoutMs?: number } = {},
    ): Promise<RuntimeNode.AgentToolBinding> {
        if (tools.length === 0)
            throw new Error("Cannot create an agent tool binding without tools.");

        if (abortSignal.aborted)
            throw abortSignal.reason ?? new Error("Execution aborted before tools were bound.");

        await this.ensureListening();

        const bindingId = randomUUID();
        const token = randomBytes(32).toString("base64url");
        const timeoutMs = options.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;
        const mcpServer = new McpServer({ name: "pretzelgraph-tools", version: "1.0.0" });
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: randomUUID });
        const toolNames = this.registerTools(mcpServer, tools, abortSignal, timeoutMs);

        await mcpServer.connect(transport);
        this.bindings.set(bindingId, { token, server: mcpServer, transport });

        let closed = false;
        const close = async () => {
            if (closed) return;
            closed = true;
            abortSignal.removeEventListener("abort", onAbort);

            const entry = this.bindings.get(bindingId);
            this.bindings.delete(bindingId);
            await entry?.server.close().catch(() => undefined);
        };
        const onAbort = () => { void close(); };
        abortSignal.addEventListener("abort", onAbort, { once: true });

        return {
            url: `http://127.0.0.1:${this.port}/mcp/${bindingId}`,
            bearerToken: token,
            toolNames,
            close,
        };
    }

    private registerTools(
        server:      McpServer,
        tools:       readonly LC.Tool[],
        abortSignal: AbortSignal,
        timeoutMs:   number,
    ): string[] {
        const names = uniqueToolNames(tools.map(tool => tool.name));
        const registerTool = server.registerTool.bind(server) as unknown as (
            name: string,
            config: { title?: string; description?: string; inputSchema?: unknown },
            callback: (args: Record<string, unknown>) => Promise<{
                content: Array<{ type: "text"; text: string }>;
                isError?: boolean;
            }>,
        ) => void;

        tools.forEach((tool, index) => {
            registerTool(names[index], {
                title: tool.name,
                description: tool.description,
                inputSchema: tool.schema,
            }, async (args) => {
                const controller = new AbortController();
                const onAbort = () => controller.abort(abortSignal.reason);
                abortSignal.addEventListener("abort", onAbort, { once: true });
                const timeout = setTimeout(
                    () => controller.abort(new Error(`Tool "${tool.name}" timed out after ${timeoutMs}ms.`)),
                    timeoutMs,
                );

                try {
                    const result = await tool.invoke(args, { signal: controller.signal });
                    return { content: [{ type: "text" as const, text: formatToolResult(result) }] };
                } catch (error) {
                    return {
                        isError: true,
                        content: [{ type: "text" as const, text: errorMessage(error) }],
                    };
                } finally {
                    clearTimeout(timeout);
                    abortSignal.removeEventListener("abort", onAbort);
                }
            });
        });

        return names;
    }

    private async ensureListening(): Promise<void> {
        if (this.httpServer) return;
        if (this.starting) return this.starting;

        this.starting = new Promise<void>((resolve, reject) => {
            const server = createServer((req, res) => { void this.handleRequest(req, res); });
            const onError = (error: Error) => {
                server.close();
                reject(error);
            };

            server.once("error", onError);
            server.listen(0, "127.0.0.1", () => {
                server.off("error", onError);
                const address = server.address() as AddressInfo;
                this.port = address.port;
                this.httpServer = server;
                server.unref();
                resolve();
            });
        }).finally(() => {
            this.starting = null;
        });

        return this.starting;
    }

    private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
        const match = /^\/mcp\/([^/]+)$/.exec(pathname);
        const entry = match ? this.bindings.get(match[1]) : undefined;

        if (!entry) {
            writeJson(res, 404, { error: "Unknown or expired tool binding." });
            return;
        }

        if (!validBearer(req.headers.authorization, entry.token)) {
            res.setHeader("WWW-Authenticate", "Bearer");
            writeJson(res, 401, { error: "Invalid tool binding token." });
            return;
        }

        try {
            await entry.transport.handleRequest(req, res);
        } catch (error) {
            if (!res.headersSent)
                writeJson(res, 500, { error: errorMessage(error) });
            else
                res.end();
        }
    }
}

function uniqueToolNames(rawNames: readonly string[]): string[] {
    const used = new Set<string>();

    return rawNames.map((rawName, index) => {
        const base = rawName
            .replace(/[^A-Za-z0-9_-]/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 96) || `tool_${index + 1}`;

        let candidate = base;
        let suffix = 2;
        while (used.has(candidate)) {
            const marker = `_${suffix++}`;
            candidate = `${base.slice(0, 96 - marker.length)}${marker}`;
        }
        used.add(candidate);
        return candidate;
    });
}

function validBearer(header: string | undefined, expected: string): boolean {
    if (!header?.startsWith("Bearer ")) return false;
    const actual = Buffer.from(header.slice("Bearer ".length));
    const wanted = Buffer.from(expected);
    return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

function formatToolResult(result: unknown): string {
    if (typeof result === "string") return result;

    if (result && typeof result === "object" && "content" in result) {
        const content = (result as { content?: unknown }).content;
        if (typeof content === "string") return content;
    }

    try {
        return JSON.stringify(result, null, 2) ?? String(result);
    } catch {
        return String(result);
    }
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
}

export const agentToolBridgeService = new AgentToolBridgeService();
