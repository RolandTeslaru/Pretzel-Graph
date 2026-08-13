import { InferIncoming, InferOutputs, RuntimeNode } from "@pretzel-graph/node-sdk";

import {
    createAgentMessage,
    messageListText,
    parseClaudeOutput,
    resolveAgentWorkingDirectory,
    runAgentCli,
} from "../../../services/agent-cli";
import { Blueprint } from "./blueprint";

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
                args.push(
                    "--mcp-config", JSON.stringify(mcpConfig),
                    "--strict-mcp-config",
                    "--allowedTools", ...binding.toolNames.map(name => `mcp__pretzel__${name}`),
                );
            }

            const result = await runAgentCli({
                command: process.env.PRETZEL_CLAUDE_BIN?.trim() || "claude",
                args,
                prompt: messageListText(incoming.messages),
                cwd,
                timeoutMs,
                signal: this.context.abortAPI.signal,
            });
            const parsed = parseClaudeOutput(result.stdout);

            return {
                message: createAgentMessage(parsed, "anthropic", "claude-code"),
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
