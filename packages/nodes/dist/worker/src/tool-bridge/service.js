"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentToolBridgeService = exports.AgentToolBridgeService = void 0;
const node_crypto_1 = require("node:crypto");
const node_http_1 = require("node:http");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const DEFAULT_TOOL_TIMEOUT_MS = 60_000;
class AgentToolBridgeService {
    bindings = new Map();
    httpServer = null;
    starting = null;
    port = null;
    createAPI(abortSignal) {
        return {
            bind: (tools, options) => this.bind(tools, abortSignal, options),
        };
    }
    async bind(tools, abortSignal, options = {}) {
        if (tools.length === 0)
            throw new Error("Cannot create an agent tool binding without tools.");
        if (abortSignal.aborted)
            throw abortSignal.reason ?? new Error("Execution aborted before tools were bound.");
        await this.ensureListening();
        const bindingId = (0, node_crypto_1.randomUUID)();
        const token = (0, node_crypto_1.randomBytes)(32).toString("base64url");
        const timeoutMs = options.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;
        const mcpServer = new mcp_js_1.McpServer({ name: "pretzelgraph-tools", version: "1.0.0" });
        const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({ sessionIdGenerator: node_crypto_1.randomUUID });
        const toolNames = this.registerTools(mcpServer, tools, abortSignal, timeoutMs);
        await mcpServer.connect(transport);
        this.bindings.set(bindingId, { token, server: mcpServer, transport });
        let closed = false;
        const close = async () => {
            if (closed)
                return;
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
    registerTools(server, tools, abortSignal, timeoutMs) {
        const names = uniqueToolNames(tools.map(tool => tool.name));
        const registerTool = server.registerTool.bind(server);
        tools.forEach((tool, index) => {
            registerTool(names[index], {
                title: tool.name,
                description: tool.description,
                inputSchema: tool.schema,
            }, async (args) => {
                const controller = new AbortController();
                const onAbort = () => controller.abort(abortSignal.reason);
                abortSignal.addEventListener("abort", onAbort, { once: true });
                const timeout = setTimeout(() => controller.abort(new Error(`Tool "${tool.name}" timed out after ${timeoutMs}ms.`)), timeoutMs);
                try {
                    const result = await tool.invoke(args, { signal: controller.signal });
                    return { content: [{ type: "text", text: formatToolResult(result) }] };
                }
                catch (error) {
                    return {
                        isError: true,
                        content: [{ type: "text", text: errorMessage(error) }],
                    };
                }
                finally {
                    clearTimeout(timeout);
                    abortSignal.removeEventListener("abort", onAbort);
                }
            });
        });
        return names;
    }
    async ensureListening() {
        if (this.httpServer)
            return;
        if (this.starting)
            return this.starting;
        this.starting = new Promise((resolve, reject) => {
            const server = (0, node_http_1.createServer)((req, res) => { void this.handleRequest(req, res); });
            const onError = (error) => {
                server.close();
                reject(error);
            };
            server.once("error", onError);
            server.listen(0, "127.0.0.1", () => {
                server.off("error", onError);
                const address = server.address();
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
    async handleRequest(req, res) {
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
        }
        catch (error) {
            if (!res.headersSent)
                writeJson(res, 500, { error: errorMessage(error) });
            else
                res.end();
        }
    }
}
exports.AgentToolBridgeService = AgentToolBridgeService;
function uniqueToolNames(rawNames) {
    const used = new Set();
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
function validBearer(header, expected) {
    if (!header?.startsWith("Bearer "))
        return false;
    const actual = Buffer.from(header.slice("Bearer ".length));
    const wanted = Buffer.from(expected);
    return actual.length === wanted.length && (0, node_crypto_1.timingSafeEqual)(actual, wanted);
}
function formatToolResult(result) {
    if (typeof result === "string")
        return result;
    if (result && typeof result === "object" && "content" in result) {
        const content = result.content;
        if (typeof content === "string")
            return content;
    }
    try {
        return JSON.stringify(result, null, 2) ?? String(result);
    }
    catch {
        return String(result);
    }
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function writeJson(res, status, body) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
}
exports.agentToolBridgeService = new AgentToolBridgeService();
