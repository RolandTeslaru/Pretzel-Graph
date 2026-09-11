import { defineBlueprint, defineField, defineOutput } from "@pretzel-graph/node-sdk";

const DEFAULT_SCHEMA = {
    type: "object",
    properties: {
        query: { type: "string", description: "What the agent wants to look up." },
    },
    required: ["query"],
};

const DEFAULT_CODE = [
    "// $in.args   — arguments the model chose (validated against the schema)",
    "// $in.inputs — data wired into this node's input ports",
    "return { echoed: $in.args.query };",
].join("\n");

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.Custom",
    displayName: "Custom Tool",
    description: "An agent tool whose behaviour is defined by sandboxed JavaScript you write.",
    icon: "Hammer",
    accent: "port-Tool",
    fields: [
        defineField.String("toolName", "Tool Name", {
            initialValue: "custom_tool",
            placeholder: "snake_case name the model calls",
            tooltip: "The function name exposed to the model. Use snake_case, no spaces."
        }),
        defineField.String("toolDescription", "Description", {
            initialValue: "",
            multiline: true,
            placeholder: "Describe to the model what this tool does and when to use it.",
            tooltip: "Shown to the model — the clearer this is, the better the model calls the tool."
        }),
        defineField.Json("argsSchema", "Argument Schema", {
            initialValue: DEFAULT_SCHEMA,
            tooltip: "JSON Schema describing the arguments the model must supply. Converted to a Zod schema for validation."
        }),
        defineField.Script("code", "Code", {
            initialValue: DEFAULT_CODE
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.Tool("tool", "Tool", {
            tooltip: "A tool the agent can call; each call runs your code with the model's arguments."
        }),
    ],
});

export type Blueprint = typeof Blueprint;
