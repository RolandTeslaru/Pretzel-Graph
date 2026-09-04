import { defineBlueprint, defineTool, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.RunCode",
    displayName: "Run Code",
    description: "Runs sandboxed TypeScript over the incoming data ($in), this node ($node), the graph ($workflow), and the global fields ($globalFields).",
    icon: "Code",
    accent: "utility",
    iconColor: "color-emerald-400",
    toolCompatible: true,
    fields: [
        FieldBuilder.Script("code", "Code", {
            initialValue: "return { hello: \"world\" };"
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data("output", "Output", {}),
    ],

    "isConvertedToTool==true": defineTool({
        fields: [],
        inputs: [],
        outputs: [
            OutputBuilder.Tool("tool", "Run Code Tool", {
                tooltip: "A tool the agent can call; it writes the TypeScript and this node runs it in the sandbox with the same $ values a Code field gets."
            }),
        ],
    }),
});
