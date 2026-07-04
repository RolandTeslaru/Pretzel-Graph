import type { Execution, Foundations, Workflow } from '@pretzel-graph/shared/domain';
import { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import type { WorkbenchSDK } from "../sdk";
import { nodeSelectors } from './node';

export interface InputSelectors {
    get:           (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => Port.Input | null
    hasEdge:       (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => boolean
    getProjection: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputPortId: Port.Input.Id, session: Execution.Session) => Foundations.Projection | undefined
}

export const inputSelectors = {
    get: (s, nodeId, inputId) => {
        const node = s.data.nodes[nodeId]
        if (!node) return null;

        const inputs = nodeSelectors.getInputs(s, nodeId);

        return inputs.find(i => i.id === inputId) ?? null;
    },
    hasEdge: (s, nodeId, inputId) => !!s.cache.inputHandlesMap[nodeId][inputId],
    getProjection: (s, nodeId, inputPortId, session) => {
        const edgeId = s.cache.inputHandlesMap[nodeId]?.[inputPortId];
        if (!edgeId) return undefined;

        const edge = s.data.edges[edgeId];
        if (!edge) return undefined;

        return session.node_output_projections[edge.source.nodeId]?.[edge.source.portId as Port.Output.Id];
    },
} satisfies InputSelectors
