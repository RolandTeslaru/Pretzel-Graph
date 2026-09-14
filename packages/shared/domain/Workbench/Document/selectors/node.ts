import type { Dependency } from "../../../Dependency";
import { Airlock } from "../../../Airlock";
import { Workflow } from "../../../Workflow";
import type { Execution } from "../../../Execution";
import type { Foundations } from "../../../Foundations";
import { Field } from "../../../Foundations/Field";
import type { Port } from "../../../Foundations/Port";
import type { Document } from "../index";
import { executionSelectors } from "./execution";
import { dependencySelectors } from "./dependency";
import type { Blueprint } from "../../../Foundations/Blueprint";

const EMPTY_CONNECTED_PORTS: Record<string, Workflow.Edge.Id> = {}

export interface PortGroup {
    inputs:       Foundations.Port.Input[]
    outputs:      Foundations.Port.Output[]
    baseInput:    Foundations.Port.Input | null
    baseOutput:   Foundations.Port.Output | null
    addedInputs:  Foundations.Port.Input[]
    addedOutputs: Foundations.Port.Output[]
}

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
    // Read plain workflow data only, so callers outside the editor can pass `{ data }`.
    getShapeDependencyRef: (document: { data: Pick<Workflow.Data, "staticValues"> }, nodeId: Workflow.Node.Id) => Dependency.Ref.Workflow | null
    getShapeDependency: (document: { data: Pick<Workflow.Data, "staticValues" | "dependencies"> }, nodeId: Workflow.Node.Id) => Dependency | null
    // The graph of the workflow the shape dependency points at.
    getShapeDependencyData: (document: { data: Pick<Workflow.Data, "staticValues" | "dependencies"> }, nodeId: Workflow.Node.Id) => Workflow.Data | null
    // Every WorkflowDependency field value on the node, the shape dependency included.
    getWorkflowDependencyRefs: (document: Document, nodeId: Workflow.Node.Id) => Dependency.Ref.Workflow[]
    hasDraftDependency: (document: Document, nodeId: Workflow.Node.Id) => boolean
    hasPublishedDependency: (document: Document, nodeId: Workflow.Node.Id) => boolean
    getDependencyUpdate: (document: Document, nodeId: Workflow.Node.Id) => [ 
        Dependency.Update.Publication | Dependency.Update.Draft,
        "draft" | "publication"
    ] | null

    getInputs: (document: Document, nodeId: Workflow.Node.Id) => Foundations.Port.Input[]
    getOutputs: (document: Document, nodeId: Workflow.Node.Id) => Foundations.Port.Output[]
    /** One port group on a node: its live slots, the blueprint ports it grows from, and the slots added so far. */
    getGroup: (document: Document, nodeId: Workflow.Node.Id, groupId: string) => PortGroup
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
    globalFields: Record<Field.Id, unknown>
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
        globalFields: Airlock.resolveGlobalFieldValues(d.data),
    }),
    getShapeDependencyRef: (d, nodeId) => {
        const value = d.data.staticValues[nodeId]?.[Workflow.Node.SHAPE_DEPENDENCY_FIELD_ID];

        return (value as unknown as Dependency.Ref.Workflow | undefined) ?? null;
    },
    getShapeDependency: (d, nodeId) => {
        const shapeDepRef = nodeSelectors.getShapeDependencyRef(d, nodeId);
        if (!shapeDepRef)
            return null;

        return dependencySelectors.getWorkflow(d, shapeDepRef.id, shapeDepRef.kind);
    },
    getShapeDependencyData: (d, nodeId) => {
        const shapeDepRef = nodeSelectors.getShapeDependencyRef(d, nodeId);
        if (!shapeDepRef)
            return null;

        if (shapeDepRef.kind === "draft")
            return d.data.dependencies.draftWorkflows[shapeDepRef.id]?.data ?? null;

        return d.data.dependencies.publishedWorkflows[shapeDepRef.id]?.workflow_data ?? null;
    },
    getWorkflowDependencyRefs: (d, nodeId) => {
        const values = d.data.staticValues[nodeId] ?? {};
        const ids    = new Set<Field.Id>([Workflow.Node.SHAPE_DEPENDENCY_FIELD_ID]);

        for (const field of d.selectors.node.getFields(d, nodeId))
            if (field.variant === "WorkflowDependency")
                ids.add(field.id);

        return [...ids]
            .map(id => values[id] as unknown as Dependency.Ref.Workflow | undefined)
            .filter((ref): ref is Dependency.Ref.Workflow => !!ref);
    },
    hasDraftDependency: (d, nodeId) => {
        const shapeDepRef = d.selectors.node.getShapeDependencyRef(d, nodeId);
        if (!shapeDepRef?.id)
            return false;

        return shapeDepRef.kind === "draft" && shapeDepRef.id in d.data.dependencies.draftWorkflows;
    },
    hasPublishedDependency: (d, nodeId) => {
        const shapeDepRef = d.selectors.node.getShapeDependencyRef(d, nodeId);
        if (!shapeDepRef?.id)
            return false;

        return shapeDepRef.kind !== "draft" && shapeDepRef.id in d.data.dependencies.publishedWorkflows;
    },
    getDependencyUpdate: (d, nodeId) => {
        const shapeDepRef = d.selectors.node.getShapeDependencyRef(d, nodeId);
        if (!shapeDepRef?.id)
            return null;

        if (shapeDepRef.kind !== "draft") {
            const update = d.dependencyUpdates.publishedWorkflows[shapeDepRef.id] ?? null
            if (update)
                return [update, "publication"]
        }

        if (shapeDepRef.kind === "draft") {
            const update = d.dependencyUpdates.draftWorkflows[shapeDepRef.id] ?? null
            if (update)
                return [update, "draft"]
        }

        return null
    },
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
            inputs:       d.selectors.node.getInputs(d, nodeId).filter(i => i.groupId === groupId),
            outputs:      d.selectors.node.getOutputs(d, nodeId).filter(o => o.groupId === groupId),
            baseInput:    blueprint?.inputs.find(i => i.groupId === groupId)  ?? null,
            baseOutput:   blueprint?.outputs.find(o => o.groupId === groupId) ?? null,
            addedInputs:  node?.addedInputs?.filter(i => i.groupId === groupId)  ?? [],
            addedOutputs: node?.addedOutputs?.filter(o => o.groupId === groupId) ?? [],
        };
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
        const dep = d.selectors.node.getShapeDependency(d, nodeId);

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
