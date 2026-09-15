import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.Gate",
    displayName: "Tool Gate",
    description: "Filters the tool calls on an AIMessage before they reach a Tool Runner.",
    icon: "Shield",
    accent: "port-Tool",
    fields: [
        defineField.MultiOption("mode", "Mode", {
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
        defineInput.Message("input", "AIMessage Input", {
            required: true
        }),
    ],
    outputs: [
        defineOutput.Message("message", "Messages", {
            tooltip: "The gated AIMessage, ready to append to the conversation history."
        }),
        defineOutput.ToolList("onFiltered", "On Filtered")
    ],

    "mode==exclude": {
        inputs: [
            defineInput.ToolList("excludedTools", "Excluded Tools", {
                tooltip: "Calls to these tools are dropped."
            }),
        ],
    },

    "mode==include": {
        inputs: [
            defineInput.ToolList("includedTools", "Included Tools", {
                tooltip: "Only calls to these tools are kept."
            }),
        ],
    },
});
