import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.Gate",
    displayName: "Tool Gate",
    description: "Filters the tool calls on an AIMessage before they reach a Tool Runner.",
    icon: "Shield",
    accent: "port-Tool",
    fields: [
        FieldBuilder.MultiOption("mode", "Mode", {
            variant: "tab",
            options: [
                { value: "exclude", displayName: "Exclude", description: "Drop calls to the listed tools, let every other call through." },
                { value: "include", displayName: "Include", description: "Let through only calls to the listed tools." },
            ],

            initialValue: "exclude",
            tooltip: "Whether the wired tools are the ones blocked or the only ones allowed."
        }),
    ],
    inputs: [
        InputBuilder.Message("input", "AIMessage Input", {
            required: true
        }),
    ],
    outputs: [
        OutputBuilder.Message("message", "Messages", {
            tooltip: "The gated AIMessage, ready to append to the conversation history."
        }),
        OutputBuilder.ToolList("onFiltered", "On Filtered")
    ],

    "mode==exclude": {
        inputs: [
            InputBuilder.ToolList("excludedTools", "Excluded Tools", {
                tooltip: "Calls to these tools are dropped."
            }),
        ],
    },

    "mode==include": {
        inputs: [
            InputBuilder.ToolList("includedTools", "Included Tools", {
                tooltip: "Only calls to these tools are kept."
            }),
        ],
    },
});
