import { Foundations } from "../../../../Foundations";
import { Validation } from "../../../../Validation";
import { Vault } from "../../../../Vault";
import { Workflow } from "../../../../Workflow";
import { cloneDeep } from 'lodash';
import type { Document } from "../../index";

type NodeId = Workflow.Node.Id

/**
 * Folds a derivative blueprint against its own initial values, registering the result so the
 * node can resolve it by id. Returns null when there's no tree, or when nothing matched — in
 * both cases the base already is the answer.
 */
function resolveOnCreate(d: Document, blueprint: Foundations.Blueprint) {
    if (!blueprint._derivatives?.length)
        return null;

    const { blueprint: derived, derivativeId } = Foundations.Blueprint.derive(blueprint, {});
    if (!derivativeId)
        return null;

    const id = Foundations.Blueprint.deriveId(blueprint, {});

    d.reducers.blueprint.registerAs(d, id, derived);

    return { id, blueprint: derived };
}


/**
 * Repoints a node at an already-folded derivative: removes edges on ports the new shape
 * dropped or changed the variant of, registers the fold, and rebuilds the node's shape.
 */
function applyDerivative(
    d:                     Document,
    node:                  Workflow.Node.Raw,
    blueprint:             Foundations.Blueprint,
    reconciledBlueprintId: Foundations.Blueprint.ReconciledId,
) {
    d.isDirty = true;

    // A fold keeps its base's `id`, and `derive` resolves the base off the node itself, so
    // the node and the blueprint cannot disagree here.
    const nodeId = node.id;

    // Diff the node's current base ports against the derived ones (added ports are
    // untouched — they survive shape changes and aren't part of the blueprint diff).
    const oldBlueprint = d.selectors.blueprint.ofNode(d, node);
    if (!oldBlueprint)
        return;

    // --- Diff inputs: remove edges for removed/variant-changed inputs ---
    const newInputsById = new Map(blueprint.inputs.map(i => [i.id, i]));
    const inputEdges = d.cache.inputEdgesByPort[nodeId] ?? {};

    for (const oldInput of oldBlueprint.inputs) {
        const newInput = newInputsById.get(oldInput.id);
        const edgeId = inputEdges[oldInput.id];

        if (edgeId && (!newInput || newInput.variant !== oldInput.variant)) {
            d.reducers.edge.remove(d, edgeId);
        }
    }

    // --- Diff outputs: remove edges for removed/variant-changed outputs ---
    const newOutputsById = new Map(blueprint.outputs.map(o => [o.id, o]));
    const outputEdges = d.cache.outputEdgesByPort[nodeId] ?? {};

    for (const oldOutput of oldBlueprint.outputs) {
        const newOutput = newOutputsById.get(oldOutput.id);
        const edgeId = outputEdges[oldOutput.id];

        if (edgeId && (!newOutput || newOutput.variant !== oldOutput.variant))
            d.reducers.edge.remove(d, edgeId);
    }

    // Point the node at the resolved derivative; fields and ports now derive from it.
    d.reducers.blueprint.registerAs(d, reconciledBlueprintId, blueprint);
    node.reconciledBlueprintId = reconciledBlueprintId;
    d.reducers.cache.resolvedShape.recreate(d, nodeId);

    // Seed from existing values, then fill gaps with initialValue
    d.reducers.node.populateInitialValues(d, nodeId, blueprint.fields, blueprint.inputs);
}

