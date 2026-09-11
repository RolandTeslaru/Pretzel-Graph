import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.List.Filter",
    displayName: "Filter",
    description: "Keeps only the list items for which the condition evaluates to true.",
    icon: "Funnel",
    accent: "utility",
    itemScope: "list",
    fields: [
        // Expression-only: a static condition can't reference $item, so the filter
        // would keep or drop the whole list.
        defineField.Boolean("condition", "Condition", {
            initialValue: true,
            only: "expression",
            itemScoped: true,
            tooltip: "Evaluated once per item — use $item for the current element, $in for the node's inputs."
        }),
    ],
    inputs: [
        defineInput.UnresolvedList("list", "List", {
            required: true,
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        defineOutput.UnresolvedList("filtered", "Kept", {
            polymorphicGroupId: "data"
        }),
        defineOutput.UnresolvedList("discarded", "Discarded", {
            polymorphicGroupId: "data"
        }),
    ],
});

export type Blueprint = typeof Blueprint;