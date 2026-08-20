"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Utils.List.Slice",
    displayName: "Slice",
    description: "Returns a sub-array from a list using start and end indices.",
    icon: "Scissors",
    accent: "utility",
    fields: [
        node_sdk_1.FieldBuilder.Integer("start", "Start", {
            initialValue: 0,
            tooltip: "Start index (inclusive). Negative values count from the end."
        }),
        node_sdk_1.FieldBuilder.Integer("end", "End", {
            required: false,
            tooltip: "End index (exclusive). Leave empty to slice to the end of the list. Negative values count from the end."
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.UnresolvedList("list", "List", {
            required: true,
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.UnresolvedList("slice", "Slice", {
            polymorphicGroupId: "data"
        }),
    ],
});
