"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Routing.Terminate",
    displayName: "Terminate",
    description: "Ends the execution when reached. 'Stop' halts the run cleanly (terminated); 'Error' fails the run with a message.",
    icon: "OctagonX",
    accent: "group-routing",
    iconColor: "destructive",
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("mode", "Mode", {
            variant: "tab",
            options: [
                { value: "stop", displayName: "Stop" },
                { value: "error", displayName: "Error" },
            ],
            initialValue: "stop",
            tooltip: "Stop → end the run cleanly. Error → fail the run with a message."
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.Unresolved("trigger", "Trigger", {
            required: false,
            tooltip: "Reaching this input ends the execution.",
            polymorphicGroupId: "signal"
        }),
    ],
    outputs: [],
    "mode==stop": {},
    "mode==error": {
        fields: [
            node_sdk_1.FieldBuilder.String("message", "Error Message", {
                multiline: true,
                initialValue: "",
                placeholder: "Workflow terminated."
            }),
        ],
    },
});
