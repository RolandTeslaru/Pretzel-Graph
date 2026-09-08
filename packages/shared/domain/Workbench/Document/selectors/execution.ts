import type { Foundations } from "../../../Foundations";
import type { Execution } from "../../../Execution";
import type { Workflow } from "../../../Workflow";
import { Port } from "../../../Foundations/Port";
import type { Document } from "../index";
import { nodeSelectors } from './node';

export interface ExecutionSelectors {
    getNodeIncomingData: (document: Document, nodeId: Workflow.Node.Id, session?: Execution.Session) => Record<Port.Id, Foundations.Projection> | null
}

export const executionSelectors: ExecutionSelectors = {
    getNodeIncomingData: (d, nodeId, session) => {
        const node = d.data.nodes[nodeId];
        if (!node) return null;

        const incoming: Record<Port.Id, any> = {};

        const inputs = nodeSelectors.getInputs(d, nodeId);

        for (const input of inputs) {
            const projection = d.cache.inputEdgesByPort[nodeId]?.[input.id]
                ? (() => {
                    const edgeId = d.cache.inputEdgesByPort[nodeId]?.[input.id];
                    if (!edgeId)
                        return undefined;

                    const edge = d.cache.edges[edgeId];
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
}
