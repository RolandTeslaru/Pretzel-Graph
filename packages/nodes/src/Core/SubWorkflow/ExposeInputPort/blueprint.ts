import { Foundations } from "@pretzel-graph/shared/domain";
import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

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
        }),
        FieldBuilder.UniqueString({
            id: "exposed_port_id",
            displayName: "Exposed Port ID",
            prefix: "ExposedInputPort-",
            length: 5,
            required: false
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

