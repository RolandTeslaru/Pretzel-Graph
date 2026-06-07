import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.ConsoleLog",
    displayName: "Console Log",
    description: "Logs input data to the console with a specified log level.",
    icon: "SquareTerminal",
    accent: "utility",
    fields: [
        FieldBuilder.MultiOption({
            id: "level",
            displayName: "Level",
            options: [
                { value: "log", displayName: "Log" },
                { value: "info", displayName: "Info" },
                { value: "warn", displayName: "Warn" },
                { value: "error", displayName: "Error" },
            ],
            initialValue: "log",
            variant: "select"
        }),
        FieldBuilder.String({
            id: "prefix",
            displayName: "Prefix",
            initialValue: "",
            placeholder: "Optional prefix for the log message",
            required: false,
        })
    ],
    inputs: [
        InputBuilder.Message({
            id: "message",
            displayName: "Message",
            required: true,
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "output",
            displayName: "Output",
            tooltip: "Passes the input message through unchanged."
        }),
    ],
});
