import { Foundations, Workflow } from "./domain";

export type ExposedPorts = {
    inputs: Foundations.Port.Input[];
    outputs: Foundations.Port.Output[];
};

export const extractExposedPorts = (subworkflow: Workflow): ExposedPorts => {
    const inputs: Foundations.Port.Input[] = [];
    const outputs: Foundations.Port.Output[] = [];

    // Since multiple "ExposeInputPort" nodes can have the same port id, we need to ensure uniquness in the exposeure
    const uniqueInputPorts: Record<Foundations.Port.Input.Id, Foundations.Port.Input> = {};

    Object.values(subworkflow.data.nodes).forEach(node => {
        if (node.blueprintId === "Core.SubWorkflow.ExposeInputPort") {
            const port = node.outputs[0] as Foundations.Port;
            const requiredFieldId = "required" as Foundations.Field.Id;
            const isRequired = Boolean(subworkflow.data.staticValues[node.id]?.[requiredFieldId]);
            const portId = subworkflow.data.staticValues[node.id]?.["exposed_port_id" as Foundations.Field.Id] as Foundations.Port.Input.Id | undefined;

            if(!portId)
                throw new Error(`Exposed input port node ${node.id} is missing the 'exposed_port_id' static value.`);

            uniqueInputPorts[portId] = {
                id: portId,
                displayName: node.displayName,
                variant: port.variant as Foundations.Port.ResolvedVariant,
                required: isRequired,
            }
        } else if (node.blueprintId === "Core.SubWorkflow.ExposeOutputPort") {
            const port = node.inputs[0] as Foundations.Port;

            outputs.push({
                id: Foundations.Port.Output.Id.parse(node.id),
                displayName: node.displayName,
                variant: port.variant as Foundations.Port.ResolvedVariant,
            });
        }
    });

    inputs.push(...Object.values(uniqueInputPorts));

    return { inputs, outputs };
};
