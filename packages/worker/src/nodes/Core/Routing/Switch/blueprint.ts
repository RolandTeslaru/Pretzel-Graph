import { Foundations } from "@vx-agent-editor/shared/domain";
import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Switch",
    displayName: "Switch",
    description: "Routes input to one of multiple outputs based on a condition.",
    icon: "Option",
    accent: "group-routing",
    fields: [
        FieldBuilder.CaseList({
            id: "cases",
            displayName: "Cases",
            tooltip: "List of cases to evaluate for routing. The first case that evaluates to true will determine the output port to route to.",
            initialValue: [
                Foundations.Field.CaseList.createEntry("case-1", "Case 1"),
                Foundations.Field.CaseList.createEntry("case-2", "Case 2"),
                Foundations.Field.CaseList.createEntry("case-3", "Case 3")
            ], 
        })
    ],
    inputs: [
        InputBuilder.Unresolved({
            id: "input",
            displayName: "Input",
            polymorphicGroupId: "condition"
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved({
            id: "case-1",
            displayName: "Case 1",
            polymorphicGroupId: "condition"
        }),
        OutputBuilder.Unresolved({
            id: "case-2",
            displayName: "Case 1",
            polymorphicGroupId: "condition"
        }),
        OutputBuilder.Unresolved({
            id: "case-3",
            displayName: "Case 1",
            polymorphicGroupId: "condition"
        }),
    ],
});
