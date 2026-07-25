import { defineBlueprint, FieldBuilder, InputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Terminate",
    displayName: "Terminate",
    description: "Ends the execution when reached. 'Stop' halts the run cleanly (terminated); 'Error' fails the run with a message.",
    icon: "OctagonX",
    accent: "group-routing",
    iconColor: "destructive",
    fields: [
        // mode drives the field schema via reconcile. Base (stop) needs no extra field;
        // error reconciles in `message`.
        FieldBuilder.reconciling(FieldBuilder.MultiOption("mode", "Mode", {
            variant: "tab",

            options: [
                { value: "stop", displayName: "Stop" },
                { value: "error", displayName: "Error" },
            ],

            initialValue: "stop",
            tooltip: "Stop → end the run cleanly. Error → fail the run with a message."
        })),
    ],
    inputs: [
        InputBuilder.Unresolved("trigger", "Trigger", {
            required: false,
            tooltip: "Reaching this input ends the execution.",
            polymorphicGroupId: "signal"
        }),
    ],
    outputs: [],
});
