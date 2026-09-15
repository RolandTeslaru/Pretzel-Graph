import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.Anthropic.ClaudeCode",
    displayName: "Claude Code",
    description: "Runs the locally authenticated Claude Code agent, optionally with PretzelGraph tools.",
    icon: "Anthropic",
    accent: "port-LanguageModel",
    fields: [
        defineField.String("workingDirectory", "Working Directory", {
            initialValue: ".",
            tooltip: "Path relative to PRETZEL_AGENT_WORKSPACE_ROOT.",
        }),
        defineField.MultiOption("model", "Model", {
            options: [
                { value: "default", displayName: "Default" },
                { value: "sonnet", displayName: "Latest Sonnet" },
                { value: "opus", displayName: "Latest Opus" },
                { value: "fable", displayName: "Latest Fable" },
            ],
            initialValue: "default",
            tooltip: "Claude Code model alias. The alias follows the latest model available to the authenticated account.",
        }),
        defineField.MultiOption("effort", "Effort", {
            options: [
                { value: "default", displayName: "Default" },
                { value: "low", displayName: "Low" },
                { value: "medium", displayName: "Medium" },
                { value: "high", displayName: "High" },
                { value: "xhigh", displayName: "Extra high" },
                { value: "max", displayName: "Max" },
            ],
            initialValue: "default",
            tooltip: "Reasoning effort passed to Claude Code for this run.",
        }),
        defineField.Integer("timeoutSeconds", "Timeout", {
            initialValue: 300,
            min: 1,
            max: 3600,
            step: 1,
            advanced: true,
            tooltip: "Maximum duration of the complete Claude Code run, in seconds.",
        }),
    ],
    inputs: [
        defineInput.MessageList("messages", "Messages", {
            required: true,
            tooltip: "Conversation history owned by PretzelGraph. A single Message is automatically wrapped into a list.",
        }),
        defineInput.ToolList("tools", "Tools", {
            tooltip: "Optional PretzelGraph tools exposed to Claude Code through a temporary MCP bridge.",
        }),
    ],
    outputs: [
        defineOutput.Message("message", "Message"),
        defineOutput.Data("extras", "Extras", {
            tooltip: "Provider execution metadata for the stateless agent run.",
        }),
    ],
});
