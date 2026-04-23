import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@vx-agent-editor/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.Sleep",
    displayName: "Sleep",
    description: "Pauses execution for a specified duration.",
    icon: "Clock",
    accent: "utility",
    fields: [
        FieldBuilder.Integer({
            id: "duration",
            displayName: "Duration (ms)",
            initialValue: 1000,
            min: 0,
            tooltip: "Time to sleep in milliseconds."
        }),
    ],
    inputs: [
        InputBuilder.Unresolved({
            id: "trigger",
            displayName: "Trigger",
            required: false,
            tooltip: "Optional trigger to start the sleep.",
            polymorphicGroupId: "signal"
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved({
            id: "done",
            displayName: "Done",
            tooltip: "Outputs the trigger message after the sleep duration.",
            polymorphicGroupId: "signal"
        }),
    ],
});
