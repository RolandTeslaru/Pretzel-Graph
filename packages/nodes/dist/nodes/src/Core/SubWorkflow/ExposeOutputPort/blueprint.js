"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.SubWorkflow.ExposeOutputPort",
    displayName: "Expose Output Port",
    description: "Accepts an unresolved input port for external workflow output wiring.",
    icon: "LogOut",
    accent: "utility",
    iconColor: "primary",
    fields: [],
    inputs: [
        node_sdk_1.InputBuilder.Unresolved("input", "Input", {
            polymorphicGroupId: "expose_output_port"
        }),
    ],
    outputs: [],
});
