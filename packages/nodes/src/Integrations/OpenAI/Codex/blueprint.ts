import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.OpenAI.Codex",
    displayName: "Codex",
    description: "Runs the locally authenticated Codex coding agent, optionally with PretzelGraph tools.",
    icon: "OpenAI",
    accent: "port-LanguageModel",
    fields: [
        FieldBuilder.String("workingDirectory", "Working Directory", {
            initialValue: ".",
            tooltip: "Path relative to PRETZEL_AGENT_WORKSPACE_ROOT.",
        }),
        FieldBuilder.MultiOption("model", "Model", {
            options: [
                { value: "default", displayName: "Default" },
                { value: "gpt-5.6-sol", displayName: "GPT-5.6 Sol" },
                { value: "gpt-5.6-terra", displayName: "GPT-5.6 Terra" },
                { value: "gpt-5.6-luna", displayName: "GPT-5.6 Luna" },
            ],
            initialValue: "default",
            tooltip: "Model used by Codex. Availability depends on the authenticated account.",
        }),
        FieldBuilder.MultiOption("effort", "Effort", {
            options: [
                { value: "default", displayName: "Default" },
                { value: "minimal", displayName: "Minimal" },
                { value: "low", displayName: "Low" },
                { value: "medium", displayName: "Medium" },
                { value: "high", displayName: "High" },
                { value: "xhigh", displayName: "Extra high" },
            ],
            initialValue: "default",
            tooltip: "Higher reasoning effort can improve difficult work but takes longer and uses more tokens.",
        }),
        FieldBuilder.MultiOption("speed", "Speed", {
            options: [
                { value: "standard", displayName: "Standard" },
                { value: "fast", displayName: "Fast" },
            ],
            initialValue: "standard",
            tooltip: "Fast uses the Codex Fast service tier when supported and consumes subscription credits faster.",
        }),
        FieldBuilder.MultiOption("permissionMode", "Permissions", {
            options: [
                { value: "read-only", displayName: "Read only" },
                { value: "workspace-write", displayName: "Edit workspace" },
            ],
            initialValue: "read-only",
        }),
        FieldBuilder.Integer("timeoutSeconds", "Timeout", {
            initialValue: 300,
            min: 1,
            max: 3600,
            step: 1,
            advanced: true,
            tooltip: "Maximum duration of the complete Codex run, in seconds.",
        }),
    ],
    inputs: [
        InputBuilder.MessageList("messages", "Messages", {
            required: true,
            tooltip: "Conversation history owned by PretzelGraph. A single Message is automatically wrapped into a list.",
        }),
        InputBuilder.ToolList("tools", "Tools", {
            tooltip: "Optional PretzelGraph tools exposed to Codex through a temporary MCP bridge.",
        }),
    ],
    outputs: [
        OutputBuilder.Message("message", "Message"),
        OutputBuilder.Data("extras", "Extras", {
            tooltip: "Provider execution metadata for the stateless agent run.",
        }),
    ],
});
