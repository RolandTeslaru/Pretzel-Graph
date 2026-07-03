import { Workflow } from "./domain";
import { Field } from "./domain/Foundations/Field";
import { Port } from "./domain/Foundations/Port";

export type ExposedPorts = {
    inputs: Port.Input[];
    outputs: Port.Output[];
};

export const extractExposedPorts = (wfData: Workflow.Data): ExposedPorts => {
    const inputs: Port.Input[] = [];
    const outputs: Port.Output[] = [];

    // Since multiple "ExposeInputPort" nodes can have the same port id, we need to ensure uniquness in the exposeure
    const uniqueInputPorts: Record<Port.Input.Id, Port.Input> = {};

    Object.values(wfData.nodes).forEach(node => {
        if (node.blueprintId === "Core.SubWorkflow.ExposeInputPort") {
            const port = node.outputs[0] as Port;
            const requiredFieldId = "required" as Field.Id;
            const isRequired = Boolean(wfData.staticValues[node.id]?.[requiredFieldId]);
            const portId = wfData.staticValues[node.id]?.["exposed_port_id" as Field.Id] as Port.Input.Id | undefined;

            if(!portId)
                throw new Error(`Exposed input port node ${node.id} is missing the 'exposed_port_id' static value.`);

            uniqueInputPorts[portId] = {
                id: portId,
                displayName: node.displayName,
                variant: port.variant,
                required: isRequired,
            } as Port.Input
        } else if (node.blueprintId === "Core.SubWorkflow.ExposeOutputPort") {
            const port = node.inputs[0] as Port;

            outputs.push({
                id: Port.Output.Id.parse(node.id),
                displayName: node.displayName,
                variant: port.variant,
            } as Port.Output);
        }
    });

    inputs.push(...Object.values(uniqueInputPorts));

    return { inputs, outputs };
};
