import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.Eval",
    displayName: "Runtime Node Eval",
    description: "Dangerously executes a JavaScript script at node runtime.",
    icon: "SquareTerminal",
    accent: "utility",
    fields: [
        FieldBuilder.Script({
            id: "code",
            displayName: "Script",
            initialValue: "return 'Hello ' + inputs.input;",
        }),
    ],
    inputs: [
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
        }),
    ],
    outputs: [
        OutputBuilder.Text({
            id: "output",
            displayName: "Output",
        }),
    ],
});
