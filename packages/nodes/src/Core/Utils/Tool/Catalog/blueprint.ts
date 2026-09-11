import { defineField, defineBlueprint, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.Catalog",
    displayName: "Tool Catalog",
    description: "Utility node for managing a catalog of tools.",
    icon: "SwatchBook",
    accent: "port-Tool",
    fields: [
        defineField.Variadic("tools_num", "Tools", {
            initialValue: 1,
            min: 1,
            max: 32,
            inputs: [defineInput.ToolList("tool_{n}", "Tool {n}")],
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.ToolList("tool_list", "Tool List", {})
    ],
});
