import { InferIncoming, InferOutputs, RuntimeNode } from "@pretzel-graph/node-sdk";

import {
    createAgentMessage,
    messageListText,
    parseCodexOutput,
    resolveAgentWorkingDirectory,
    runAgentCli,
    tomlString,
} from "../../../services/agent-cli";
import { Blueprint } from "./blueprint";

const MCP_TOKEN_ENV = "PRETZEL_AGENT_MCP_TOKEN";

export class Node extends RuntimeNode<typeof Blueprint> {
    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const cwd = await resolveAgentWorkingDirectory(this.fieldValues.workingDirectory);
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
                args.push("-c", `model_reasoning_effort=${tomlString(this.fieldValues.effort)}`);

            if (this.fieldValues.speed === "fast") {
                args.push(
                    "-c", 'service_tier="fast"',
                    "-c", "features.fast_mode=true",
                );
            }

            const extraEnv: NodeJS.ProcessEnv = {};
            if (binding) {
                extraEnv[MCP_TOKEN_ENV] = binding.bearerToken;
                args.push(
                    "-c", `mcp_servers.pretzel.url=${tomlString(binding.url)}`,
                    "-c", `mcp_servers.pretzel.bearer_token_env_var=${tomlString(MCP_TOKEN_ENV)}`,
                    "-c", "mcp_servers.pretzel.required=true",
                    "-c", 'mcp_servers.pretzel.default_tools_approval_mode="approve"',
                    "-c", `mcp_servers.pretzel.enabled_tools=[${binding.toolNames.map(tomlString).join(",")}]`,
                    "-c", `mcp_servers.pretzel.tool_timeout_sec=${Math.ceil(timeoutMs / 1_000)}`,
                );
            }
            args.push("-");

            const result = await runAgentCli({
                command: process.env.PRETZEL_CODEX_BIN?.trim() || "codex",
                args,
                prompt: messageListText(incoming.messages),
                cwd,
                timeoutMs,
                signal: this.context.abortAPI.signal,
                extraEnv,
            });
            const parsed = parseCodexOutput(result.stdout);

            return {
                message: createAgentMessage(parsed, "openai", "codex"),
                extras: {
                    ...parsed.metadata,
                    tools: binding?.toolNames ?? [],
                },
            };
        } finally {
            await binding?.close();
        }
    }
}
