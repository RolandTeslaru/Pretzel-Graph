import { Foundations } from "@pretzel-graph/shared/domain";
import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Switch",
    displayName: "Switch",
    description: "Routes input to exactly one output — the first matching case among many (mutually exclusive).",
    icon: "Option",
    accent: "group-routing",
    fields: [
        FieldBuilder.CaseList("cases", "Cases", {
            tooltip: "List of cases to evaluate for routing. The first case that evaluates to true will determine the output port to route to.",

            initialValue: [
                Foundations.Field.CaseList.createEntry("case-1", "Case 1"),
                Foundations.Field.CaseList.createEntry("case-2", "Case 2"),
                Foundations.Field.CaseList.createEntry("case-3", "Case 3")
            ]
        })
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
        OutputBuilder.Unresolved("case-2", "Case 1", {
            polymorphicGroupId: "condition"
        }),
        OutputBuilder.Unresolved("case-3", "Case 1", {
            polymorphicGroupId: "condition"
        }),
    ],
});
