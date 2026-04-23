import { FieldBuilder, defineBlueprint, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.Catalog",
    displayName: "Tool Catalog",
    description: "Utility node for managing a catalog of tools.",
    icon: "SwatchBook",
    accent: "port-Tool",
    fields: [
        FieldBuilder.Variadic({
            id: "tools_num",
            displayName: "Tools",
            groupId: "tools_group",
        })
    ],
    inputs: [
        InputBuilder.ToolList({
            id: "tool_1",
            displayName: "Tool 1",
            groupId: "tools_group",
        }),
        InputBuilder.ToolList({
            id: "tool_2",
            displayName: "Tool 2",
            groupId: "tools_group",
        }),
        InputBuilder.ToolList({
            id: "tool_3",
            displayName: "Tool 3",
            groupId: "tools_group",
        })
    ],
    outputs: [
        OutputBuilder.ToolList({
            id: "tool_list",
            displayName: "Tool List",
        })
    ],
});
