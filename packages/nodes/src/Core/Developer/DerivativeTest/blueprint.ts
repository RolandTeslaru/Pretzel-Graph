import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

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
    fields: [
        FieldBuilder.MultiOption("shape", "Shape", {
            options: [
                { value: "text",   displayName: "Text",   description: "One string field, one data output." },
                { value: "number", displayName: "Number", description: "Numeric field with a nested rounding branch." },
                { value: "none",   displayName: "None",   description: "No branch — the bare base." },
            ],
            initialValue: "text",
            tooltip: "Selects which structure this node takes.",
        }),
    ],
    inputs:  [InputBuilder.Data("in", "In")],
    // Always emitted, whichever branch matches — proves outputs accumulate rather than replace.
    outputs: [OutputBuilder.Data("passthrough", "Passthrough")],

    "shape==text": {
        fields: [
            FieldBuilder.String("text", "Text", {
                initialValue: "hello",
                placeholder:  "Echoed to the output",
            }),
        ],
        // Branch-only input port — only wired when shape==text.
        inputs: [InputBuilder.Data("suffix", "Suffix")],
        outputs: [
            OutputBuilder.Data("value", "Value"),
            OutputBuilder.Integer("length", "Length"),
        ],
        ui: { icon: "Type" },
    },

    "shape==number": {
        fields: [
            FieldBuilder.Integer("amount", "Amount", { initialValue: 1 }),
            FieldBuilder.MultiOption("rounding", "Rounding", {
                options: [
                    { value: "none",  displayName: "None" },
                    { value: "fixed", displayName: "Fixed decimals" },
                ],
                initialValue: "none",
            }),
        ],
        // Same id as the text branch's — legal, since the two can never both match.
        outputs: [OutputBuilder.Data("value", "Value")],
        ui:      { icon: "Hash", displayName: "Derivative Test (numeric)" },

        // Nested, and the only condition on `rounding` — so the != complement stays disjoint.
        "rounding!=none": {
            fields: [
                FieldBuilder.Integer("decimals", "Decimals", { initialValue: 2, min: 0, max: 10 }),
            ],
            outputs: [OutputBuilder.Integer("precision", "Precision")],
        },
    },
});
