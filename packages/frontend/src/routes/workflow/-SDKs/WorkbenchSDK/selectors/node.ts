import { Airlock, type Execution, type Foundations, type Workflow } from '@pretzel-graph/shared/domain';
import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import type { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import type { WorkbenchSDK } from "../sdk";
import { executionSelectors } from "./execution";
import { ShelfSDK } from '../../ShelfSDK/sdk';
import { resolvePorts } from '../utils/resolvePorts';
import type { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint';

const EMPTY_CONNECTED_PORTS: Record<string, Workflow.Edge.Id> = {}

export interface NodeSelectors {
    get:              (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Workflow.Node
    hasIssues:        (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    isTool:           (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    isSourceNode:     (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    isSinkNode:       (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    isIsolatedNode:   (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    getConnectedPorts:    (state: WorkbenchSDK.State, nodeId?: Workflow.Node.Id) => Record<Port.Input.Id, Workflow.Edge.Id>
    getIncomingEdges:     (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Workflow.Edge[]
    getOutgoingEdges:     (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Workflow.Edge[]
    getStaticValues:      (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Record<Field.Id | Port.Id, any> | null
    // Legacy webhook-only `@`-sigil context. Temporary until webhook resolution moves onto Airlock.
    getLegacyExpressionContext: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, session?: Execution.Session) => LegacyExpressionContext
    hasDraftDependency: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    hasPublishedDependency: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    getDependencyUpdate: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => [ 
        Workflow.Dependency.Publication.UpdateInfo | Workflow.Dependency.Draft.UpdateInfo,
        "draft" | "publication"
    ] | null

    getInputs: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Foundations.Port.Input[]
    getOutputs: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Foundations.Port.Output[]
    getFields: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => readonly Foundations.Field[]
    getBlueprint: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Blueprint
    getUI: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => NodeUI
}

export type NodeUI = {
    displayName: string
    description?: string
    icon: string
    accent?: string
    iconColor?: string
    isMinimized: boolean
    isFlipped: boolean
}

export interface LegacyExpressionContext {
    node: Workflow.Node
    fields: Record<Field.Id, unknown>
    incoming: Record<string, unknown>
    workflowConfig: Record<Field.Id, unknown>
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
    getConnectedPorts: (s, nodeId) => {
        if(nodeId)
            return s.cache.inputHandlesMap[nodeId] ?? EMPTY_CONNECTED_PORTS
        return EMPTY_CONNECTED_PORTS
    },
    getIncomingEdges: (s, nodeId) =>
        Object.values(s.cache.incomingEdgesMap[nodeId] ?? {}).map(edgeId => s.data.edges[edgeId]),
    getOutgoingEdges: (s, nodeId) =>
        Object.values(s.cache.outgoingEdgesMap[nodeId] ?? {}).map(edgeId => s.data.edges[edgeId]),
    getStaticValues: (s, nodeId) => s.data.staticValues[nodeId] ?? null,
    getLegacyExpressionContext: (s, nodeId, session) => ({
        node: s.data.nodes[nodeId],
        fields: s.data.staticValues[nodeId] ?? {},
        incoming: executionSelectors.getNodeIncomingData(s, nodeId, session) ?? {},
        workflowConfig: Airlock.resolveWorkflowConfig(s.data),
    }),
    hasDraftDependency: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        if (!node?.dependency) 
            return false;
        
        const { workflowId, mode } = node.dependency;
        if(!workflowId) 
            return false
        return mode === "draft" && workflowId in s.data.dependencies.draft;
    },
    hasPublishedDependency: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        if (!node?.dependency) 
            return false;
        
        const { workflowId, mode } = node.dependency;
        if(!workflowId) 
            return false
        return mode === "publication" && workflowId in s.data.dependencies.published;
    },
    getDependencyUpdate: (s, nodeId) => {
        const node = s.data.nodes[nodeId];

        if(node.dependency){
            const { workflowId, mode } = node.dependency;
            
            if(!workflowId) 
                return null

            if(mode === "publication"){
                const update = s.dependencyUpdates.published[workflowId] ?? null
                if(update)
                    return [update, "publication"]
            }
            
            if(mode === "draft"){
                const update = s.dependencyUpdates.draft[workflowId] ?? null
                if(update)
                    return [update, "draft"]
            }
        }
        
        return null
    },
    getInputs: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        const blueprint = ShelfSDK.state.blueprints[node.reconciledBlueprintId ?? node.blueprintId];

        return resolvePorts(blueprint.inputs, node.addedInputs, node.polymorphicResolutions);
    },
    getOutputs: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        const blueprint = ShelfSDK.state.blueprints[node.reconciledBlueprintId ?? node.blueprintId];

        return resolvePorts(blueprint.outputs, node.addedOutputs, node.polymorphicResolutions);
    },
    getFields: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        const blueprint = ShelfSDK.state.blueprints[node.reconciledBlueprintId ?? node.blueprintId];

        return blueprint.fields;
    },
    getBlueprint: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        const blueprint = ShelfSDK.state.blueprints[node.reconciledBlueprintId ?? node.blueprintId];

        return blueprint;
    },
    getUI: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        const bp = ShelfSDK.state.blueprints[node.reconciledBlueprintId ?? node.blueprintId];

        return {
            displayName: node?.ui?.displayName ?? bp.ui.displayName,
            description: node?.ui?.description ?? bp.ui.description,
            icon:        node?.ui?.icon      ?? bp.ui.icon,
            accent:      node?.ui?.accent    ?? bp.ui.accent,
            iconColor:   node?.ui?.iconColor ?? bp.ui.iconColor,
            isMinimized: node?.ui?.isMinimized ?? false,
            isFlipped:   node?.ui?.isFlipped   ?? false,
        };
    },
} satisfies NodeSelectors
