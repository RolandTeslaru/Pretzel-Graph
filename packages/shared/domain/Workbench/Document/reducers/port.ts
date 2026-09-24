import type { Foundations } from "../../../Foundations";
import { Validation } from "../../../Validation";
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
        d.reducers.node.validate(d, nodeId);
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
        d.reducers.node.validate(d, nodeId);
    },
    updateInput: (d, nodeId, portId, port) => {
        d.isDirty = true;
        const node = d.data.nodes[nodeId];
        if (!node)
            return;

        const index = node.addedInputs?.findIndex(p => p.id === portId) ?? -1;
        if (!node.addedInputs || index === -1)
            return;

        const edgeId = d.cache.inputEdgesByPort[nodeId]?.[portId];
        const edge = edgeId ? d.cache.edges[edgeId] : undefined;
        if (edgeId)
            d.reducers.edge.remove(d, edgeId);

        node.addedInputs[index] = port;

        const values = d.data.staticValues[nodeId] as Record<string, unknown> | undefined;
        if (values && port.id !== portId && portId in values) {
            values[port.id] = values[portId];
            delete values[portId];
        }

        d.reducers.cache.resolvedShape.recreate(d, nodeId);

        if (edge) {
            const sourcePort = d.selectors.node.ports.getOutputs(d, edge.source.nodeId).find(o => o.id === edge.source.portId);
            if (Validation.arePortsCompatible(sourcePort, port))
                d.reducers.edge.create(d, {
                    source:       edge.source.nodeId,
                    sourceHandle: edge.source.portId,
                    target:       nodeId,
                    targetHandle: port.id,
                });
        }

        d.reducers.node.validate(d, nodeId);
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
    updateInput         : (document: Document, nodeId: Workflow.Node.Id, portId: Foundations.Port.Input.Id, port: Foundations.Port.Input) => void;
    removeOutput        : (document: Document, nodeId: Workflow.Node.Id, portId: Foundations.Port.Output.Id) => void;
    addOutput           : (document: Document, nodeId: Workflow.Node.Id, port: Foundations.Port.Output) => void;
    setOutputDisplayName: (document: Document, nodeId: Workflow.Node.Id, portId: Foundations.Port.Output.Id, displayName: string) => void;
}
