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
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "output",
            displayName: "Output",
            tooltip: "The accumulated result.",
        }),
    ],
});
