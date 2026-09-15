import { Foundations } from "@pretzel-graph/shared/domain";
import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Router",
    displayName: "Router",
    description: "Routes input to every output whose case is true — multiple branches can fire at once (fan-out).",
    icon: "ListTree",
    accent: "group-routing",
    fields: [
        defineField.CaseList("cases", "Cases", {
            tooltip: "List of cases to evaluate. All cases that evaluate to true will receive the input.",

            initialValue: [
                Foundations.Field.CaseList.createEntry("case-1", "Case 1"),
                Foundations.Field.CaseList.createEntry("case-2", "Case 2"),
                Foundations.Field.CaseList.createEntry("case-3", "Case 3"),
            ]
        }),
    ],
    inputs: [
        defineInput.Unresolved("input", "Input", {
            polymorphicGroupId: "condition"
        }),
    ],
    outputs: [
        defineOutput.Unresolved("case-1", "Case 1", {
            polymorphicGroupId: "condition"
        }),
        defineOutput.Unresolved("case-2", "Case 2", {
            polymorphicGroupId: "condition"
        }),
        defineOutput.Unresolved("case-3", "Case 3", {
            polymorphicGroupId: "condition"
        }),
    ],
});
