import { spawn } from "node:child_process";
import { access, realpath } from "node:fs/promises";
import * as path from "node:path";

import { AIMessage, type BaseMessage, type UsageMetadata } from "@langchain/core/messages";

const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

export type AgentCliResult = {
    stdout: string;
    stderr: string;
};

export type ParsedAgentOutput = {
    message:        string;
    usageMetadata?: UsageMetadata;
    metadata:       Record<string, unknown>;
};

export async function runAgentCli(options: {
    command:       string;
    args:          readonly string[];
    prompt:        string;
    cwd:           string;
    timeoutMs:     number;
    signal:        AbortSignal;
    extraEnv?:     NodeJS.ProcessEnv;
}): Promise<AgentCliResult> {
    if (options.signal.aborted)
        throw options.signal.reason ?? new Error("Execution aborted before the agent started.");

    return new Promise<AgentCliResult>((resolve, reject) => {
        const child = spawn(options.command, [...options.args], {
            cwd: options.cwd,
            env: agentEnvironment(options.extraEnv),
            shell: false,
            stdio: ["pipe", "pipe", "pipe"],
            detached: process.platform !== "win32",
        });

        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        let outputBytes = 0;
        let settled = false;

        const cleanup = () => {
            clearTimeout(timeout);
            options.signal.removeEventListener("abort", onAbort);
        };

        const fail = (error: unknown) => {
            if (settled) return;
            settled = true;
            cleanup();
            stopProcessTree(child.pid);
            reject(error);
        };

        const collect = (target: Buffer[], chunk: Buffer) => {
            outputBytes += chunk.length;
            if (outputBytes > MAX_OUTPUT_BYTES) {
                fail(new Error(`Agent output exceeded ${MAX_OUTPUT_BYTES} bytes.`));
                return;
            }
            target.push(chunk);
        };

        const onAbort = () => fail(options.signal.reason ?? new Error("Agent execution aborted."));
        const timeout = setTimeout(
            () => fail(new Error(`Agent execution timed out after ${options.timeoutMs}ms.`)),
            options.timeoutMs,
        );

        options.signal.addEventListener("abort", onAbort, { once: true });
        child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
        child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
        child.once("error", error => fail(normalizeSpawnError(options.command, error)));
        child.once("close", (code, signal) => {
            if (settled) return;
            settled = true;
            cleanup();

            const result = {
                stdout: Buffer.concat(stdout).toString("utf8"),
                stderr: Buffer.concat(stderr).toString("utf8"),
            };

            if (code === 0) {
                resolve(result);
                return;
            }

            const detail = result.stderr.trim() || result.stdout.trim() || `terminated by ${signal ?? "unknown signal"}`;
            reject(new Error(`${options.command} exited with code ${code ?? "null"}: ${detail.slice(-4_000)}`));
        });

        child.stdin.on("error", error => {
            if ((error as NodeJS.ErrnoException).code !== "EPIPE") fail(error);
        });
        child.stdin.end(options.prompt, "utf8");
    });
}

export async function resolveAgentWorkingDirectory(requested: string): Promise<string> {
    const configuredRoot = process.env.PRETZEL_AGENT_WORKSPACE_ROOT?.trim();
    const root = await realpath(configuredRoot || await findGitRoot(process.cwd()));
    const candidate = await realpath(path.resolve(root, requested.trim() || "."));
    const relative = path.relative(root, candidate);

    if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)))
        return candidate;

    throw new Error(
        `Agent working directory "${candidate}" is outside PRETZEL_AGENT_WORKSPACE_ROOT "${root}".`,
    );
}

async function findGitRoot(start: string): Promise<string> {
    let current = await realpath(start);

    while (true) {
        try {
            await access(path.join(current, ".git"));
            return current;
        } catch {
            const parent = path.dirname(current);
            if (parent === current) return start;
            current = parent;
        }
    }
}

export function messageText(message: BaseMessage): string {
    if (typeof message.content === "string") return message.content;

    if (!Array.isArray(message.content))
        throw new Error("Agent prompt must contain text content.");

    return message.content.map(block => {
        if (typeof block === "string") return block;
        if (block && typeof block === "object" && "text" in block && typeof block.text === "string")
            return block.text;
        return JSON.stringify(block);
    }).join("\n");
}

export function messageListText(messages: readonly BaseMessage[]): string {
    if (messages.length === 0)
        throw new Error("Agent messages cannot be empty.");

    return messages.map(message => [
        `<message role="${messageRole(message)}">`,
        messageText(message),
        "</message>",
    ].join("\n")).join("\n\n");
}

export function parseCodexOutput(stdout: string): ParsedAgentOutput {
    let message = "";
    let usage: unknown;
    let eventCount = 0;

    for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim()) continue;

        let event: Record<string, unknown>;
        try {
            event = JSON.parse(line) as Record<string, unknown>;
        } catch {
            continue;
        }
        eventCount += 1;

        if (event.type === "item.completed" && isRecord(event.item)) {
            if (event.item.type === "agent_message" && typeof event.item.text === "string")
                message = event.item.text;
        }

        if (event.type === "turn.completed") usage = event.usage;
    }

    if (!message)
        throw new Error("Codex completed without an agent message.");

    return {
        message,
        usageMetadata: normalizeCodexUsage(usage),
        metadata: { provider: "codex", eventCount, usage },
    };
}

