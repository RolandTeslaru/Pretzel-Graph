import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.List.Filter",
    displayName: "Filter",
    description: "Keeps only the list items for which the condition evaluates to true.",
    icon: "Funnel",
    accent: "utility",
    itemScope: "list",
    fields: [
        FieldBuilder.Boolean("condition", "Condition", {
            initialValue: true,
            isExpression: true,
            itemScoped: true,
            tooltip: "Evaluated once per item — use $item for the current element, $in for the node's inputs."
        }),
    ],
    inputs: [
        InputBuilder.UnresolvedList("list", "List", {
            required: true,
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.UnresolvedList("filtered", "Kept", {
            polymorphicGroupId: "data"
        }),
        OutputBuilder.UnresolvedList("discarded", "Discarded", {
            polymorphicGroupId: "data"
        }),
    ],
});

export type Blueprint = typeof Blueprint;