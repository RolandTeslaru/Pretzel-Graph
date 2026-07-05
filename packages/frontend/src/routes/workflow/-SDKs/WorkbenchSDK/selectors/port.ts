import type { Workflow } from '@pretzel-graph/shared/domain';
import { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import type { WorkbenchSDK } from "../sdk";
import { nodeSelectors } from './node';

export interface PortPolymorphismSelectors {
    getSiblings:   (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, portId: Port.Id) => Set<Port.Input | Port.Output>
    groupHasEdges: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, polymorphicGroupId: string) => boolean
    getResolvedVariantInGroup: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, polymorphicGroupId: string) => Port.Variant | null
}

export interface PortSelectors {
    polymorphism: PortPolymorphismSelectors
}

export const portSelectors = {
    polymorphism: {
        getSiblings: (s, nodeId, portId) => {
            const node = s.data.nodes[nodeId];
            let triggerPort;

            const inputs = nodeSelectors.getInputs(s, nodeId);
            const outputs = nodeSelectors.getOutputs(s, nodeId);

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
        getResolvedVariantInGroup: (s, nodeId, polymorphicGroupId) => {
            const node = s.data.nodes[nodeId];
            if (!node) return null;

            const inputs = nodeSelectors.getInputs(s, nodeId);
            const outputs = nodeSelectors.getOutputs(s, nodeId);

            const allPorts = [...inputs, ...outputs];
            const port = allPorts.find(port => port.polymorphicGroupId === polymorphicGroupId);
            if (!port) return null;

            return port.variant === "Unresolved" ? null : port.variant;
        },
        groupHasEdges: (s, nodeId, polymorphicGroupId) => {
            const node = s.data.nodes[nodeId];
            const inputHandles = s.cache.inputHandlesMap[nodeId];
            const outputHandles = s.cache.outputHandlesMap[nodeId];

            const inputs = nodeSelectors.getInputs(s, nodeId);
            const outputs = nodeSelectors.getOutputs(s, nodeId);

            for (const input of inputs) {
                if (Port.isPolymorphic(input) && input.polymorphicGroupId === polymorphicGroupId && inputHandles[input.id])
                    return true;
            }
            for (const output of outputs) {
                if (Port.isPolymorphic(output) && output.polymorphicGroupId === polymorphicGroupId && outputHandles[output.id])
                    return true;
            }
            return false;
        },
    }
} satisfies PortSelectors
