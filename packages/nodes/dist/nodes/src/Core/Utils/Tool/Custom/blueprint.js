"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
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
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Utils.Tool.Custom",
    displayName: "Custom Tool",
    description: "An agent tool whose behaviour is defined by sandboxed JavaScript you write.",
    icon: "Hammer",
    accent: "port-Tool",
    fields: [
        node_sdk_1.FieldBuilder.String("toolName", "Tool Name", {
            initialValue: "custom_tool",
            placeholder: "snake_case name the model calls",
            tooltip: "The function name exposed to the model. Use snake_case, no spaces."
        }),
        node_sdk_1.FieldBuilder.String("toolDescription", "Description", {
            initialValue: "",
            multiline: true,
            placeholder: "Describe to the model what this tool does and when to use it.",
            tooltip: "Shown to the model — the clearer this is, the better the model calls the tool."
        }),
        node_sdk_1.FieldBuilder.Json("argsSchema", "Argument Schema", {
            initialValue: DEFAULT_SCHEMA,
            tooltip: "JSON Schema describing the arguments the model must supply. Converted to a Zod schema for validation."
        }),
        node_sdk_1.FieldBuilder.Script("code", "Code", {
            initialValue: DEFAULT_CODE
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.Tool("tool", "Tool", {
            tooltip: "A tool the agent can call; each call runs your code with the model's arguments."
        }),
    ],
});
