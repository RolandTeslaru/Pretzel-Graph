"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Utils.List.Select",
    displayName: "Select Item",
    description: "Selects a single element from a list input.",
    icon: "Brackets",
    accent: "utility",
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("strategy", "Strategy", {
            options: [
                { value: "first" },
                { value: "last" },
                { value: "at_index" },
            ],
            initialValue: "first",
            variant: "tab"
        }),
        node_sdk_1.FieldBuilder.Integer("index", "Index", {
            initialValue: 0,
            tooltip: "Index of the element to select. Negative values count from the end."
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.UnresolvedList("list", "List", {
            required: true,
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.UnresolvedScalar("element", "Element", {
            polymorphicGroupId: "data"
        }),
    ],
});
