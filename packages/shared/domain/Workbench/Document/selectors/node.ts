import { Airlock } from "../../../Airlock";
import { Workflow } from "../../../Workflow";
import type { Execution } from "../../../Execution";
import type { Foundations } from "../../../Foundations";
import { Field } from "../../../Foundations/Field";
import type { Port } from "../../../Foundations/Port";
import type { Document } from "../index";
import { executionSelectors } from "./execution";
import type { Blueprint } from "../../../Foundations/Blueprint";

const EMPTY_CONNECTED_PORTS: Record<string, Workflow.Edge.Id> = {}

export interface NodeSelectors {
    get:              (document: Document, nodeId: Workflow.Node.Id) => Workflow.Node.Raw
    hasIssues:        (document: Document, nodeId: Workflow.Node.Id) => boolean
    isTool:           (document: Document, nodeId: Workflow.Node.Id) => boolean
    isSourceNode:     (document: Document, nodeId: Workflow.Node.Id) => boolean
    isSinkNode:       (document: Document, nodeId: Workflow.Node.Id) => boolean
    isIsolatedNode:   (document: Document, nodeId: Workflow.Node.Id) => boolean
    getConnectedPorts:    (document: Document, nodeId?: Workflow.Node.Id) => Record<Port.Input.Id, Workflow.Edge.Id>
    getIncomingEdges:     (document: Document, nodeId: Workflow.Node.Id) => Workflow.Edge[]
    getOutgoingEdges:     (document: Document, nodeId: Workflow.Node.Id) => Workflow.Edge[]
    getStaticValues:      (document: Document, nodeId: Workflow.Node.Id) => Record<Field.Id | Port.Id, any> | null
    getStaticValue:       (document: Document, nodeId: Workflow.Node.Id, id: Field.Id | Port.Input.Id, fallback?: Field.Value | null) => Field.Value | null
    // Legacy webhook-only `@`-sigil context. Temporary until webhook resolution moves onto Airlock.
    getLegacyExpressionContext: (document: Document, nodeId: Workflow.Node.Id, session?: Execution.Session) => LegacyExpressionContext
    getDependencyRef: (document: Document, nodeId: Workflow.Node.Id) => Workflow.Node.DependencyRef | null
    getDependency: (document: Document, nodeId: Workflow.Node.Id) => Workflow.Dependency | null
    hasDraftDependency: (document: Document, nodeId: Workflow.Node.Id) => boolean
    hasPublishedDependency: (document: Document, nodeId: Workflow.Node.Id) => boolean
    getDependencyUpdate: (document: Document, nodeId: Workflow.Node.Id) => [ 
        Workflow.Dependency.Publication.UpdateInfo | Workflow.Dependency.Draft.UpdateInfo,
        "draft" | "publication"
    ] | null

