"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
// Exercises the derivative system end to end: nesting, per-branch fields, per-branch outputs,
// a ui override, and a != condition. `shape` is the only field on the base — everything else
// arrives from whichever branch matches.
//
// Sibling conditions in one scope must be mutually exclusive, or narrowing can't eliminate the
// overlap. Distinct `==` values are exclusive; a lone `!=` is too.
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Developer.DerivativeTest",
    displayName: "Derivative Test",
    description: "Sandbox node for exercising conditional blueprint structure.",
    icon: "GitBranch",
    accent: "utility",
    toolCompatible: true,
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("shape", "Shape", {
            options: [
                { value: "text", displayName: "Text", description: "One string field, one data output." },
                { value: "number", displayName: "Number", description: "Numeric field with a nested rounding branch." },
                { value: "none", displayName: "None", description: "No branch — the bare base." },
            ],
            initialValue: "text",
            tooltip: "Selects which structure this node takes.",
        }),
    ],
    inputs: [node_sdk_1.InputBuilder.Data("in", "In")],
    // Always emitted, whichever branch matches — proves outputs accumulate rather than replace.
    outputs: [node_sdk_1.OutputBuilder.Data("passthrough", "Passthrough")],
    "shape==text": {
        fields: [
            node_sdk_1.FieldBuilder.String("text", "Text", {
                initialValue: "hello",
                placeholder: "Echoed to the output",
            }),
        ],
        // Branch-only input port — only wired when shape==text.
        inputs: [node_sdk_1.InputBuilder.Data("suffix", "Suffix")],
        outputs: [
            node_sdk_1.OutputBuilder.Data("value", "Value"),
        ],
        ui: { icon: "Type" },
    },
    "shape==number": {
        fields: [
            node_sdk_1.FieldBuilder.Integer("amount", "Amount", { initialValue: 1 }),
            node_sdk_1.FieldBuilder.MultiOption("rounding", "Rounding", {
                options: [
                    { value: "none", displayName: "None" },
                    { value: "fixed", displayName: "Fixed decimals" },
                ],
                initialValue: "none",
            }),
        ],
        // Same id as the text branch's — legal, since the two can never both match.
        outputs: [node_sdk_1.OutputBuilder.Data("value", "Value")],
        ui: { icon: "Hash", displayName: "Derivative Test (numeric)" },
        // Nested, and the only condition on `rounding` — so the != complement stays disjoint.
        "rounding!=none": {
            fields: [
                node_sdk_1.FieldBuilder.Integer("decimals", "Decimals", { initialValue: 2, min: 0, max: 10 }),
            ],
        },
    },
    // Tool mode inverts the philosophy: nothing to select or derive — the node
    // exposes its surface and the agent picks. defineTool is terminal, so it replaces the run-mode
    // structure outright rather than layering onto it. No separate ToolBlueprint export.
    "isConvertedToTool==true": (0, node_sdk_1.defineTool)({
        fields: [
            node_sdk_1.FieldBuilder.Integer("defaultLength", "Default Length", {
                initialValue: 10,
                tooltip: "Fallback used when the agent doesn't supply one.",
            }),
        ],
        inputs: [],
        outputs: [node_sdk_1.OutputBuilder.Tool("tool", "Tool")],
        ui: { icon: "Wrench" },
    }),
});
