import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.SubWorkflow.ExposeOutputPort",
    displayName: "Expose Output Port",
    description: "Accepts an unresolved input port for external workflow output wiring.",
    icon: "LogOut",
    accent: "utility",
    fields: [],
    inputs: [
        InputBuilder.Unresolved({
            id: "input",
            displayName: "Input",
            polymorphicGroupId: "expose_output_port",
        }),
    ],
    outputs: [],
});