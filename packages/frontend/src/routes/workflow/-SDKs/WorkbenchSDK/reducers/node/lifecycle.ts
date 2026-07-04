import { Foundations, Validation, Vault, Workflow } from "@pretzel-graph/shared/domain";
import { cloneDeep } from 'lodash';
import type { WorkbenchSDK } from "../../sdk";
import { ShelfSDK } from "../../../ShelfSDK/sdk";

type S      = WorkbenchSDK.State
type NodeId = Workflow.Node.Id

export const nodeLifecycleReducers = {
    remove: (s, deletedNodeId) => {
        s.isDirty = true;
        const nodes = s.data.nodes
        const staticValues = s.data.staticValues

        const dependency = nodes[deletedNodeId]?.dependency;

        // Delete all edges
        s.reducers.node.disconnect(s, deletedNodeId);

        if (nodes[deletedNodeId])
            delete nodes[deletedNodeId];

        delete staticValues[deletedNodeId];
        delete s.data.credentialInstanceIds[deletedNodeId];

        s.reducers.cache.deleteNode(s, deletedNodeId);
        s.reducers.layout.node.remove(s, deletedNodeId);
        s.reducers.node.clearIssues(s, deletedNodeId);

        if(dependency)
            s.reducers.dependency.removeUnused(s);
    },
    create: (s, blueprint, position, staticValues) => {
        s.isDirty = true;
        const nodeId = Workflow.Node.createId(blueprint.id);
        const newNode: Workflow.Node = {
            id          : nodeId,
            blueprintId : blueprint.id,
            ui: {},
            dependency  : blueprint.dependency,
        }


        try {
            Workflow.Node.Schema.parse(newNode)
        } catch (error) {
            console.error(error);
            throw new Error(`Node schema validation failed. Could not create node from blueprint id ${blueprint.id}.`)
        }

        s.data.nodes[nodeId] = newNode;

        s.reducers.node.populateInitialValues(s, nodeId, blueprint.fields, blueprint.inputs, staticValues);
        s.reducers.node.populateCredentialInstances(s, nodeId);

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
    recreate: (s, nodeId, blueprint) => {
        const node = s.data.nodes[nodeId];
        if (!node)
            throw new Error(`Node ${nodeId} not found`);

        s.isDirty = true;

        // Save connected edges so we can reattch them after recreate, which wipes them
        const incomingEdges = s.selectors.node.getIncomingEdges(s, nodeId);
        const outgoingEdges = s.selectors.node.getOutgoingEdges(s, nodeId);

        // Capture before `remove` wipes them, so we can carry the user's values/credentials
        // across the recreate instead of losing them.
        const staticValues = s.data.staticValues[nodeId] ?? {};
        const credentialInstances = s.data.credentialInstanceIds[nodeId];

        const nodeLayout   = cloneDeep(s.selectors.layout.node.get(s, nodeId));
        const hadDependency = !!node.dependency;

        const newNode: Workflow.Node = {
            id          : nodeId,
            blueprintId : blueprint.id,
            isDisabled  : node.isDisabled,
            ui          : node.ui,
            dependency  : node.dependency ?? blueprint.dependency,
        }

        const result = Workflow.Node.Schema.safeParse(newNode)
        if (!result.success)
            throw new Error(`Node schema validation failed. Could not recreate node from blueprint id ${blueprint.id}`)

        // Clear dependency before remove so it doesn't trigger dependencyReducers.removeUnused while the node
        // is temporarily absent — the dependency is already captured in newNode above.
        s.data.nodes[nodeId].dependency = undefined
        s.reducers.node.remove(s, nodeId)

        s.data.nodes[nodeId] = newNode;
        s.reducers.cache.createNode(s, newNode);

        // Restore the carried-over values/credentials (kept where keys still exist,
        // gaps filled with the new blueprint's defaults).
        s.reducers.node.populateInitialValues(s, nodeId, blueprint.fields, blueprint.inputs, staticValues);
        s.reducers.node.populateCredentialInstances(s, nodeId, credentialInstances);

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
        const newNode: Workflow.Node = { ...cloneDeep(originalNode), id: newNodeId }

        // Values default to the source node's live state, but callers (paste)
        // may pass a snapshot taken at copy time so later edits don't leak in.
        s.data.nodes[newNodeId] = newNode;
        s.data.staticValues[newNodeId] = cloneDeep(overrides?.staticValues ?? s.data.staticValues[originalNode.id]);
        s.reducers.node.populateCredentialInstances(s, newNodeId, overrides?.credentialInstanceIds ?? s.data.credentialInstanceIds[originalNode.id]);

        s.reducers.layout.node.add(s, newNodeId, position);
        s.reducers.cache.createNode(s, newNode);
        s.reducers.node.validate(s, newNodeId);

        return newNode;
    },
    reconcile: (s, nodeId, blueprint, reconciledBlueprintId) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node)
            throw new Error(`Node ${blueprint.id} not found`);

        if (node.blueprintId !== blueprint.id)
            throw new Error(`Node ${nodeId} is not of type ${blueprint.id}`);

        // Diff the node's current base ports against the reconciled ones (added ports are
        // untouched — they survive reconcile and aren't part of the blueprint diff).
        const oldBlueprint = ShelfSDK.state.blueprints[node.reconciledBlueprintId ?? node.blueprintId];

        // --- Diff inputs: remove edges for removed/variant-changed inputs ---
        const newInputsById = new Map(blueprint.inputs.map(i => [i.id, i]));
        const inputHandles = s.cache.inputHandlesMap[nodeId] ?? {};

        for (const oldInput of oldBlueprint.inputs) {
            const newInput = newInputsById.get(oldInput.id);
            const edgeId = inputHandles[oldInput.id];

            if (edgeId && (!newInput || newInput.variant !== oldInput.variant)) {
                s.reducers.edge.remove(s, edgeId);
            }
        }

        // --- Diff outputs: remove edges for removed/variant-changed outputs ---
        const newOutputsById = new Map(blueprint.outputs.map(o => [o.id, o]));
        const outputHandles = s.cache.outputHandlesMap[nodeId] ?? {};

        for (const oldOutput of oldBlueprint.outputs) {
            const newOutput = newOutputsById.get(oldOutput.id);
            const edgeId = outputHandles[oldOutput.id];

            if (edgeId && (!newOutput || newOutput.variant !== oldOutput.variant))
                s.reducers.edge.remove(s, edgeId);
        }

        // Point the node at the reconciled blueprint; fields/ports now derive from it.
        node.reconciledBlueprintId = reconciledBlueprintId;

        // Seed from existing values, then fill gaps with initialValue
        s.reducers.node.populateInitialValues(s, nodeId, blueprint.fields, blueprint.inputs);
    },
    wipe: (s, nodeId, replace = {}) => {
        const node = s.data.nodes[nodeId];
        if (!node) return;
        s.isDirty = true;

        s.reducers.node.disconnect(s, nodeId);
        s.reducers.cache.deleteNode(s, nodeId);

        const wiped: Workflow.Node = {
            blueprintId : node.blueprintId,
            ui: {
                displayName: "Wiped Node"
            },
            ...replace,
            id          : nodeId,
        };

        s.data.nodes[nodeId]    = wiped;
        s.data.staticValues[nodeId] = {};
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
            s.selectors.node.getFields(s, nodeId),
            s.selectors.node.getInputs(s, nodeId),
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
} satisfies NodeLifecycleReducers

export interface NodeLifecycleReducers {
    remove      : (s: S, nodeId: NodeId) => void;
    create      : (s: S, blueprint: Foundations.Blueprint, position: { x: number, y: number }, staticValues?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>) => NodeId;
    disconnect  : (s: S, nodeId: NodeId) => void;
    recreate    : (s: S, nodeId: NodeId, blueprint: Foundations.Blueprint) => void;
    duplicate   : (s: S, originalNode: Workflow.Node, position?: { x: number, y: number }, overrides?: {
        staticValues?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>;
        credentialInstanceIds?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>;
    }) => Workflow.Node;
    reconcile   : (s: S, nodeId: NodeId, blueprint: Foundations.Blueprint, reconciledBlueprintId: Foundations.Blueprint.ReconciledId) => void;
    wipe        : (s: S, nodeId: NodeId, replace?: Partial<Workflow.Node>) => void;
    validate    : (s: S, nodeId: NodeId) => void;
    clearIssues : (s: S, nodeId: NodeId) => void;
}
