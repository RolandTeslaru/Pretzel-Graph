import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.RunCode",
    displayName: "Run Code",
    description: "Runs sandboxed JavaScript with access to the incoming data via $in.",
    icon: "FileCode",
    accent: "utility",
    iconColor: "color-emerald-400",
    fields: [
        FieldBuilder.Script({
            id: "code",
            displayName: "Code",
            initialValue: "return { hello: \"world\" };",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data({
            id: "output",
            displayName: "Output",
        }),
    ],
});
