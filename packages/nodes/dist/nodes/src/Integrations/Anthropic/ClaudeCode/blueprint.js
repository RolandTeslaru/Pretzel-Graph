"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Anthropic.ClaudeCode",
    displayName: "Claude Code",
    description: "Runs the locally authenticated Claude Code agent, optionally with PretzelGraph tools.",
    icon: "Anthropic",
    accent: "port-LanguageModel",
    fields: [
        node_sdk_1.FieldBuilder.String("workingDirectory", "Working Directory", {
            initialValue: ".",
            tooltip: "Path relative to PRETZEL_AGENT_WORKSPACE_ROOT.",
        }),
        node_sdk_1.FieldBuilder.MultiOption("model", "Model", {
            options: [
                { value: "default", displayName: "Default" },
                { value: "sonnet", displayName: "Latest Sonnet" },
                { value: "opus", displayName: "Latest Opus" },
                { value: "fable", displayName: "Latest Fable" },
            ],
            initialValue: "default",
            tooltip: "Claude Code model alias. The alias follows the latest model available to the authenticated account.",
        }),
        node_sdk_1.FieldBuilder.MultiOption("effort", "Effort", {
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
        node_sdk_1.FieldBuilder.Integer("timeoutSeconds", "Timeout", {
            initialValue: 300,
            min: 1,
            max: 3600,
            step: 1,
            advanced: true,
            tooltip: "Maximum duration of the complete Claude Code run, in seconds.",
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.MessageList("messages", "Messages", {
            required: true,
            tooltip: "Conversation history owned by PretzelGraph. A single Message is automatically wrapped into a list.",
        }),
        node_sdk_1.InputBuilder.ToolList("tools", "Tools", {
            tooltip: "Optional PretzelGraph tools exposed to Claude Code through a temporary MCP bridge.",
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Message("message", "Message"),
        node_sdk_1.OutputBuilder.Data("extras", "Extras", {
            tooltip: "Provider execution metadata for the stateless agent run.",
        }),
    ],
});
