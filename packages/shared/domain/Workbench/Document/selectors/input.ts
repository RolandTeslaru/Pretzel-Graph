import type { Execution } from "../../../Execution";
import type { Foundations } from "../../../Foundations";
import type { Validation } from "../../../Validation";
import type { Workflow } from "../../../Workflow";
import { Port } from "../../../Foundations/Port";
import type { Document } from "../index";
import { nodeSelectors } from './node';

export interface InputSelectors {
    get:           (state: Document, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => Port.Input | null
    hasEdge:       (state: Document, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => boolean
    getIssue:      (state: Document, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => Validation.Issue.Input | null
    getProjection: (state: Document, nodeId: Workflow.Node.Id, inputPortId: Port.Input.Id, session: Execution.Session) => Foundations.Projection | undefined
}

export const inputSelectors: InputSelectors = {
    get: (s, nodeId, inputId) => {
        const node = s.data.nodes[nodeId]
        if (!node) return null;

        const inputs = nodeSelectors.getInputs(s, nodeId);

        return inputs.find(i => i.id === inputId) ?? null;
    },
    hasEdge: (s, nodeId, inputId) => !!s.cache.inputEdgesByPort[nodeId][inputId],
    getIssue: (s, nodeId, inputId) => s.issues.nodes[nodeId]?.inputs[inputId] ?? null,
    getProjection: (s, nodeId, inputPortId, session) => {
        const edgeId = s.cache.inputEdgesByPort[nodeId]?.[inputPortId];
        if (!edgeId) return undefined;

        const edge = s.cache.edges[edgeId];
        if (!edge) return undefined;

        return session.node_output_projections[edge.source.nodeId]?.[edge.source.portId as Port.Output.Id];
    },
}
