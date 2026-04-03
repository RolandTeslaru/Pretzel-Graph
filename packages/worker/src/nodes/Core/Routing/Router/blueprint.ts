import { Foundations } from "@vx-agent-editor/shared/domain";
import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Router",
    displayName: "Router",
    description: "Routes input to all outputs whose condition evaluates to true.",
    icon: "ListTree",
    accent: "group-routing",
    fields: [
        FieldBuilder.CaseList({
            id: "cases",
            displayName: "Cases",
            tooltip: "List of cases to evaluate. All cases that evaluate to true will receive the input.",
            initialValue: [
                Foundations.Field.CaseList.createEntry("case-1", "Case 1"),
                Foundations.Field.CaseList.createEntry("case-2", "Case 2"),
                Foundations.Field.CaseList.createEntry("case-3", "Case 3"),
            ],
        }),
    ],
    inputs: [
        InputBuilder.Unresolved({
            id: "input",
            displayName: "Input",
            syncGroupId: "condition"
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved({
            id: "case-1",
            displayName: "Case 1",
            syncGroupId: "condition"
        }),
        OutputBuilder.Unresolved({
            id: "case-2",
            displayName: "Case 2",
            syncGroupId: "condition"
        }),
        OutputBuilder.Unresolved({
            id: "case-3",
            displayName: "Case 3",
            syncGroupId: "condition"
        }),
    ],
});
