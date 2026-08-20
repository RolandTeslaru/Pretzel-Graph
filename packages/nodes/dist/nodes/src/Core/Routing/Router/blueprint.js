"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const domain_1 = require("../../../../../shared/domain");
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Routing.Router",
    displayName: "Router",
    description: "Routes input to every output whose case is true — multiple branches can fire at once (fan-out).",
    icon: "ListTree",
    accent: "group-routing",
    fields: [
        node_sdk_1.FieldBuilder.CaseList("cases", "Cases", {
            tooltip: "List of cases to evaluate. All cases that evaluate to true will receive the input.",
            initialValue: [
                domain_1.Foundations.Field.CaseList.createEntry("case-1", "Case 1"),
                domain_1.Foundations.Field.CaseList.createEntry("case-2", "Case 2"),
                domain_1.Foundations.Field.CaseList.createEntry("case-3", "Case 3"),
            ]
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.Unresolved("input", "Input", {
            polymorphicGroupId: "condition"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Unresolved("case-1", "Case 1", {
            polymorphicGroupId: "condition"
        }),
        node_sdk_1.OutputBuilder.Unresolved("case-2", "Case 2", {
            polymorphicGroupId: "condition"
        }),
        node_sdk_1.OutputBuilder.Unresolved("case-3", "Case 3", {
            polymorphicGroupId: "condition"
        }),
    ],
});
