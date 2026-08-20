"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Routing.IfElse",
    displayName: "If Else",
    description: "Routes input down one of two branches on a single true/false condition.",
    icon: "Split",
    accent: "group-routing",
    fields: [
        // Single boolean expression — pre-evaluated by evaluateFieldValues() to a real boolean
        // (coerced via the "Boolean" variant). Expression-only: a literal here would pin the
        // router to one branch forever.
        node_sdk_1.FieldBuilder.Boolean("condition", "Condition", {
            initialValue: true,
            only: "expression"
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.Unresolved("input", "Input", {
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Unresolved("true", "True", {
            tooltip: "Output when condition is true.",
            polymorphicGroupId: "data"
        }),
        node_sdk_1.OutputBuilder.Unresolved("false", "False", {
            tooltip: "Output when condition is false.",
            polymorphicGroupId: "data"
        }),
    ],
});
