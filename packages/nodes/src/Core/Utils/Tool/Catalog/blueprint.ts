import { FieldBuilder, defineBlueprint, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.Catalog",
    displayName: "Tool Catalog",
    description: "Utility node for managing a catalog of tools.",
    icon: "SwatchBook",
    accent: "port-Tool",
    fields: [
        FieldBuilder.Variadic("tools_num", "Tools", {
            groupId: "tools_group"
        })
    ],
    inputs: [
        InputBuilder.ToolList("tool_1", "Tool 1", {
            groupId: "tools_group"
        }),
    ],
    outputs: [
        OutputBuilder.ToolList("tool_list", "Tool List", {})
    ],
});
