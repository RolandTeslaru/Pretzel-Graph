import type { Workflow } from "../../../Workflow";
import { Port } from "../../../Foundations/Port";
import type { Document } from "../index";
import { nodeSelectors } from './node';

export interface PortPolymorphismSelectors {
    getSiblings:   (document: Document, nodeId: Workflow.Node.Id, portId: Port.Id) => Set<Port.Input | Port.Output>
    groupHasEdges: (document: Document, nodeId: Workflow.Node.Id, polymorphicGroupId: string) => boolean
    getResolvedVariantInGroup: (document: Document, nodeId: Workflow.Node.Id, polymorphicGroupId: string) => Port.Variant | null
}

export interface PortSelectors {
    polymorphism: PortPolymorphismSelectors
}

export const portSelectors: PortSelectors = {
    polymorphism: {
        getSiblings: (d, nodeId, portId) => {
            const node = d.data.nodes[nodeId];
            let triggerPort;

            const inputs = nodeSelectors.getInputs(d, nodeId);
            const outputs = nodeSelectors.getOutputs(d, nodeId);

            if (inputs.find(port => port.id === portId))
                triggerPort = inputs.find(port => port.id === portId);
            else
                triggerPort = outputs.find(port => port.id === portId);

            if (!triggerPort)
                throw new Error(`Port ${portId} not found`);

            if (!Port.isPolymorphic(triggerPort))
                throw new Error(`Port ${portId} is not dynamic`);

            const polymorphicGroupId = triggerPort.polymorphicGroupId
            const siblings = new Set<Port.Input | Port.Output>();

            inputs.forEach(input => {
                if (Port.isPolymorphic(input) && input.polymorphicGroupId === polymorphicGroupId)
                    siblings.add(input);
            })

            outputs.forEach(output => {
                if (Port.isPolymorphic(output) && output.polymorphicGroupId === polymorphicGroupId)
                    siblings.add(output);
            })

            return siblings;
        },
        getResolvedVariantInGroup: (d, nodeId, polymorphicGroupId) => {
            const node = d.data.nodes[nodeId];
            if (!node) return null;

            const inputs = nodeSelectors.getInputs(d, nodeId);
            const outputs = nodeSelectors.getOutputs(d, nodeId);

            const allPorts = [...inputs, ...outputs];
            const port = allPorts.find(port => port.polymorphicGroupId === polymorphicGroupId);
            if (!port) return null;

            return port.variant === "Unresolved" ? null : port.variant;
        },
        groupHasEdges: (d, nodeId, polymorphicGroupId) => {
            const node = d.data.nodes[nodeId];
            const inputEdges = d.cache.inputEdgesByPort[nodeId];
            const outputEdges = d.cache.outputEdgesByPort[nodeId];

            const inputs = nodeSelectors.getInputs(d, nodeId);
            const outputs = nodeSelectors.getOutputs(d, nodeId);

            for (const input of inputs) {
                if (Port.isPolymorphic(input) && input.polymorphicGroupId === polymorphicGroupId && inputEdges[input.id])
                    return true;
            }
            for (const output of outputs) {
                if (Port.isPolymorphic(output) && output.polymorphicGroupId === polymorphicGroupId && outputEdges[output.id])
                    return true;
            }
            return false;
        },
    }
}
