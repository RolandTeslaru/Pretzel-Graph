import { Foundations } from "@pretzel-graph/shared/domain";
import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.SubWorkflow.ExposeInputPort",
    displayName: "Expose Input Port",
    description: "Exposes an unresolved output port for external workflow input wiring.",
    icon: "LogIn",
    accent: "utility",
    iconColor: "primary",
    fields: [
        // Both static-only: extractExposedPorts reads them to build the enclosing Execute
        // node's port shape, which happens in the editor with no airlock in sight.
        defineField.Boolean("required", "Required", {
            initialValue: false,
            only: "static"
        }),
        defineField.UniqueString("exposed_port_id", "Exposed Port ID", {
            prefix: "ExposedInputPort-",
            length: 5,
            required: false,
            only: "static"
        })
    ],
    inputs: [],
    outputs: [
        defineOutput.Unresolved("output", "Output", {
            polymorphicGroupId: "expose_input_port"
        }),
    ],
});

