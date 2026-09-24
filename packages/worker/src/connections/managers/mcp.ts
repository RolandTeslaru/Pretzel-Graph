import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpCreds } from "@pretzel-graph/node-sdk";
import { ConnectionManager } from "./connection-manager";

export class McpConnectionManager extends ConnectionManager<McpCreds, McpClient> {
    protected async createClient(creds: McpCreds): Promise<McpClient> {
        const client = new McpClient({ name: "pretzelgraph", version: "1.0.0" });
        const transport = creds.transport === "stdio"
            ? new StdioClientTransport({
                command: creds.command,
                args: creds.args,
                env: creds.env,
                cwd: creds.cwd,
            })
            : new StreamableHTTPClientTransport(new URL(creds.url), {
                requestInit: { headers: creds.headers },
            });

        await client.connect(transport);

        return client;
    }

    protected async disposeClient(client: McpClient): Promise<void> {
        await client.close();
    }
}
