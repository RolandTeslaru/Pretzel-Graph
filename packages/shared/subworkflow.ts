import { Foundations, Workflow } from "./domain";

export type ExposedPorts = {
    inputs: Foundations.Port.Input[];
    outputs: Foundations.Port.Output[];
};

export const extractExposedPorts = (subworkflow: Workflow): ExposedPorts => {
    const inputs: Foundations.Port.Input[] = [];
    const outputs: Foundations.Port.Output[] = [];

    Object.values(subworkflow.data.nodes).forEach(node => {
        if (node.blueprintId === "Core.SubWorkflow.ExposeInputPort") {
            const port = node.outputs[0] as Foundations.Port;
            const requiredFieldId = "required" as Foundations.Field.Id;
            const isRequired = Boolean(subworkflow.data.staticValues[node.id]?.[requiredFieldId]);

            inputs.push({
                id: Foundations.Port.Input.Id.parse(node.id),
                displayName: node.displayName,
                variant: port.variant as Foundations.Port.ResolvedVariant,
                required: isRequired,
            });
        } else if (node.blueprintId === "Core.SubWorkflow.ExposeOutputPort") {
            const port = node.inputs[0] as Foundations.Port;

            outputs.push({
                id: Foundations.Port.Output.Id.parse(node.id),
                displayName: node.displayName,
                variant: port.variant as Foundations.Port.ResolvedVariant,
            });
        }
    });

    return { inputs, outputs };
};
