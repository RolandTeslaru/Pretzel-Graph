"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const agent_cli_1 = require("../../../services/agent-cli");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const cwd = await (0, agent_cli_1.resolveAgentWorkingDirectory)(this.fieldValues.workingDirectory);
        const tools = incoming.tools ?? [];
        const timeoutMs = this.fieldValues.timeoutSeconds * 1_000;
        const binding = tools.length > 0
            ? await this.context.agentToolBridgeAPI.bind(tools, { timeoutMs })
            : undefined;
        try {
            const args = [
                "-p",
                "--output-format", "json",
                "--no-session-persistence",
                "--dangerously-skip-permissions",
            ];
            if (this.fieldValues.model !== "default")
                args.push("--model", this.fieldValues.model);
            if (this.fieldValues.effort !== "default")
                args.push("--effort", this.fieldValues.effort);
            if (binding) {
                const mcpConfig = {
                    mcpServers: {
                        pretzel: {
                            type: "http",
                            url: binding.url,
                            headers: { Authorization: `Bearer ${binding.bearerToken}` },
                        },
                    },
                };
                args.push("--mcp-config", JSON.stringify(mcpConfig), "--strict-mcp-config", "--allowedTools", ...binding.toolNames.map(name => `mcp__pretzel__${name}`));
            }
            const result = await (0, agent_cli_1.runAgentCli)({
                command: process.env.PRETZEL_CLAUDE_BIN?.trim() || "claude",
                args,
                prompt: (0, agent_cli_1.messageListText)(incoming.messages),
                cwd,
                timeoutMs,
                signal: this.context.abortAPI.signal,
            });
            const parsed = (0, agent_cli_1.parseClaudeOutput)(result.stdout);
            return {
                message: (0, agent_cli_1.createAgentMessage)(parsed, "anthropic", "claude-code"),
                extras: {
                    ...parsed.metadata,
                    tools: binding?.toolNames ?? [],
                },
            };
        }
        finally {
            await binding?.close();
        }
    }
}
exports.Node = Node;
