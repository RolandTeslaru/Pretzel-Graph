import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.List.Select",
    displayName: "Select Item",
    description: "Selects a single element from a list input.",
    icon: "Brackets",
    accent: "utility",
    fields: [
        defineField.MultiOption("strategy", "Strategy", {
            options: [
                { value: "first" },
                { value: "last" },
                { value: "at_index" },
            ],

            initialValue: "first",
            variant: "tab"
        }),
        defineField.Integer("index", "Index", {
            initialValue: 0,
            tooltip: "Index of the element to select. Negative values count from the end."
        }),
    ],
    inputs: [
        defineInput.UnresolvedList("list", "List", {
            required: true,
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        defineOutput.UnresolvedScalar("element", "Element", {
            polymorphicGroupId: "data"
        }),
    ],
});
