import { Foundations } from "@pretzel-graph/shared/domain";
import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Switch",
    displayName: "Switch",
    description: "Routes input to exactly one output — the first matching case among many (mutually exclusive).",
    icon: "Option",
    accent: "group-routing",
    fields: [
        defineField.CaseList("cases", "Cases", {
            tooltip: "List of cases to evaluate for routing. The first case that evaluates to true will determine the output port to route to.",

            initialValue: [
                Foundations.Field.CaseList.createEntry("case-1", "Case 1"),
                Foundations.Field.CaseList.createEntry("case-2", "Case 2"),
                Foundations.Field.CaseList.createEntry("case-3", "Case 3")
            ]
        })
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
        defineOutput.Unresolved("case-2", "Case 1", {
            polymorphicGroupId: "condition"
        }),
        defineOutput.Unresolved("case-3", "Case 1", {
            polymorphicGroupId: "condition"
        }),
    ],
});
