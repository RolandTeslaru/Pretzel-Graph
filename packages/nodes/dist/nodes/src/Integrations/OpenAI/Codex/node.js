"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const agent_cli_1 = require("../../../services/agent-cli");
const MCP_TOKEN_ENV = "PRETZEL_AGENT_MCP_TOKEN";
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
                "exec",
                "--json",
                "--ephemeral",
                "--ignore-user-config",
                "--sandbox", this.fieldValues.permissionMode,
                "-C", cwd,
                "-c", 'approval_policy="never"',
            ];
            if (this.fieldValues.model !== "default")
                args.push("--model", this.fieldValues.model);
            if (this.fieldValues.effort !== "default")
                args.push("-c", `model_reasoning_effort=${(0, agent_cli_1.tomlString)(this.fieldValues.effort)}`);
            if (this.fieldValues.speed === "fast") {
                args.push("-c", 'service_tier="fast"', "-c", "features.fast_mode=true");
            }
            const extraEnv = {};
            if (binding) {
                extraEnv[MCP_TOKEN_ENV] = binding.bearerToken;
                args.push("-c", `mcp_servers.pretzel.url=${(0, agent_cli_1.tomlString)(binding.url)}`, "-c", `mcp_servers.pretzel.bearer_token_env_var=${(0, agent_cli_1.tomlString)(MCP_TOKEN_ENV)}`, "-c", "mcp_servers.pretzel.required=true", "-c", 'mcp_servers.pretzel.default_tools_approval_mode="approve"', "-c", `mcp_servers.pretzel.enabled_tools=[${binding.toolNames.map(agent_cli_1.tomlString).join(",")}]`, "-c", `mcp_servers.pretzel.tool_timeout_sec=${Math.ceil(timeoutMs / 1_000)}`);
            }
            args.push("-");
            const result = await (0, agent_cli_1.runAgentCli)({
                command: process.env.PRETZEL_CODEX_BIN?.trim() || "codex",
                args,
                prompt: (0, agent_cli_1.messageListText)(incoming.messages),
                cwd,
                timeoutMs,
                signal: this.context.abortAPI.signal,
                extraEnv,
            });
            const parsed = (0, agent_cli_1.parseCodexOutput)(result.stdout);
            return {
                message: (0, agent_cli_1.createAgentMessage)(parsed, "openai", "codex"),
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
