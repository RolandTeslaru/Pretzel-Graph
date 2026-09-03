import type { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";

export const portReducers = {
    addInput: (s, nodeId, port) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node) 
            return;

        node.addedInputs = node.addedInputs ?? [];

        node.addedInputs.push(port);
        s.reducers.cache.resolvedShape.recreate(s, nodeId);
    },
    removeInput: (s, nodeId, portId) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node) return;

        const edgeId = s.cache.inputEdgesByPort[nodeId]?.[portId];
        if (edgeId)
            s.reducers.edge.remove(s, edgeId);

        node.addedInputs = node.addedInputs?.filter(p => p.id !== portId)
        s.reducers.cache.resolvedShape.recreate(s, nodeId);
    },
    removeOutput: (s, nodeId, portId) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node) 
            return;

        const edgeId = s.cache.outputEdgesByPort[nodeId]?.[portId];
        if (edgeId)
            s.reducers.edge.remove(s, edgeId);

        node.addedOutputs = node.addedOutputs?.filter(p => p.id !== portId) as typeof node.addedOutputs;
        s.reducers.cache.resolvedShape.recreate(s, nodeId);
    },
    addOutput: (s, nodeId, port) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node) 
            return;

        node.addedOutputs = node.addedOutputs ?? [];
        node.addedOutputs.push(port as typeof node.addedOutputs[number]);
        s.reducers.cache.resolvedShape.recreate(s, nodeId);
    },
    setOutputDisplayName: (s, nodeId, portId, displayName) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node) return;

        const port = node.addedOutputs?.find(p => p.id === portId);
        if (port) 
            port.displayName = displayName;
        s.reducers.cache.resolvedShape.recreate(s, nodeId);
    },
} satisfies PortReducers

type PortReducers = {
    addInput            : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, port: Foundations.Port.Input) => void;
    removeInput         : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, portId: Foundations.Port.Input.Id) => void;
    removeOutput        : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, portId: Foundations.Port.Output.Id) => void;
    addOutput           : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, port: Foundations.Port.Output) => void;
    setOutputDisplayName: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, portId: Foundations.Port.Output.Id, displayName: string) => void;
}
