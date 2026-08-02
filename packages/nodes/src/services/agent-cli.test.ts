import assert from "node:assert/strict";
import test from "node:test";

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

import {
    createAgentMessage,
    messageListText,
    messageText,
    parseClaudeOutput,
    parseCodexOutput,
    runAgentCli,
    tomlString,
} from "./agent-cli";

test("runs a CLI without a shell and sends the prompt over stdin", async () => {
    const result = await runAgentCli({
        command: process.execPath,
        args: ["-e", "process.stdin.on('data', chunk => process.stdout.write(chunk.toString().toUpperCase()))"],
        prompt: "hello agent",
        cwd: process.cwd(),
        timeoutMs: 5_000,
        signal: new AbortController().signal,
    });

    assert.equal(result.stdout, "HELLO AGENT");
});

test("parses the final Codex message, session, and usage", () => {
    const parsed = parseCodexOutput([
        JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
        JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "First" } }),
        JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "Final" } }),
        JSON.stringify({
            type: "turn.completed",
            usage: {
                input_tokens: 12,
                cached_input_tokens: 8,
                output_tokens: 4,
                reasoning_output_tokens: 2,
            },
        }),
    ].join("\n"));

    assert.equal(parsed.message, "Final");
    assert.deepEqual(parsed.metadata.usage, {
        input_tokens: 12,
        cached_input_tokens: 8,
        output_tokens: 4,
        reasoning_output_tokens: 2,
    });
    assert.deepEqual(parsed.usageMetadata, {
        input_tokens: 12,
        output_tokens: 4,
        total_tokens: 16,
        input_token_details: { cache_read: 8 },
        output_token_details: { reasoning: 2 },
    });
});

test("parses Claude Code JSON output", () => {
    const parsed = parseClaudeOutput(JSON.stringify({
        type: "result",
        result: "Done",
        session_id: "session-1",
        duration_ms: 42,
        num_turns: 2,
        usage: {
            input_tokens: 3,
            cache_creation_input_tokens: 5,
            cache_read_input_tokens: 7,
            output_tokens: 11,
        },
    }));

    assert.equal(parsed.message, "Done");
    assert.equal(parsed.metadata.durationMs, 42);
    assert.deepEqual(parsed.usageMetadata, {
        input_tokens: 15,
        output_tokens: 11,
        total_tokens: 26,
        input_token_details: { cache_creation: 5, cache_read: 7 },
    });

    const message = createAgentMessage(parsed, "anthropic", "claude-code");
    assert.deepEqual(message.usage_metadata, parsed.usageMetadata);
    assert.deepEqual(message.response_metadata, {
        model_provider: "anthropic",
        agent: "claude-code",
        usage_scope: "agent_run",
    });
});

test("extracts text blocks from a message and safely quotes TOML strings", () => {
    const message = new AIMessage({ content: [
        { type: "text", text: "one" },
        { type: "text", text: "two" },
    ] });

    assert.equal(messageText(message), "one\ntwo");
    assert.equal(tomlString('a"b'), '"a\\"b"');
});

test("serializes a PretzelGraph message stack with roles", () => {
    const transcript = messageListText([
        new SystemMessage("Be concise."),
        new HumanMessage("What changed?"),
        new AIMessage("The engine changed."),
        new HumanMessage("Show me."),
    ]);

    assert.equal(transcript, [
        '<message role="system">\nBe concise.\n</message>',
        '<message role="user">\nWhat changed?\n</message>',
        '<message role="assistant">\nThe engine changed.\n</message>',
        '<message role="user">\nShow me.\n</message>',
    ].join("\n\n"));
});
