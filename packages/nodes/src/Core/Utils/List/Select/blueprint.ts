import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@vx-agent-editor/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.List.Select",
    displayName: "Select Element",
    description: "Selects a single element from a list input.",
    icon: "Brackets",
    accent: "utility",
    fields: [
        FieldBuilder.MultiOption({
            id: "strategy",
            displayName: "Strategy",
            options: [
                { value: "first" },
                { value: "last" },
                { value: "at_index" },
            ],
            initialValue: "first",
            variant: "tab",
        }),
        FieldBuilder.Integer({
            id: "index",
            displayName: "Index",
            initialValue: 0,
            tooltip: "Index of the element to select. Negative values count from the end.",
        }),
    ],
    inputs: [
        InputBuilder.UnresolvedList({
            id: "list",
            displayName: "List",
            required: true,
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.UnresolvedScalar({
            id: "element",
            displayName: "Element",
            polymorphicGroupId: "data"
        }),
    ],
});
