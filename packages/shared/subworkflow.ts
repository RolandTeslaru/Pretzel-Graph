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
            const requiredFieldId = "required" as Field.Id;
            const isRequired = Boolean(wfData.staticValues[node.id]?.[requiredFieldId]);
            const portId = wfData.staticValues[node.id]?.["exposed_port_id" as Field.Id] as Port.Input.Id | undefined;

            const variant = Object.values(node.polymorphicResolutions ?? {})[0]

            if(!variant)
                throw new Error(`Exposed input port node ${node.id} is missing a polymorphic resolution.`);

            if(!portId)
                throw new Error(`Exposed input port node ${node.id} is missing the 'exposed_port_id' static value.`);

            uniqueInputPorts[portId] = {
                id: portId,
                displayName: node.ui.displayName,
                variant: variant,
                required: isRequired,
            } as Port.Input
        } else if (node.blueprintId === "Core.SubWorkflow.ExposeOutputPort") {
            const variant = Object.values(node.polymorphicResolutions ?? {})[0]

            if(!variant)
                throw new Error(`Exposed output port node ${node.id} is missing a polymorphic resolution.`);

            outputs.push({
                id: Port.Output.Id.parse(node.id),
                displayName: node.ui.displayName,
                variant: variant,
            } as Port.Output);
        }
    });

    inputs.push(...Object.values(uniqueInputPorts));

    return { inputs, outputs };
};
