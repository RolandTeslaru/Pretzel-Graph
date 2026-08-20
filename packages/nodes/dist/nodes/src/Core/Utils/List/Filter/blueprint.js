"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Utils.List.Filter",
    displayName: "Filter",
    description: "Keeps only the list items for which the condition evaluates to true.",
    icon: "Funnel",
    accent: "utility",
    itemScope: "list",
    fields: [
        // Expression-only: a static condition can't reference $item, so the filter
        // would keep or drop the whole list.
        node_sdk_1.FieldBuilder.Boolean("condition", "Condition", {
            initialValue: true,
            only: "expression",
            itemScoped: true,
            tooltip: "Evaluated once per item — use $item for the current element, $in for the node's inputs."
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.UnresolvedList("list", "List", {
            required: true,
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.UnresolvedList("filtered", "Kept", {
            polymorphicGroupId: "data"
        }),
        node_sdk_1.OutputBuilder.UnresolvedList("discarded", "Discarded", {
            polymorphicGroupId: "data"
        }),
    ],
});
