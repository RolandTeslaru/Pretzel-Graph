import { defineBlueprint, defineTool, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

// Exercises the derivative system end to end: nesting, per-branch fields, per-branch outputs,
// a ui override, and a != condition. `shape` is the only field on the base — everything else
// arrives from whichever branch matches.
//
// Sibling conditions in one scope must be mutually exclusive, or narrowing can't eliminate the
// overlap. Distinct `==` values are exclusive; a lone `!=` is too.
export const Blueprint = defineBlueprint({
    id: "Core.Developer.DerivativeTest",
    displayName: "Derivative Test",
    description: "Sandbox node for exercising conditional blueprint structure.",
    icon: "GitBranch",
    accent: "utility",
    toolCompatible: true,
    fields: [
        defineField.MultiOption("shape", "Shape", {
            options: [
                { value: "text",   displayName: "Text",   description: "One string field, one data output." },
                { value: "number", displayName: "Number", description: "Numeric field with a nested rounding branch." },
                { value: "none",   displayName: "None",   description: "No branch — the bare base." },
            ],
            initialValue: "text",
            tooltip: "Selects which structure this node takes.",
        }),
    ],
    inputs:  [defineInput.Data("in", "In")],
    // Always emitted, whichever branch matches — proves outputs accumulate rather than replace.
    outputs: [defineOutput.Data("passthrough", "Passthrough")],

    "shape==text": {
        fields: [
            defineField.String("text", "Text", {
                initialValue: "hello",
                placeholder:  "Echoed to the output",
            }),
        ],
        // Branch-only input port — only wired when shape==text.
        inputs: [defineInput.Data("suffix", "Suffix")],
        outputs: [
            defineOutput.Data("value", "Value"),
        ],
        ui: { icon: "Type" },
    },

    "shape==number": {
        fields: [
            defineField.Integer("amount", "Amount", { initialValue: 1 }),
            defineField.MultiOption("rounding", "Rounding", {
                options: [
                    { value: "none",  displayName: "None" },
                    { value: "fixed", displayName: "Fixed decimals" },
                ],
                initialValue: "none",
            }),
        ],
        // Same id as the text branch's — legal, since the two can never both match.
        outputs: [defineOutput.Data("value", "Value")],
        ui:      { icon: "Hash", displayName: "Derivative Test (numeric)" },

        // Nested, and the only condition on `rounding` — so the != complement stays disjoint.
        "rounding!=none": {
            fields: [
                defineField.Integer("decimals", "Decimals", { initialValue: 2, min: 0, max: 10 }),
            ],
        },
    },

    // Tool mode inverts the philosophy: nothing to select or derive — the node
    // exposes its surface and the agent picks. defineTool is terminal, so it replaces the run-mode
    // structure outright rather than layering onto it. No separate ToolBlueprint export.
    "isConvertedToTool==true": defineTool({
        fields: [
            defineField.Integer("defaultLength", "Default Length", {
                initialValue: 10,
                tooltip:      "Fallback used when the agent doesn't supply one.",
            }),
        ],
        inputs:  [],
        outputs: [defineOutput.Tool("tool", "Tool")],
        ui:      { icon: "Wrench" },
    }),
});
