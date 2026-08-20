"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Routing.Accumulator",
    displayName: "Accumulator",
    description: "Collects inputs over multiple executions and emits the accumulated result.",
    icon: "GitPullRequestArrow",
    accent: "group-routing",
    fields: [
        {
            ...node_sdk_1.FieldBuilder.DEFAULTS.dataDependencyStrategyField,
            initialValue: "OR"
        }
    ],
    inputs: [
        node_sdk_1.InputBuilder.UnresolvedList("overwrite", "Overwrite", {
            polymorphicGroupId: "data"
        }),
        node_sdk_1.InputBuilder.UnresolvedList("append", "Append", {
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.UnresolvedList("state", "State", {
            tooltip: "The accumulated state.",
            polymorphicGroupId: "data"
        }),
        node_sdk_1.OutputBuilder.UnresolvedList("prevState", "Previous State", {
            tooltip: "The previous accumulated state.",
            polymorphicGroupId: "data"
        }),
    ],
});
