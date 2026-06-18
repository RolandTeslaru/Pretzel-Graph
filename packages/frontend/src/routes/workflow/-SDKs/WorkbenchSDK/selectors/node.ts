import { Expression, type Execution, type Foundations, type Workflow } from '@pretzel-graph/shared/domain';
import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import type { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import type { WorkbenchSDK } from "../sdk";
import { executionSelectors } from "./execution";

const EMPTY_CONNECTED_PORTS: Record<string, Workflow.Edge.Id> = {}

export interface NodeSelectors {
    get:              (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Workflow.Node
    hasIssues:        (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    isTool:           (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    extractBlueprint: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Foundations.Blueprint | null
    isSourceNode:     (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    isSinkNode:       (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    isIsolatedNode:   (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    getConnectedPorts:    (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Record<Port.Input.Id, Workflow.Edge.Id>
    getIncomingEdges:     (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Workflow.Edge[]
    getOutgoingEdges:     (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Workflow.Edge[]
    getStaticValues:      (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Record<Field.Id | Port.Id, any> | null
    // Legacy `@`-sigil context — still feeds webhook field resolution (webhook-renderer). Slated
    // for removal alongside Expression.evaluate; not used by the Airlock `$` preview path.
    getExpressionContext: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, session?: Execution.Session) => Expression.Context
}

export const nodeSelectors = {
    get: (s, nodeId) => s.data.nodes[nodeId] ?? null,
    hasIssues: (s, nodeId) => {
        const nodeIssues = s.issues.nodes[nodeId];
        if (!nodeIssues)
            return false;

        return (
            Object.entries(nodeIssues.fields).length > 0 ||
            Object.entries(nodeIssues.inputs).length > 0
        );
    },
    isTool: (s, nodeId) => {
        return s.data.staticValues[nodeId]?.["isConvertedToTool" as Field.Id] === true;
    },
    extractBlueprint: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        if (!node) return null;

        return {
            id: node.blueprintId,
            displayName: node.displayName,
            icon: node.icon ?? "",
            accent: node.accent,
            description: node.description ?? "",
            fields: node.fields,
            inputs: node.inputs,
            outputs: node.outputs,
            toolCompatible: node.toolCompatible ?? false,
        }
    },
    isSourceNode: (s, nodeId) => {
        const incomingEdges = s.cache.incomingEdgesMap[nodeId];
        return incomingEdges ? Object.keys(incomingEdges).length === 0 : true;
    },
    isSinkNode: (s, nodeId) => {
        const outgoingEdges = s.cache.outgoingEdgesMap[nodeId];
        return outgoingEdges ? Object.keys(outgoingEdges).length === 0 : true;
    },
    isIsolatedNode: (s, nodeId) => {
        const incomingEdges = s.cache.incomingEdgesMap[nodeId];
        const outgoingEdges = s.cache.outgoingEdgesMap[nodeId];

        const hasNoIncoming = incomingEdges ? Object.keys(incomingEdges).length === 0 : true;
        const hasNoOutgoing = outgoingEdges ? Object.keys(outgoingEdges).length === 0 : true;

        return hasNoIncoming && hasNoOutgoing;
    },
    getConnectedPorts: (s, nodeId) => s.cache.inputHandlesMap[nodeId] ?? EMPTY_CONNECTED_PORTS,
    getIncomingEdges: (s, nodeId) =>
        Object.values(s.cache.incomingEdgesMap[nodeId] ?? {}).map(edgeId => s.data.edges[edgeId]),
    getOutgoingEdges: (s, nodeId) =>
        Object.values(s.cache.outgoingEdgesMap[nodeId] ?? {}).map(edgeId => s.data.edges[edgeId]),
    getStaticValues: (s, nodeId) => s.data.staticValues[nodeId] ?? null,
    getExpressionContext: (s, nodeId, session) => ({
        node: s.data.nodes[nodeId],
        fields: s.data.staticValues[nodeId] ?? {},
        incoming: executionSelectors.getNodeIncomingData(s, nodeId, session) ?? {},
        workflowConfig: Expression.resolveWorkflowConfig(s.data),
    }),
} satisfies NodeSelectors