export const nodeLifecycleReducers: NodeLifecycleReducers = {
    remove: (d, deletedNodeId) => {
        d.isDirty = true;
        const nodes = d.data.nodes
        const staticValues = d.data.staticValues

        const depRef = nodes[deletedNodeId]?.dependencyRef;

        // Delete all edges
        d.reducers.node.disconnect(d, deletedNodeId);

        if (nodes[deletedNodeId])
            delete nodes[deletedNodeId];

        delete staticValues[deletedNodeId];
        delete d.data.fieldExpressions[deletedNodeId];
        delete d.data.credentialInstanceIds[deletedNodeId];

        d.reducers.cache.deleteNode(d, deletedNodeId);
        d.reducers.layout.node.remove(d, deletedNodeId);
        d.reducers.node.clearIssues(d, deletedNodeId);

        if(depRef)
            d.reducers.dependency.removeUnused(d);
    },
    create: (d, blueprint, position, staticValues, credentialInstanceIds) => {
        d.isDirty = true;
        const nodeId = Workflow.Node.createId(blueprint.id);

        // Seeded before the node exists, so every later read resolves out of the document.
        d.reducers.blueprint.register(d, blueprint);

        // A derivative blueprint's initial values may already match a branch, so a freshly
        // created node has to start derived — the raw base is never a displayable state.
        const derived = resolveOnCreate(d, blueprint);

        const newNode: Workflow.Node.Raw = {
            id          : nodeId,
            blueprintId : blueprint.id,
            ui: {},
            dependencyRef : blueprint.dependencyRef,
            ...(derived && { reconciledBlueprintId: derived.id }),
        }


        try {
            Workflow.Node.Raw.Schema.parse(newNode)
        } catch (error) {
            console.error(error);
            throw new Error(`Node schema validation failed. Could not create node from blueprint id ${blueprint.id}.`)
        }

        d.data.nodes[nodeId] = newNode;

        const resolved = derived?.blueprint ?? blueprint;

        d.reducers.node.populateInitialValues(d, nodeId, resolved.fields, resolved.inputs, staticValues);
        d.reducers.node.populateCredentialInstances(d, nodeId, credentialInstanceIds);

        d.reducers.layout.node.add(d, nodeId, position);
        d.reducers.cache.createNode(d, newNode);
        d.reducers.node.validate(d, nodeId);

        return nodeId;
    },
    disconnect: (d, nodeId) => {
        d.isDirty = true;

        const inNodes = d.reducers.cache.ensureIncomingNodeEdges(d, nodeId);
        const outNodes = d.reducers.cache.ensureOutgoingNodeEdges(d, nodeId);

        Object.entries(inNodes).forEach(([_inNodeId, edgeId]) => {
            d.reducers.edge.remove(d, edgeId as Workflow.Edge.Id);
        })

        Object.entries(outNodes).forEach(([_outNodeId, edgeId]) => {
            d.reducers.edge.remove(d, edgeId as Workflow.Edge.Id);
        })

        // If the node has a polymorphic port group, unresolve it to restore the original variants of the polymorphic ports
        const node = d.data.nodes[nodeId];
        if (!node) return;
    },
    recreate: (d, nodeId, blueprint, credentialDefaults) => {
        const node = d.data.nodes[nodeId];
        if (!node)
            throw new Error(`Node ${nodeId} not found`);

        d.isDirty = true;
        d.reducers.blueprint.register(d, blueprint);

        // Save connected edges so we can reattch them after recreate, which wipes them
        const incomingEdges = d.selectors.node.getIncomingEdges(d, nodeId);
        const outgoingEdges = d.selectors.node.getOutgoingEdges(d, nodeId);

        // Capture before `remove` wipes them, so we can carry the user's values/credentials
        // across the recreate instead of losing them.
        const staticValues = d.data.staticValues[nodeId] ?? {};
        const credentialInstances = d.data.credentialInstanceIds[nodeId];

        const nodeLayout   = cloneDeep(d.selectors.layout.node.get(d, nodeId));
        const hadDependency = !!node.dependencyRef;

        const newNode: Workflow.Node.Raw = {
            id          : nodeId,
            blueprintId : blueprint.id,
            isDisabled  : node.isDisabled,
            ui          : node.ui,
            dependencyRef : node.dependencyRef ?? blueprint.dependencyRef,
        }

        const result = Workflow.Node.Raw.Schema.safeParse(newNode)
        if (!result.success)
            throw new Error(`Node schema validation failed. Could not recreate node from blueprint id ${blueprint.id}`)

        // Clear dependency before remove so it doesn't trigger dependencyReducers.removeUnused while the node
        // is temporarily absent — the dependency is already captured in newNode above.
        d.data.nodes[nodeId].dependencyRef = undefined
        d.reducers.node.remove(d, nodeId)

        d.data.nodes[nodeId] = newNode;
        d.reducers.cache.createNode(d, newNode);

        // Restore the carried-over values/credentials (kept where keys still exist,
        // gaps filled with the new blueprint's defaults).
        d.reducers.node.populateInitialValues(d, nodeId, blueprint.fields, blueprint.inputs, staticValues);
        // Carried-over assignments win; defaults only fill credentials the new blueprint added.
        d.reducers.node.populateCredentialInstances(d, nodeId, { ...(credentialDefaults ?? {}), ...(credentialInstances ?? {}) });

        if (nodeLayout)
            d.reducers.layout.node.add(d, nodeId, nodeLayout);

        incomingEdges.forEach(oldEdge => {
            d.reducers.edge.create(d, {
                source: oldEdge.source.nodeId,
                sourceHandle: oldEdge.source.portId,
                target: oldEdge.target.nodeId,
                targetHandle: oldEdge.target.portId
            })
        })

        outgoingEdges.forEach(oldEdge => {
            d.reducers.edge.create(d, {
                source: oldEdge.source.nodeId,
                sourceHandle: oldEdge.source.portId,
                target: oldEdge.target.nodeId,
                targetHandle: oldEdge.target.portId
            })
        })


        // If the original node had a dependency, run GC now that the new node is fully
        // in place — removeUnused will correctly keep deps still referenced and clean up any that aren't.
        if (hadDependency)
            d.reducers.dependency.removeUnused(d);

        d.reducers.node.validate(d, nodeId);
    },
    duplicate: (d, originalNode, position?, overrides?) => {
        d.isDirty = true
        if (!position) {
            position = cloneDeep(d.selectors.layout.node.get(d, originalNode.id) ?? { x: 0, y: 0 })
            position.x += 40
            position.y += 40
        }
        const newNodeId = Workflow.Node.createId(originalNode.blueprintId)
        const newNode: Workflow.Node.Raw = { ...cloneDeep(originalNode), id: newNodeId }

        // Values default to the source node's live state, but callers (paste)
        // may pass a snapshot taken at copy time so later edits don't leak in.
        d.data.nodes[newNodeId] = newNode;
        d.data.staticValues[newNodeId] = cloneDeep(overrides?.staticValues ?? d.data.staticValues[originalNode.id]);
        d.data.fieldExpressions[newNodeId] = cloneDeep(overrides?.fieldExpressions ?? d.data.fieldExpressions[originalNode.id] ?? {});
        d.reducers.node.populateCredentialInstances(d, newNodeId, overrides?.credentialInstanceIds ?? d.data.credentialInstanceIds[originalNode.id]);

        d.reducers.layout.node.add(d, newNodeId, position);
        d.reducers.cache.createNode(d, newNode);
        d.reducers.node.validate(d, newNodeId);

        return newNode;
    },
    // Folds the node's base against `fieldValues` and repoints it at the result. The base is
    // read here rather than passed in, so a caller cannot supply a blueprint and a reconciled
    // id that disagree.
    derive: (d, nodeId, fieldValues) => {
        const node = d.data.nodes[nodeId];
        if (!node)
            throw new Error(`Node ${nodeId} not found`);

        // The BASE, not the node's current blueprint — derive() strips _derivatives from its
        // output, so re-deriving off an already-derived blueprint finds no tree.
        const base = d.selectors.blueprint.get(d, node.blueprintId);
        if (!base)
            return;

        const { blueprint } = Foundations.Blueprint.derive(base, fieldValues);
        const reconciledBlueprintId = Foundations.Blueprint.deriveId(base, fieldValues);

        applyDerivative(d, node, blueprint, reconciledBlueprintId);
    },
    wipe: (d, nodeId, replace = {}) => {
        const node = d.data.nodes[nodeId];
        if (!node) return;
        d.isDirty = true;

        d.reducers.node.disconnect(d, nodeId);
        d.reducers.cache.deleteNode(d, nodeId);

        const wiped: Workflow.Node.Raw = {
            blueprintId : node.blueprintId,
            ui: {
                displayName: "Wiped Node"
            },
            ...replace,
            id          : nodeId,
        };

        d.data.nodes[nodeId]    = wiped;
        d.data.staticValues[nodeId] = {};
        d.data.fieldExpressions[nodeId] = {};
        delete d.data.credentialInstanceIds[nodeId];

        d.reducers.cache.createNode(d, wiped);
        d.reducers.node.clearIssues(d, nodeId);
    },
    validate: (d, nodeId) => {
        const node = d.data.nodes[nodeId];
        if (!node){
            if(nodeId in d.issues)
                delete d.issues.nodes[nodeId];
            return
        }


        const nodeIssues = Validation.Issue.Node.check(
            node,
            d.data,
            d.cache,
        );

        if(!nodeIssues)
            delete d.issues.nodes[nodeId];
        else
            d.issues.nodes[nodeId] = nodeIssues;
    },
    clearIssues: (d, nodeId) => {
        delete d.issues.nodes[nodeId];
    },
}

export interface NodeLifecycleReducers {
    remove      : (document: Document, nodeId: NodeId) => void;
    create      : (document: Document, blueprint: Foundations.Blueprint, position: { x: number, y: number }, staticValues?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>, credentialInstanceIds?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>) => NodeId;
    disconnect  : (document: Document, nodeId: NodeId) => void;
    recreate    : (document: Document, nodeId: NodeId, blueprint: Foundations.Blueprint, credentialDefaults?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>) => void;
    duplicate   : (document: Document, originalNode: Workflow.Node.Raw, position?: { x: number, y: number }, overrides?: {
        staticValues?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>;
        fieldExpressions?: Record<Foundations.Field.Id, boolean>;
        credentialInstanceIds?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>;
    }) => Workflow.Node.Raw;
    derive      : (document: Document, nodeId: NodeId, fieldValues: Record<Foundations.Field.Id, Foundations.Field.Value>) => void;
    wipe        : (document: Document, nodeId: NodeId, replace?: Partial<Workflow.Node.Raw>) => void;
    validate    : (document: Document, nodeId: NodeId) => void;
    clearIssues : (document: Document, nodeId: NodeId) => void;
}