    getInputs: (document: Document, nodeId: Workflow.Node.Id) => Foundations.Port.Input[]
    getOutputs: (document: Document, nodeId: Workflow.Node.Id) => Foundations.Port.Output[]
    getFields: (document: Document, nodeId: Workflow.Node.Id) => readonly Foundations.Field[]
    getBlueprint: (document: Document, nodeId: Workflow.Node.Id) => Blueprint | null
    getUI: (document: Document, nodeId: Workflow.Node.Id) => NodeUI
    /** Nodes the run can elect as its entry point. Ids, not objects, so `shallow` holds. */
    getIgniteableNodes: (document: Document) => Workflow.Node.Id[]
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

// Neutral UI for a node whose data or blueprint is missing (deleted / not yet hydrated).
const FALLBACK_NODE_UI: NodeUI = {
    displayName: "Unknown Node",
    icon: "OctagonX",
    accent: "node-unknown",
    iconColor: "destructive",
    isMinimized: false,
    isFlipped: false,
}

export interface LegacyExpressionContext {
    node: Workflow.Node.Raw
    fields: Record<Field.Id, unknown>
    incoming: Record<string, unknown>
    workflowConfig: Record<Field.Id, unknown>
}

export const nodeSelectors: NodeSelectors = {
    get: (d, nodeId) => d.data.nodes[nodeId] ?? null,
    hasIssues: (d, nodeId) => {
        const nodeIssues = d.issues.nodes[nodeId];
        if (!nodeIssues)
            return false;

        return (
            Object.entries(nodeIssues.fields).length > 0 ||
            Object.entries(nodeIssues.inputs).length > 0 ||
            Object.entries(nodeIssues.credentials).length > 0
        );
    },
    isTool: (d, nodeId) => {
        return d.data.staticValues[nodeId]?.["isConvertedToTool" as Field.Id] === true;
    },
    isSourceNode: (d, nodeId) => {
        const incomingEdges = d.cache.incomingEdgesMap[nodeId];
        return incomingEdges ? Object.keys(incomingEdges).length === 0 : true;
    },
    isSinkNode: (d, nodeId) => {
        const outgoingEdges = d.cache.outgoingEdgesMap[nodeId];
        return outgoingEdges ? Object.keys(outgoingEdges).length === 0 : true;
    },
    isIsolatedNode: (d, nodeId) => {
        const incomingEdges = d.cache.incomingEdgesMap[nodeId];
        const outgoingEdges = d.cache.outgoingEdgesMap[nodeId];

        const hasNoIncoming = incomingEdges ? Object.keys(incomingEdges).length === 0 : true;
        const hasNoOutgoing = outgoingEdges ? Object.keys(outgoingEdges).length === 0 : true;

        return hasNoIncoming && hasNoOutgoing;
    },
    getConnectedPorts: (d, nodeId) => {
        if(nodeId)
            return d.cache.inputEdgesByPort[nodeId] ?? EMPTY_CONNECTED_PORTS
        return EMPTY_CONNECTED_PORTS
    },
    getIncomingEdges: (d, nodeId) =>
        Object.values(d.cache.incomingEdgesMap[nodeId] ?? {}).map(edgeId => d.cache.edges[edgeId]),
    getOutgoingEdges: (d, nodeId) =>
        Object.values(d.cache.outgoingEdgesMap[nodeId] ?? {}).map(edgeId => d.cache.edges[edgeId]),
    getStaticValues: (d, nodeId) => d.data.staticValues[nodeId] ?? null,
    getStaticValue: (d, nodeId, id, fallback = null) => d.data.staticValues[nodeId]?.[id] ?? fallback,
    getLegacyExpressionContext: (d, nodeId, session) => ({
        node: d.data.nodes[nodeId],
        fields: d.selectors.field.getValues(d, nodeId),
        incoming: executionSelectors.getNodeIncomingData(d, nodeId, session) ?? {},
        workflowConfig: Airlock.resolveWorkflowConfig(d.data),
    }),
    getDependencyRef: (d, nodeId) => d.data.nodes[nodeId]?.dependencyRef ?? null,
    getDependency: (d, nodeId) => {
        const ref = d.data.nodes[nodeId]?.dependencyRef;
        if (!ref) return null;
        const store = ref.mode === "publication" ? d.data.dependencies.published : d.data.dependencies.draft;
        return store[ref.workflowId] ?? null;
    },
    hasDraftDependency: (d, nodeId) => {
        const node = d.data.nodes[nodeId];
        if (!node?.dependencyRef)
            return false;
        
        const { workflowId, mode } = node.dependencyRef;
        if(!workflowId) 
            return false
        return mode === "draft" && workflowId in d.data.dependencies.draft;
    },
    hasPublishedDependency: (d, nodeId) => {
        const node = d.data.nodes[nodeId];
        if (!node?.dependencyRef) 
            return false;
        
        const { workflowId, mode } = node.dependencyRef;
        if(!workflowId) 
            return false
        return mode === "publication" && workflowId in d.data.dependencies.published;
    },
    getDependencyUpdate: (d, nodeId) => {
        const node = d.data.nodes[nodeId];

        if(node.dependencyRef){
            const { workflowId, mode } = node.dependencyRef;
            
            if(!workflowId) 
                return null

            if(mode === "publication"){
                const update = d.dependencyUpdates.published[workflowId] ?? null
                if(update)
                    return [update, "publication"]
            }
            
            if(mode === "draft"){
                const update = d.dependencyUpdates.draft[workflowId] ?? null
                if(update)
                    return [update, "draft"]
            }
        }
        
        return null
    },
    getInputs: (d, nodeId) => {
        return d.cache.resolvedShape[nodeId]?.inputs ?? [];
    },
    getOutputs: (d, nodeId) => {
        return d.cache.resolvedShape[nodeId]?.outputs ?? [];
    },
    getFields: (d, nodeId) => {
        return d.cache.resolvedShape[nodeId]?.fields ?? [];
    },
    getBlueprint: (d, nodeId) => {
        const node = d.data.nodes[nodeId];
        if (!node)
            return null;

        return d.selectors.blueprint.ofNode(d, node);
    },
    getIgniteableNodes: (d) => {
        return Object.values(d.data.nodes)
            .filter(node => !node.isDisabled)
            .filter(node => d.selectors.node.getBlueprint(d, node.id)?.igniter === true)
            .map(node => node.id);
    },
    getUI: (d, nodeId) => {
        const node = d.data.nodes[nodeId];
        const bp = node ? d.selectors.blueprint.ofNode(d, node) : undefined;
        // The node may have been deleted (stale id) or its blueprint not yet hydrated. Callers
        // render unconditionally, so hand back a neutral placeholder rather than null.
        if (!node || !bp)
            return FALLBACK_NODE_UI;

        // Subworkflow nodes take their identity from the attached dependency record; node-level
        // overrides still win, then the dependency, then the (generic container) blueprint.
        const dep = d.selectors.node.getDependency(d, nodeId);

        return {
            displayName: node?.ui?.displayName ?? dep?.display_name ?? bp.ui.displayName,
            description: node?.ui?.description ?? bp.ui.description,
            icon:        node?.ui?.icon      ?? dep?.icon   ?? bp.ui.icon,
            accent:      node?.ui?.accent    ?? dep?.accent ?? bp.ui.accent,
            iconColor:   node?.ui?.iconColor ?? bp.ui.iconColor,
            isMinimized: node?.ui?.isMinimized ?? false,
            isFlipped:   node?.ui?.isFlipped   ?? false,
        };
    },
}
