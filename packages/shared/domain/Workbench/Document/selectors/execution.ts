import type { Foundations, Execution, Workflow } from '@pretzel-graph/shared/domain';
import { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import type { WorkbenchSDK } from "../sdk";
import { nodeSelectors } from './node';

export interface ExecutionSelectors {
    getNodeIncomingData: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, session?: Execution.Session) => Record<Port.Id, Foundations.Projection> | null
}

export const executionSelectors = {
    getNodeIncomingData: (s, nodeId, session) => {
        const node = s.data.nodes[nodeId];
        if (!node) return null;

        const incoming: Record<Port.Id, any> = {};

        const inputs = nodeSelectors.getInputs(s, nodeId);

        for (const input of inputs) {
            const projection = s.cache.inputEdgesByPort[nodeId]?.[input.id]
                ? (() => {
                    const edgeId = s.cache.inputEdgesByPort[nodeId]?.[input.id];
                    if (!edgeId)
                        return undefined;

                    const edge = s.cache.edges[edgeId];
                    if (!edge)
                        return undefined;
                    if (!session)
                        return undefined;
                    return session.node_output_projections[edge.source.nodeId]?.[edge.source.portId as Port.Output.Id];
                })()
                : undefined
            if (projection !== undefined)
                incoming[input.id] = projection;
        }

        return Object.keys(incoming).length > 0 ? incoming : null;
    },
} satisfies ExecutionSelectors
