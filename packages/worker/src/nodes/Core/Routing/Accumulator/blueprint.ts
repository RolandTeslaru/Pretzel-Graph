import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Accumulator",
    displayName: "Accumulator",
    description: "Collects inputs over multiple executions and emits the accumulated result.",
    icon: "GitPullRequestArrow",
    accent: "group-routing",
    fields: [
        FieldBuilder.MultiOption({
            id: "strategy",
            displayName: "Strategy",
            options: ["AND", "OR", "XOR"],
            initialValue: "OR",
            variant: "tab",
        }),
    ],
    inputs: [
        InputBuilder.UnresolvedList({
            id: "input",
            displayName: "Input",
            syncGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.UnresolvedList({
            id: "output",
            displayName: "Output",
            tooltip: "The accumulated result.",
            syncGroupId: "data"
        }),
        OutputBuilder.UnresolvedList({
            id: "state",
            displayName: "State",
            syncGroupId: "data"
        }),
    ],
});
