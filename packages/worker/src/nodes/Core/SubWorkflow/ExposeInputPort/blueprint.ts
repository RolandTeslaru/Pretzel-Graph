import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.SubWorkflow.ExposeInputPort",
    displayName: "Expose Input Port",
    description: "Exposes an unresolved output port for external workflow input wiring.",
    icon: "LogIn",
    accent: "utility",
    fields: [
        FieldBuilder.Boolean({
            id: "required",
            displayName: "Required",
            initialValue: false
        })
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Unresolved({
            id: "output",
            displayName: "Output",
            polymorphicGroupId: "expose_input_port",
        }),
    ],
});