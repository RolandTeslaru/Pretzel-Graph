import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.List.Slice",
    displayName: "Slice",
    description: "Returns a sub-array from a list using start and end indices.",
    icon: "Scissors",
    accent: "utility",
    fields: [
        FieldBuilder.Integer("start", "Start", {
            initialValue: 0,
            tooltip: "Start index (inclusive). Negative values count from the end."
        }),
        FieldBuilder.Integer("end", "End", {
            required: false,
            tooltip: "End index (exclusive). Leave empty to slice to the end of the list. Negative values count from the end."
        }),
    ],
    inputs: [
        InputBuilder.UnresolvedList("list", "List", {
            required: true,
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.UnresolvedList("slice", "Slice", {
            polymorphicGroupId: "data"
        }),
    ],
});
