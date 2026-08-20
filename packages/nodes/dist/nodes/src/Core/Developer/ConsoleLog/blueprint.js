"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Developer.ConsoleLog",
    displayName: "Console Log",
    description: "Logs input data to the console with a specified log level.",
    icon: "SquareTerminal",
    accent: "utility",
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("level", "Level", {
            options: [
                { value: "log", displayName: "Log" },
                { value: "info", displayName: "Info" },
                { value: "warn", displayName: "Warn" },
                { value: "error", displayName: "Error" },
            ],
            initialValue: "log",
            variant: "select"
        }),
        node_sdk_1.FieldBuilder.String("prefix", "Prefix", {
            initialValue: "",
            placeholder: "Optional prefix for the log message",
            required: false
        })
    ],
    inputs: [
        node_sdk_1.InputBuilder.Message("message", "Message", {
            required: true
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Message("output", "Output", {
            tooltip: "Passes the input message through unchanged."
        }),
    ],
});
