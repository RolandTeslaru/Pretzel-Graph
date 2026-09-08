import type { Foundations } from "../../../Foundations";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export const portReducers: PortReducers = {
    addInput: (d, nodeId, port) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        if (!node) 
            return;

        node.addedInputs = node.addedInputs ?? [];

        node.addedInputs.push(port);
        d.reducers.cache.resolvedShape.recreate(d, nodeId);
    },
    removeInput: (d, nodeId, portId) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        if (!node) return;

        const edgeId = d.cache.inputEdgesByPort[nodeId]?.[portId];
        if (edgeId)
            d.reducers.edge.remove(d, edgeId);

        node.addedInputs = node.addedInputs?.filter(p => p.id !== portId)
        d.reducers.cache.resolvedShape.recreate(d, nodeId);
    },
    removeOutput: (d, nodeId, portId) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        if (!node) 
            return;

        const edgeId = d.cache.outputEdgesByPort[nodeId]?.[portId];
        if (edgeId)
            d.reducers.edge.remove(d, edgeId);

        node.addedOutputs = node.addedOutputs?.filter(p => p.id !== portId) as typeof node.addedOutputs;
        d.reducers.cache.resolvedShape.recreate(d, nodeId);
    },
    addOutput: (d, nodeId, port) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        if (!node) 
            return;

        node.addedOutputs = node.addedOutputs ?? [];
        node.addedOutputs.push(port as typeof node.addedOutputs[number]);
        d.reducers.cache.resolvedShape.recreate(d, nodeId);
    },
    setOutputDisplayName: (d, nodeId, portId, displayName) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        if (!node) return;

        const port = node.addedOutputs?.find(p => p.id === portId);
        if (port) 
            port.displayName = displayName;
        d.reducers.cache.resolvedShape.recreate(d, nodeId);
    },
}

type PortReducers = {
    addInput            : (document: Document, nodeId: Workflow.Node.Id, port: Foundations.Port.Input) => void;
    removeInput         : (document: Document, nodeId: Workflow.Node.Id, portId: Foundations.Port.Input.Id) => void;
    removeOutput        : (document: Document, nodeId: Workflow.Node.Id, portId: Foundations.Port.Output.Id) => void;
    addOutput           : (document: Document, nodeId: Workflow.Node.Id, port: Foundations.Port.Output) => void;
    setOutputDisplayName: (document: Document, nodeId: Workflow.Node.Id, portId: Foundations.Port.Output.Id, displayName: string) => void;
}
