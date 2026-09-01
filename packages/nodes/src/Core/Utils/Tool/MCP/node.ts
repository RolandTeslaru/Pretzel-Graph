import { tool } from "@langchain/core/tools";
import { RuntimeNode, InferIncoming, InferOutputs, jsonSchemaToZod, mcp, toMcpCreds, McpCreds } from "@pretzel-graph/node-sdk";

import { Blueprint } from "./blueprint";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        // The credential is optional: an unauthenticated HTTP server needs none.
        const instance = this.credentials.mcpAuth
        const secrets = instance
            ? this.context.credentialsAPI.getDecryptedValue(instance.blob)
            : {};

        const creds = toMcpCreds(this.fieldValues as Record<string, unknown>, secrets);

        const client = await mcp.get(creds);
        const { tools } = await client.listTools();

        const include = new Set(
            (Array.isArray(this.fieldValues.include) ? this.fieldValues.include : []).map(String),
        );
        const selected = include.size ? tools.filter(t => include.has(t.name)) : tools;

        return { tools: selected.map(t => this.wrap(creds, t)) };
    }

    /**
     * Wraps one MCP tool as a LangChain tool. The closure captures the credentials, not the
     * client: Tool.Runner invokes these long after this node has finished, by which point
     * the cached session may have been reaped — `mcp.get` bumps the TTL and reconnects.
     */
    private wrap(creds: McpCreds, t: { name: string; description?: string; inputSchema: unknown }) {
        return tool(
            async (args) => {
                const client = await mcp.get(creds);
                const result = await client.callTool({ name: t.name, arguments: args as Record<string, unknown> });
                return flatten(result);
            },
            {
                name: t.name,
                description: t.description || `The ${t.name} tool, provided by an MCP server.`,
                schema: jsonSchemaToZod(t.inputSchema),
            },
        );
    }
}

/** MCP returns an array of content blocks; agents want a single string. */
function flatten(result: unknown): string {
    const content = (result as { content?: unknown })?.content;

    if (!Array.isArray(content))
        return typeof result === "string" ? result : JSON.stringify(result);

    const text = content
        .map(block => (block?.type === "text" ? block.text : JSON.stringify(block)))
        .join("\n");

    return text || JSON.stringify(result);
}
