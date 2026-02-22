import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.Sleep",
    displayName: "Sleep",
    description: "Pauses execution for a specified duration.",
    icon: "Clock",
    accent: "port-null",
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
        InputBuilder.Message({
            id: "trigger",
            displayName: "Trigger",
            required: false,
            tooltip: "Optional trigger to start the sleep."
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "done",
            displayName: "Done",
            tooltip: "Outputs the trigger message after the sleep duration."
        }),
    ],
});
