import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.List.Filter",
    displayName: "Filter",
    description: "Keeps only the list items for which the condition evaluates to true.",
    icon: "Funnel",
    accent: "utility",
    itemScope: "list",
    fields: [
        FieldBuilder.itemScoped(FieldBuilder.Boolean({
            id: "condition",
            displayName: "Condition",
            initialValue: true,
            isExpression: true,
            tooltip: "Evaluated once per item — use $item for the current element, $in for the node's inputs.",
        })),
    ],
    inputs: [
        InputBuilder.UnresolvedList({
            id: "list",
            displayName: "List",
            required: true,
            polymorphicGroupId: "data",
        }),
    ],
    outputs: [
        OutputBuilder.UnresolvedList({
            id: "filtered",
            displayName: "Kept",
            polymorphicGroupId: "data",
        }),
        OutputBuilder.UnresolvedList({
            id: "discarded",
            displayName: "Discarded",
            polymorphicGroupId: "data",
        }),
    ],
});

export type Blueprint = typeof Blueprint;