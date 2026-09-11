import { FieldBuilder, defineBlueprint, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.Catalog",
    displayName: "Tool Catalog",
    description: "Utility node for managing a catalog of tools.",
    icon: "SwatchBook",
    accent: "port-Tool",
    fields: [
        FieldBuilder.Variadic("tools_num", "Tools", {
            initialValue: 1,
            min: 1,
            max: 32,
            inputs: [InputBuilder.ToolList("tool_{n}", "Tool {n}")],
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.ToolList("tool_list", "Tool List", {})
    ],
});
