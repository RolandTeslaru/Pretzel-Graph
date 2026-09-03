import { Foundations } from "../../../../Foundations";
import { Validation } from "../../../../Validation";
import { Vault } from "../../../../Vault";
import { Workflow } from "../../../../Workflow";
import { cloneDeep } from 'lodash';
import type { Document } from "../../index";

type S      = Document
type NodeId = Workflow.Node.Id

/**
 * Folds a derivative blueprint against its own initial values, registering the result so the
 * node can resolve it by id. Returns null when there's no tree, or when nothing matched — in
 * both cases the base already is the answer.
 */
function resolveOnCreate(s: S, blueprint: Foundations.Blueprint) {
    if (!blueprint._derivatives?.length)
        return null;

    const { blueprint: derived, derivativeId } = Foundations.Blueprint.derive(blueprint, {});
    if (!derivativeId)
        return null;

    const id = Foundations.Blueprint.deriveId(blueprint, {});

    s.reducers.blueprint.registerAs(s, id, derived);

    return { id, blueprint: derived };
}


/**
 * Repoints a node at an already-folded derivative: removes edges on ports the new shape
 * dropped or changed the variant of, registers the fold, and rebuilds the node's shape.
 */
function applyDerivative(
    s:                     S,
    node:                  Workflow.Node.Raw,
    blueprint:             Foundations.Blueprint,
    reconciledBlueprintId: Foundations.Blueprint.ReconciledId,
) {
    s.isDirty = true;

    // A fold keeps its base's `id`, and `derive` resolves the base off the node itself, so
    // the node and the blueprint cannot disagree here.
    const nodeId = node.id;

    // Diff the node's current base ports against the derived ones (added ports are
    // untouched — they survive shape changes and aren't part of the blueprint diff).
    const oldBlueprint = s.selectors.blueprint.ofNode(s, node);
    if (!oldBlueprint)
        return;

    // --- Diff inputs: remove edges for removed/variant-changed inputs ---
    const newInputsById = new Map(blueprint.inputs.map(i => [i.id, i]));
    const inputEdges = s.cache.inputEdgesByPort[nodeId] ?? {};

    for (const oldInput of oldBlueprint.inputs) {
        const newInput = newInputsById.get(oldInput.id);
        const edgeId = inputEdges[oldInput.id];

        if (edgeId && (!newInput || newInput.variant !== oldInput.variant)) {
            s.reducers.edge.remove(s, edgeId);
        }
    }

    // --- Diff outputs: remove edges for removed/variant-changed outputs ---
    const newOutputsById = new Map(blueprint.outputs.map(o => [o.id, o]));
    const outputEdges = s.cache.outputEdgesByPort[nodeId] ?? {};

    for (const oldOutput of oldBlueprint.outputs) {
        const newOutput = newOutputsById.get(oldOutput.id);
        const edgeId = outputEdges[oldOutput.id];

        if (edgeId && (!newOutput || newOutput.variant !== oldOutput.variant))
            s.reducers.edge.remove(s, edgeId);
    }

    // Point the node at the resolved derivative; fields and ports now derive from it.
    s.reducers.blueprint.registerAs(s, reconciledBlueprintId, blueprint);
    node.reconciledBlueprintId = reconciledBlueprintId;
    s.reducers.cache.resolvedShape.recreate(s, nodeId);

    // Seed from existing values, then fill gaps with initialValue
    s.reducers.node.populateInitialValues(s, nodeId, blueprint.fields, blueprint.inputs);
}

