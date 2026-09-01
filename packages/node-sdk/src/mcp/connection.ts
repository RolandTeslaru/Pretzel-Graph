import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ConnectionManager } from "../db/connection-manager";

export type McpCreds =
    | {
        transport: "stdio";
        command: string;
        args: string[];
        env: Record<string, string>;
        cwd?: string;
    }
    | {
        transport: "http";
        url: string;
        headers: Record<string, string>;
    };


class McpConnectionManager extends ConnectionManager<McpCreds, Client> {
    protected async createClient(c: McpCreds): Promise<Client> {
        const client = new Client({ name: "pretzelgraph", version: "1.0.0" });

        const transport = c.transport === "stdio"
            ? new StdioClientTransport({
                command: c.command,
                args: c.args,
                env: c.env,
                cwd: c.cwd,
                // NOTE: defaults to "inherit", so a server's stderr lands in the worker's.
                // Routing it into the execution log is a follow-up; "pipe" without a
                // reader would fill the buffer and stall the child.
            })
            : new StreamableHTTPClientTransport(new URL(c.url), {
                requestInit: { headers: c.headers },
            });

        // Runs the initialize handshake; throws if the server is unreachable or incompatible.
        await client.connect(transport);
        return client;
    }

    /** Closes the session and, for stdio, kills the spawned child process. */
    protected async disposeClient(client: Client): Promise<void> {
        await client.close();
    }
}

/** Process-wide singleton, mirroring the database managers. */
export const mcp = new McpConnectionManager();

/**
 * Builds the cache-keyed creds from the node's connection config plus the secrets held
 * in the credential. Split because only the secrets belong in the Vault — the endpoint,
 * command and args are node fields, so the editor can hide the ones a transport ignores.
 */
export function toMcpCreds(
    config: Record<string, unknown>,
    secrets: Record<string, unknown> = {},
): McpCreds {
    if (String(config.transport ?? "stdio") === "http") {
        const token = secrets.token ? String(secrets.token) : "";
        return {
            transport: "http",
            url: String(config.url ?? ""),
            headers: {
                ...asRecord(config.headers),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        };
    }

    return {
        transport: "stdio",
        command: String(config.command ?? ""),
        args: Array.isArray(config.args) ? config.args.map(String) : [],
        env: asRecord(secrets.env),
        cwd: config.cwd ? String(config.cwd) : undefined,
    };
}

function asRecord(raw: unknown): Record<string, string> {
    if (!raw)
        return {};

    const source = typeof raw === "string" ? safeParse(raw) : raw;
    if (!source || typeof source !== "object")
        return {};

    return Object.fromEntries(
        Object.entries(source as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
    );
}

function safeParse(raw: string): unknown {
    try { return JSON.parse(raw); } catch { return null; }
}
