"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Routing.Sleep",
    displayName: "Sleep",
    description: "Pauses execution for a specified duration.",
    icon: "Clock",
    accent: "utility",
    iconColor: "color-indigo-400",
    fields: [
        node_sdk_1.FieldBuilder.Integer("duration", "Duration (ms)", {
            initialValue: 1000,
            min: 0,
            tooltip: "Time to sleep in milliseconds."
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.Unresolved("trigger", "Trigger", {
            required: false,
            tooltip: "Optional trigger to start the sleep.",
            polymorphicGroupId: "signal"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Unresolved("done", "Done", {
            tooltip: "Outputs the trigger message after the sleep duration.",
            polymorphicGroupId: "signal"
        }),
    ],
});