export const nodeLifecycleReducers: NodeLifecycleReducers = {
    remove: (s, deletedNodeId) => {
        s.isDirty = true;
        const nodes = s.data.nodes
        const staticValues = s.data.staticValues

        const depRef = nodes[deletedNodeId]?.dependencyRef;

        // Delete all edges
        s.reducers.node.disconnect(s, deletedNodeId);

        if (nodes[deletedNodeId])
            delete nodes[deletedNodeId];

        delete staticValues[deletedNodeId];
        delete s.data.fieldExpressions[deletedNodeId];
        delete s.data.credentialInstanceIds[deletedNodeId];

        s.reducers.cache.deleteNode(s, deletedNodeId);
        s.reducers.layout.node.remove(s, deletedNodeId);
        s.reducers.node.clearIssues(s, deletedNodeId);

        if(depRef)
            s.reducers.dependency.removeUnused(s);
    },
    create: (s, blueprint, position, staticValues, credentialInstanceIds) => {
        s.isDirty = true;
        const nodeId = Workflow.Node.createId(blueprint.id);

        // Seeded before the node exists, so every later read resolves out of the document.
        s.reducers.blueprint.register(s, blueprint);

        // A derivative blueprint's initial values may already match a branch, so a freshly
        // created node has to start derived — the raw base is never a displayable state.
        const derived = resolveOnCreate(s, blueprint);

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

        s.data.nodes[nodeId] = newNode;

        const resolved = derived?.blueprint ?? blueprint;

        s.reducers.node.populateInitialValues(s, nodeId, resolved.fields, resolved.inputs, staticValues);
        s.reducers.node.populateCredentialInstances(s, nodeId, credentialInstanceIds);

        s.reducers.layout.node.add(s, nodeId, position);
        s.reducers.cache.createNode(s, newNode);
        s.reducers.node.validate(s, nodeId);

        return nodeId;
    },
    disconnect: (s, nodeId) => {
        s.isDirty = true;

        const inNodes = s.reducers.cache.ensureIncomingNodeEdges(s, nodeId);
        const outNodes = s.reducers.cache.ensureOutgoingNodeEdges(s, nodeId);

        Object.entries(inNodes).forEach(([_inNodeId, edgeId]) => {
            s.reducers.edge.remove(s, edgeId as Workflow.Edge.Id);
        })

        Object.entries(outNodes).forEach(([_outNodeId, edgeId]) => {
            s.reducers.edge.remove(s, edgeId as Workflow.Edge.Id);
        })

        // If the node has a polymorphic port group, unresolve it to restore the original variants of the polymorphic ports
        const node = s.data.nodes[nodeId];
        if (!node) return;
    },
    recreate: (s, nodeId, blueprint, credentialDefaults) => {
        const node = s.data.nodes[nodeId];
        if (!node)
            throw new Error(`Node ${nodeId} not found`);

        s.isDirty = true;
        s.reducers.blueprint.register(s, blueprint);

        // Save connected edges so we can reattch them after recreate, which wipes them
        const incomingEdges = s.selectors.node.getIncomingEdges(s, nodeId);
        const outgoingEdges = s.selectors.node.getOutgoingEdges(s, nodeId);

        // Capture before `remove` wipes them, so we can carry the user's values/credentials
        // across the recreate instead of losing them.
        const staticValues = s.data.staticValues[nodeId] ?? {};
        const credentialInstances = s.data.credentialInstanceIds[nodeId];

        const nodeLayout   = cloneDeep(s.selectors.layout.node.get(s, nodeId));
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
        s.data.nodes[nodeId].dependencyRef = undefined
        s.reducers.node.remove(s, nodeId)

        s.data.nodes[nodeId] = newNode;
        s.reducers.cache.createNode(s, newNode);

        // Restore the carried-over values/credentials (kept where keys still exist,
        // gaps filled with the new blueprint's defaults).
        s.reducers.node.populateInitialValues(s, nodeId, blueprint.fields, blueprint.inputs, staticValues);
        // Carried-over assignments win; defaults only fill credentials the new blueprint added.
        s.reducers.node.populateCredentialInstances(s, nodeId, { ...(credentialDefaults ?? {}), ...(credentialInstances ?? {}) });

        if (nodeLayout)
            s.reducers.layout.node.add(s, nodeId, nodeLayout);

        incomingEdges.forEach(oldEdge => {
            s.reducers.edge.create(s, {
                source: oldEdge.source.nodeId,
                sourceHandle: oldEdge.source.portId,
                target: oldEdge.target.nodeId,
                targetHandle: oldEdge.target.portId
            })
        })

        outgoingEdges.forEach(oldEdge => {
            s.reducers.edge.create(s, {
                source: oldEdge.source.nodeId,
                sourceHandle: oldEdge.source.portId,
                target: oldEdge.target.nodeId,
                targetHandle: oldEdge.target.portId
            })
        })


        // If the original node had a dependency, run GC now that the new node is fully
        // in place — removeUnused will correctly keep deps still referenced and clean up any that aren't.
        if (hadDependency)
            s.reducers.dependency.removeUnused(s);

        s.reducers.node.validate(s, nodeId);
    },
    duplicate: (s, originalNode, position?, overrides?) => {
        s.isDirty = true
        if (!position) {
            position = cloneDeep(s.selectors.layout.node.get(s, originalNode.id) ?? { x: 0, y: 0 })
            position.x += 40
            position.y += 40
        }
        const newNodeId = Workflow.Node.createId(originalNode.blueprintId)
        const newNode: Workflow.Node.Raw = { ...cloneDeep(originalNode), id: newNodeId }

        // Values default to the source node's live state, but callers (paste)
        // may pass a snapshot taken at copy time so later edits don't leak in.
        s.data.nodes[newNodeId] = newNode;
        s.data.staticValues[newNodeId] = cloneDeep(overrides?.staticValues ?? s.data.staticValues[originalNode.id]);
        s.data.fieldExpressions[newNodeId] = cloneDeep(overrides?.fieldExpressions ?? s.data.fieldExpressions[originalNode.id] ?? {});
        s.reducers.node.populateCredentialInstances(s, newNodeId, overrides?.credentialInstanceIds ?? s.data.credentialInstanceIds[originalNode.id]);

        s.reducers.layout.node.add(s, newNodeId, position);
        s.reducers.cache.createNode(s, newNode);
        s.reducers.node.validate(s, newNodeId);

        return newNode;
    },
    // Folds the node's base against `fieldValues` and repoints it at the result. The base is
    // read here rather than passed in, so a caller cannot supply a blueprint and a reconciled
    // id that disagree.
    derive: (s, nodeId, fieldValues) => {
        const node = s.data.nodes[nodeId];
        if (!node)
            throw new Error(`Node ${nodeId} not found`);

        // The BASE, not the node's current blueprint — derive() strips _derivatives from its
        // output, so re-deriving off an already-derived blueprint finds no tree.
        const base = s.selectors.blueprint.get(s, node.blueprintId);
        if (!base)
            return;

        const { blueprint } = Foundations.Blueprint.derive(base, fieldValues);
        const reconciledBlueprintId = Foundations.Blueprint.deriveId(base, fieldValues);

        applyDerivative(s, node, blueprint, reconciledBlueprintId);
    },
    wipe: (s, nodeId, replace = {}) => {
        const node = s.data.nodes[nodeId];
        if (!node) return;
        s.isDirty = true;

        s.reducers.node.disconnect(s, nodeId);
        s.reducers.cache.deleteNode(s, nodeId);

        const wiped: Workflow.Node.Raw = {
            blueprintId : node.blueprintId,
            ui: {
                displayName: "Wiped Node"
            },
            ...replace,
            id          : nodeId,
        };

        s.data.nodes[nodeId]    = wiped;
        s.data.staticValues[nodeId] = {};
        s.data.fieldExpressions[nodeId] = {};
        delete s.data.credentialInstanceIds[nodeId];

        s.reducers.cache.createNode(s, wiped);
        s.reducers.node.clearIssues(s, nodeId);
    },
    validate: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        if (!node){
            if(nodeId in s.issues)
                delete s.issues.nodes[nodeId];
            return
        }


        const nodeIssues = Validation.Issue.Node.check(
            node,
            s.data,
            s.cache,
        );

        if(!nodeIssues)
            delete s.issues.nodes[nodeId];
        else
            s.issues.nodes[nodeId] = nodeIssues;
    },
    clearIssues: (s, nodeId) => {
        delete s.issues.nodes[nodeId];
    },
}

export interface NodeLifecycleReducers {
    remove      : (s: S, nodeId: NodeId) => void;
    create      : (s: S, blueprint: Foundations.Blueprint, position: { x: number, y: number }, staticValues?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>, credentialInstanceIds?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>) => NodeId;
    disconnect  : (s: S, nodeId: NodeId) => void;
    recreate    : (s: S, nodeId: NodeId, blueprint: Foundations.Blueprint, credentialDefaults?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>) => void;
    duplicate   : (s: S, originalNode: Workflow.Node.Raw, position?: { x: number, y: number }, overrides?: {
        staticValues?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>;
        fieldExpressions?: Record<Foundations.Field.Id, boolean>;
        credentialInstanceIds?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>;
    }) => Workflow.Node.Raw;
    derive      : (s: S, nodeId: NodeId, fieldValues: Record<Foundations.Field.Id, Foundations.Field.Value>) => void;
    wipe        : (s: S, nodeId: NodeId, replace?: Partial<Workflow.Node.Raw>) => void;
    validate    : (s: S, nodeId: NodeId) => void;
    clearIssues : (s: S, nodeId: NodeId) => void;
}
