"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractExposedPorts = void 0;
const Port_1 = require("./domain/Foundations/Port");
const extractExposedPorts = (wfData) => {
    const inputs = [];
    const outputs = [];
    // Since multiple "ExposeInputPort" nodes can have the same port id, we need to ensure uniquness in the exposeure
    const uniqueInputPorts = {};
    Object.values(wfData.nodes).forEach(node => {
        if (node.blueprintId === "Core.SubWorkflow.ExposeInputPort") {
            const requiredFieldId = "required";
            const isRequired = Boolean(wfData.staticValues[node.id]?.[requiredFieldId]);
            const portId = wfData.staticValues[node.id]?.["exposed_port_id"];
            const variant = Object.values(node.polymorphicResolutions ?? {})[0];
            if (!variant)
                throw new Error(`Exposed input port node ${node.id} is missing a polymorphic resolution.`);
            if (!portId)
                throw new Error(`Exposed input port node ${node.id} is missing the 'exposed_port_id' static value.`);
            uniqueInputPorts[portId] = {
                id: portId,
                displayName: node.ui.displayName,
                variant: variant,
                required: isRequired,
            };
        }
        else if (node.blueprintId === "Core.SubWorkflow.ExposeOutputPort") {
            const variant = Object.values(node.polymorphicResolutions ?? {})[0];
            if (!variant)
                throw new Error(`Exposed output port node ${node.id} is missing a polymorphic resolution.`);
            outputs.push({
                id: Port_1.Port.Output.Id.parse(node.id),
                displayName: node.ui.displayName,
                variant: variant,
            });
        }
    });
    inputs.push(...Object.values(uniqueInputPorts));
    return { inputs, outputs };
};
exports.extractExposedPorts = extractExposedPorts;