export function parseClaudeOutput(stdout: string): ParsedAgentOutput {
    const payload = parseLastJsonObject(stdout);
    const message = typeof payload.result === "string" ? payload.result : "";

    if (!message)
        throw new Error("Claude Code completed without a result message.");

    return {
        message,
        usageMetadata: normalizeClaudeUsage(payload.usage),
        metadata: {
            provider: "claude-code",
            durationMs: payload.duration_ms,
            durationApiMs: payload.duration_api_ms,
            turns: payload.num_turns,
            costUsd: payload.total_cost_usd,
            usage: payload.usage,
        },
    };
}

export function createAgentMessage(
    parsed: ParsedAgentOutput,
    provider: "openai" | "anthropic",
    agent: "codex" | "claude-code",
): AIMessage {
    return new AIMessage({
        content: parsed.message,
        usage_metadata: parsed.usageMetadata,
        response_metadata: {
            model_provider: provider,
            agent,
            usage_scope: "agent_run",
        },
    });
}

export function tomlString(value: string): string {
    return JSON.stringify(value);
}

function agentEnvironment(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    const allowed = [
        "PATH", "HOME", "USER", "LOGNAME", "SHELL",
        "TMPDIR", "TEMP", "TMP",
        "LANG", "LC_ALL", "TERM",
        "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME",
        "CODEX_HOME", "CLAUDE_CONFIG_DIR",
        "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
        "http_proxy", "https_proxy", "all_proxy", "no_proxy",
        "SSL_CERT_FILE", "NODE_EXTRA_CA_CERTS", "CODEX_CA_CERTIFICATE",
    ];
    const env: NodeJS.ProcessEnv = { NO_COLOR: "1" };

    for (const key of allowed) {
        const value = process.env[key];
        if (value !== undefined) env[key] = value;
    }

    return { ...env, ...extra };
}

function stopProcessTree(pid: number | undefined): void {
    if (!pid) return;

    try {
        if (process.platform !== "win32") process.kill(-pid, "SIGTERM");
        else process.kill(pid, "SIGTERM");
    } catch {
        // The process may already have exited.
    }

    const force = setTimeout(() => {
        try {
            if (process.platform !== "win32") process.kill(-pid, "SIGKILL");
            else process.kill(pid, "SIGKILL");
        } catch {
            // The process exited after SIGTERM.
        }
    }, 2_000);
    force.unref();
}

function normalizeSpawnError(command: string, error: Error): Error {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT")
        return new Error(`Agent CLI "${command}" was not found. Install it or configure its PRETZEL_*_BIN path.`);
    return error;
}

function parseLastJsonObject(stdout: string): Record<string, unknown> {
    try {
        const value = JSON.parse(stdout) as unknown;
        if (isRecord(value)) return value;
    } catch {
        // Fall through to tolerate a CLI warning before its JSON result.
    }

    const lines = stdout.split(/\r?\n/).reverse();
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const value = JSON.parse(line) as unknown;
            if (isRecord(value)) return value;
        } catch {
            continue;
        }
    }
    throw new Error("Claude Code returned invalid JSON output.");
}

function normalizeCodexUsage(value: unknown): UsageMetadata | undefined {
    if (!isRecord(value)) return undefined;

    const inputTokens = tokenCount(value.input_tokens);
    const outputTokens = tokenCount(value.output_tokens);
    const cacheRead = tokenCount(value.cached_input_tokens);
    const reasoning = tokenCount(value.reasoning_output_tokens);

    if (inputTokens === undefined && outputTokens === undefined) return undefined;

    return {
        input_tokens: inputTokens ?? 0,
        output_tokens: outputTokens ?? 0,
        total_tokens: (inputTokens ?? 0) + (outputTokens ?? 0),
        ...(cacheRead === undefined ? {} : { input_token_details: { cache_read: cacheRead } }),
        ...(reasoning === undefined ? {} : { output_token_details: { reasoning } }),
    };
}

function normalizeClaudeUsage(value: unknown): UsageMetadata | undefined {
    if (!isRecord(value)) return undefined;

    const uncachedInput = tokenCount(value.input_tokens);
    const cacheCreation = tokenCount(value.cache_creation_input_tokens);
    const cacheRead = tokenCount(value.cache_read_input_tokens);
    const outputTokens = tokenCount(value.output_tokens);

    if (
        uncachedInput === undefined
        && cacheCreation === undefined
        && cacheRead === undefined
        && outputTokens === undefined
    ) return undefined;

    const inputTokens = (uncachedInput ?? 0) + (cacheCreation ?? 0) + (cacheRead ?? 0);

    return {
        input_tokens: inputTokens,
        output_tokens: outputTokens ?? 0,
        total_tokens: inputTokens + (outputTokens ?? 0),
        input_token_details: {
            cache_creation: cacheCreation ?? 0,
            cache_read: cacheRead ?? 0,
        },
    };
}

function tokenCount(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? value
        : undefined;
}

function messageRole(message: BaseMessage): string {
    switch (message._getType()) {
        case "human": return "user";
        case "ai": return "assistant";
        case "system": return "system";
        case "tool": return "tool";
        default: return message._getType();
    }
}

function isRecord(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
