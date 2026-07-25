import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Sleep",
    displayName: "Sleep",
    description: "Pauses execution for a specified duration.",
    icon: "Clock",
    accent: "utility",
    iconColor: "color-indigo-400",
    fields: [
        FieldBuilder.Integer("duration", "Duration (ms)", {
            initialValue: 1000,
            min: 0,
            tooltip: "Time to sleep in milliseconds."
        }),
    ],
    inputs: [
        InputBuilder.Unresolved("trigger", "Trigger", {
            required: false,
            tooltip: "Optional trigger to start the sleep.",
            polymorphicGroupId: "signal"
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved("done", "Done", {
            tooltip: "Outputs the trigger message after the sleep duration.",
            polymorphicGroupId: "signal"
        }),
    ],
});
