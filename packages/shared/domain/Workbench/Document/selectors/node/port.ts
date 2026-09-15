import type { Workflow } from "../../../../Workflow";
import type { Foundations } from "../../../../Foundations";
import type { Port } from "../../../../Foundations/Port";
import type { Document } from "../../index";

const EMPTY_CONNECTED_PORTS: Record<string, Workflow.Edge.Id> = {}

export interface PortGroup {
    inputs:       Foundations.Port.Input[]
    outputs:      Foundations.Port.Output[]
    baseInput:    Foundations.Port.Input | null
    baseOutput:   Foundations.Port.Output | null
    addedInputs:  Foundations.Port.Input[]
    addedOutputs: Foundations.Port.Output[]
}

export interface NodePortSelectors {
    getInputs:    (document: Document, nodeId: Workflow.Node.Id) => Foundations.Port.Input[]
    getOutputs:   (document: Document, nodeId: Workflow.Node.Id) => Foundations.Port.Output[]
    /** One port group on a node: its live slots, the blueprint ports it grows from, and the slots added so far. */
    getGroup:     (document: Document, nodeId: Workflow.Node.Id, groupId: string) => PortGroup
    // Input port id to the edge connected to it.
    getConnected: (document: Document, nodeId?: Workflow.Node.Id) => Record<Port.Input.Id, Workflow.Edge.Id>
}

export const nodePortSelectors: NodePortSelectors = {
    getInputs: (d, nodeId) => {
        return d.cache.resolvedShape[nodeId]?.inputs ?? [];
    },
    getOutputs: (d, nodeId) => {
        return d.cache.resolvedShape[nodeId]?.outputs ?? [];
    },
    getGroup: (d, nodeId, groupId) => {
        const node      = d.data.nodes[nodeId];
        const blueprint = d.selectors.node.getBlueprint(d, nodeId);

        return {
            inputs:       d.selectors.node.ports.getInputs(d, nodeId).filter(i => i.groupId === groupId),
            outputs:      d.selectors.node.ports.getOutputs(d, nodeId).filter(o => o.groupId === groupId),
            baseInput:    blueprint?.inputs.find(i => i.groupId === groupId)  ?? null,
            baseOutput:   blueprint?.outputs.find(o => o.groupId === groupId) ?? null,
            addedInputs:  node?.addedInputs?.filter(i => i.groupId === groupId)  ?? [],
            addedOutputs: node?.addedOutputs?.filter(o => o.groupId === groupId) ?? [],
        };
    },
    getConnected: (d, nodeId) => {
        if(nodeId)
            return d.cache.inputEdgesByPort[nodeId] ?? EMPTY_CONNECTED_PORTS
        return EMPTY_CONNECTED_PORTS
    },
}
