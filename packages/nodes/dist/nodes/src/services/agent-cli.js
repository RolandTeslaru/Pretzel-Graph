"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgentCli = runAgentCli;
exports.resolveAgentWorkingDirectory = resolveAgentWorkingDirectory;
exports.messageText = messageText;
exports.messageListText = messageListText;
exports.parseCodexOutput = parseCodexOutput;
exports.parseClaudeOutput = parseClaudeOutput;
exports.createAgentMessage = createAgentMessage;
exports.tomlString = tomlString;
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:fs/promises");
const path = __importStar(require("node:path"));
const messages_1 = require("@langchain/core/messages");
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
async function runAgentCli(options) {
    if (options.signal.aborted)
        throw options.signal.reason ?? new Error("Execution aborted before the agent started.");
    return new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)(options.command, [...options.args], {
            cwd: options.cwd,
            env: agentEnvironment(options.extraEnv),
            shell: false,
            stdio: ["pipe", "pipe", "pipe"],
            detached: process.platform !== "win32",
        });
        const stdout = [];
        const stderr = [];
        let outputBytes = 0;
        let settled = false;
        const cleanup = () => {
            clearTimeout(timeout);
            options.signal.removeEventListener("abort", onAbort);
        };
        const fail = (error) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            stopProcessTree(child.pid);
            reject(error);
        };
        const collect = (target, chunk) => {
            outputBytes += chunk.length;
            if (outputBytes > MAX_OUTPUT_BYTES) {
                fail(new Error(`Agent output exceeded ${MAX_OUTPUT_BYTES} bytes.`));
                return;
            }
            target.push(chunk);
        };
        const onAbort = () => fail(options.signal.reason ?? new Error("Agent execution aborted."));
        const timeout = setTimeout(() => fail(new Error(`Agent execution timed out after ${options.timeoutMs}ms.`)), options.timeoutMs);
        options.signal.addEventListener("abort", onAbort, { once: true });
        child.stdout.on("data", (chunk) => collect(stdout, chunk));
        child.stderr.on("data", (chunk) => collect(stderr, chunk));
        child.once("error", error => fail(normalizeSpawnError(options.command, error)));
        child.once("close", (code, signal) => {
            if (settled)
                return;
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
            if (error.code !== "EPIPE")
                fail(error);
        });
        child.stdin.end(options.prompt, "utf8");
    });
}
async function resolveAgentWorkingDirectory(requested) {
    const configuredRoot = process.env.PRETZEL_AGENT_WORKSPACE_ROOT?.trim();
    const root = await (0, promises_1.realpath)(configuredRoot || await findGitRoot(process.cwd()));
    const candidate = await (0, promises_1.realpath)(path.resolve(root, requested.trim() || "."));
    const relative = path.relative(root, candidate);
    if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)))
        return candidate;
    throw new Error(`Agent working directory "${candidate}" is outside PRETZEL_AGENT_WORKSPACE_ROOT "${root}".`);
}
async function findGitRoot(start) {
    let current = await (0, promises_1.realpath)(start);
    while (true) {
        try {
            await (0, promises_1.access)(path.join(current, ".git"));
            return current;
        }
        catch {
            const parent = path.dirname(current);
            if (parent === current)
                return start;
            current = parent;
        }
    }
}
function messageText(message) {
    if (typeof message.content === "string")
        return message.content;
    if (!Array.isArray(message.content))
        throw new Error("Agent prompt must contain text content.");
    return message.content.map(block => {
        if (typeof block === "string")
            return block;
        if (block && typeof block === "object" && "text" in block && typeof block.text === "string")
            return block.text;
        return JSON.stringify(block);
    }).join("\n");
}
function messageListText(messages) {
    if (messages.length === 0)
        throw new Error("Agent messages cannot be empty.");
    return messages.map(message => [
        `<message role="${messageRole(message)}">`,
        messageText(message),
        "</message>",
    ].join("\n")).join("\n\n");
}
function parseCodexOutput(stdout) {
    let message = "";
    let usage;
    let eventCount = 0;
    for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim())
            continue;
        let event;
        try {
            event = JSON.parse(line);
        }
        catch {
            continue;
        }
        eventCount += 1;
        if (event.type === "item.completed" && isRecord(event.item)) {
            if (event.item.type === "agent_message" && typeof event.item.text === "string")
                message = event.item.text;
        }
        if (event.type === "turn.completed")
            usage = event.usage;
    }
    if (!message)
        throw new Error("Codex completed without an agent message.");
    return {
        message,
        usageMetadata: normalizeCodexUsage(usage),
        metadata: { provider: "codex", eventCount, usage },
    };
}
function parseClaudeOutput(stdout) {
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
function createAgentMessage(parsed, provider, agent) {
    return new messages_1.AIMessage({
        content: parsed.message,
        usage_metadata: parsed.usageMetadata,
        response_metadata: {
            model_provider: provider,
            agent,
            usage_scope: "agent_run",
        },
    });
}
function tomlString(value) {
    return JSON.stringify(value);
}
function agentEnvironment(extra = {}) {
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
    const env = { NO_COLOR: "1" };
    for (const key of allowed) {
        const value = process.env[key];
        if (value !== undefined)
            env[key] = value;
    }
    return { ...env, ...extra };
}
function stopProcessTree(pid) {
    if (!pid)
        return;
    try {
        if (process.platform !== "win32")
            process.kill(-pid, "SIGTERM");
        else
            process.kill(pid, "SIGTERM");
    }
    catch {
        // The process may already have exited.
    }
    const force = setTimeout(() => {
        try {
            if (process.platform !== "win32")
                process.kill(-pid, "SIGKILL");
            else
                process.kill(pid, "SIGKILL");
        }
        catch {
            // The process exited after SIGTERM.
        }
    }, 2_000);
    force.unref();
}
function normalizeSpawnError(command, error) {
    const code = error.code;
    if (code === "ENOENT")
        return new Error(`Agent CLI "${command}" was not found. Install it or configure its PRETZEL_*_BIN path.`);
    return error;
}
function parseLastJsonObject(stdout) {
    try {
        const value = JSON.parse(stdout);
        if (isRecord(value))
            return value;
    }
    catch {
        // Fall through to tolerate a CLI warning before its JSON result.
    }
    const lines = stdout.split(/\r?\n/).reverse();
    for (const line of lines) {
        if (!line.trim())
            continue;
        try {
            const value = JSON.parse(line);
            if (isRecord(value))
                return value;
        }
        catch {
            continue;
        }
    }
    throw new Error("Claude Code returned invalid JSON output.");
}
function normalizeCodexUsage(value) {
    if (!isRecord(value))
        return undefined;
    const inputTokens = tokenCount(value.input_tokens);
    const outputTokens = tokenCount(value.output_tokens);
    const cacheRead = tokenCount(value.cached_input_tokens);
    const reasoning = tokenCount(value.reasoning_output_tokens);
    if (inputTokens === undefined && outputTokens === undefined)
        return undefined;
    return {
        input_tokens: inputTokens ?? 0,
        output_tokens: outputTokens ?? 0,
        total_tokens: (inputTokens ?? 0) + (outputTokens ?? 0),
        ...(cacheRead === undefined ? {} : { input_token_details: { cache_read: cacheRead } }),
        ...(reasoning === undefined ? {} : { output_token_details: { reasoning } }),
    };
}
function normalizeClaudeUsage(value) {
    if (!isRecord(value))
        return undefined;
    const uncachedInput = tokenCount(value.input_tokens);
    const cacheCreation = tokenCount(value.cache_creation_input_tokens);
    const cacheRead = tokenCount(value.cache_read_input_tokens);
    const outputTokens = tokenCount(value.output_tokens);
    if (uncachedInput === undefined
        && cacheCreation === undefined
        && cacheRead === undefined
        && outputTokens === undefined)
        return undefined;
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
function tokenCount(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? value
        : undefined;
}
function messageRole(message) {
    switch (message._getType()) {
        case "human": return "user";
        case "ai": return "assistant";
        case "system": return "system";
        case "tool": return "tool";
        default: return message._getType();
    }
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
