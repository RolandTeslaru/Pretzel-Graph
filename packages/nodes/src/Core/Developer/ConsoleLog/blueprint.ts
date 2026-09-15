import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.ConsoleLog",
    displayName: "Console Log",
    description: "Logs input data to the console with a specified log level.",
    icon: "SquareTerminal",
    accent: "utility",
    fields: [
        defineField.MultiOption("level", "Level", {
            options: [
                { value: "log", displayName: "Log" },
                { value: "info", displayName: "Info" },
                { value: "warn", displayName: "Warn" },
                { value: "error", displayName: "Error" },
            ],

            initialValue: "log",
            variant: "select"
        }),
        defineField.String("prefix", "Prefix", {
            initialValue: "",
            placeholder: "Optional prefix for the log message",
            required: false
        })
    ],
    inputs: [
        defineInput.Message("message", "Message", {
            required: true
        }),
    ],
    outputs: [
        defineOutput.Message("output", "Output", {
            tooltip: "Passes the input message through unchanged."
        }),
    ],
});
