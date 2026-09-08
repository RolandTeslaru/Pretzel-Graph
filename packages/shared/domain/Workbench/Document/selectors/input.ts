import type { Execution } from "../../../Execution";
import type { Foundations } from "../../../Foundations";
import type { Validation } from "../../../Validation";
import type { Workflow } from "../../../Workflow";
import { Port } from "../../../Foundations/Port";
import type { Document } from "../index";
import { nodeSelectors } from './node';

export interface InputSelectors {
    get:           (document: Document, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => Port.Input | null
    hasEdge:       (document: Document, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => boolean
    getIssue:      (document: Document, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => Validation.Issue.Input | null
    getProjection: (document: Document, nodeId: Workflow.Node.Id, inputPortId: Port.Input.Id, session: Execution.Session) => Foundations.Projection | undefined
}

export const inputSelectors: InputSelectors = {
    get: (d, nodeId, inputId) => {
        const node = d.data.nodes[nodeId]
        if (!node) return null;

        const inputs = nodeSelectors.getInputs(d, nodeId);

        return inputs.find(i => i.id === inputId) ?? null;
    },
    hasEdge: (d, nodeId, inputId) => !!d.cache.inputEdgesByPort[nodeId][inputId],
    getIssue: (d, nodeId, inputId) => d.issues.nodes[nodeId]?.inputs[inputId] ?? null,
    getProjection: (d, nodeId, inputPortId, session) => {
        const edgeId = d.cache.inputEdgesByPort[nodeId]?.[inputPortId];
        if (!edgeId) return undefined;

        const edge = d.cache.edges[edgeId];
        if (!edge) return undefined;

        return session.node_output_projections[edge.source.nodeId]?.[edge.source.portId as Port.Output.Id];
    },
}
