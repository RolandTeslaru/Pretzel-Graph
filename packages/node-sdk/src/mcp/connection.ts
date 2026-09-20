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

// Combines the node's transport fields with the credential's secrets into typed MCP connection values.
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
