import { Foundations } from "@pretzel-graph/shared/domain";
import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Router",
    displayName: "Router",
    description: "Routes input to every output whose case is true — multiple branches can fire at once (fan-out).",
    icon: "ListTree",
    accent: "group-routing",
    fields: [
        FieldBuilder.CaseList("cases", "Cases", {
            tooltip: "List of cases to evaluate. All cases that evaluate to true will receive the input.",

            initialValue: [
                Foundations.Field.CaseList.createEntry("case-1", "Case 1"),
                Foundations.Field.CaseList.createEntry("case-2", "Case 2"),
                Foundations.Field.CaseList.createEntry("case-3", "Case 3"),
            ]
        }),
    ],
    inputs: [
        InputBuilder.Unresolved("input", "Input", {
            polymorphicGroupId: "condition"
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved("case-1", "Case 1", {
            polymorphicGroupId: "condition"
        }),
        OutputBuilder.Unresolved("case-2", "Case 2", {
            polymorphicGroupId: "condition"
        }),
        OutputBuilder.Unresolved("case-3", "Case 3", {
            polymorphicGroupId: "condition"
        }),
    ],
});
