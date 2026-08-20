"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.SubWorkflow.ExposeInputPort",
    displayName: "Expose Input Port",
    description: "Exposes an unresolved output port for external workflow input wiring.",
    icon: "LogIn",
    accent: "utility",
    iconColor: "primary",
    fields: [
        // Both static-only: extractExposedPorts reads them to build the enclosing Execute
        // node's port shape, which happens in the editor with no airlock in sight.
        node_sdk_1.FieldBuilder.Boolean("required", "Required", {
            initialValue: false,
            only: "static"
        }),
        node_sdk_1.FieldBuilder.UniqueString("exposed_port_id", "Exposed Port ID", {
            prefix: "ExposedInputPort-",
            length: 5,
            required: false,
            only: "static"
        })
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.Unresolved("output", "Output", {
            polymorphicGroupId: "expose_input_port"
        }),
    ],
});
