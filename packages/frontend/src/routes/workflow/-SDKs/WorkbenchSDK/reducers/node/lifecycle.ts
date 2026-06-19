import { Foundations, Validation, Vault, Webhook, Workflow } from "@pretzel-graph/shared/domain";
import { cloneDeep } from 'lodash';
import type { WorkbenchSDK } from "../../sdk";
import { edgeReducers } from "../edge";
import { cacheReducers } from "../cache";
import { layoutReducers } from "../layout";
import { dependencyReducers } from "../dependency";
import { nodeValueReducers } from "./values";

type S      = WorkbenchSDK.State
type NodeId = Workflow.Node.Id

export const nodeLifecycleReducers = {
    remove: (s, deletedNodeId) => {
        s.isDirty = true;
        const nodes = s.data.nodes
        const staticValues = s.data.staticValues

        const dependency = nodes[deletedNodeId]?.dependency;

        // Delete all edges
        nodeLifecycleReducers.disconnect(s, deletedNodeId);

        if (nodes[deletedNodeId])
            delete nodes[deletedNodeId];

        delete staticValues[deletedNodeId];
        delete s.data.credentialInstanceIds[deletedNodeId];

        cacheReducers.deleteNode(s, deletedNodeId);
        layoutReducers.node.remove(s, deletedNodeId);
        nodeLifecycleReducers.clearIssues(s, deletedNodeId);

        if(dependency)
            dependencyReducers.removeUnused(s);
    },
    create: (s, blueprint, position, staticValues) => {
        s.isDirty = true;
        const nodeId = Workflow.Node.createId(blueprint.id);
        const newNode = constructNode({
            id          : nodeId,
            blueprintId : blueprint.id,
            displayName : blueprint.displayName,

            fields      : blueprint.fields,
            inputs      : blueprint.inputs,
            outputs     : blueprint.outputs,
            webhooks    : blueprint.webhooks ?? [],
            credentials : blueprint.credentials ?? [],

            icon        : blueprint.icon,
            description : blueprint.description,
            isMinimized : false,
            isFlipped   : false,
            isDisabled  : false,
            accent      : blueprint.accent,
            iconColor   : blueprint.iconColor,
            dependency  : blueprint.dependency,
            flags       : blueprint.flags ?? {},
            toolCompatible: blueprint.toolCompatible,
        })

        try {
            Workflow.Node.Schema.parse(newNode)
        } catch (error) {
            console.error(error);
            throw new Error(`Node schema validation failed. Could not create node from blueprint id ${blueprint.id}.`)
        }

        s.data.nodes[nodeId] = newNode;

        nodeValueReducers.populateInitialValues(s, nodeId, blueprint.fields, blueprint.inputs, staticValues);
        nodeValueReducers.populateCredentialInstances(s, nodeId);

        layoutReducers.node.add(s, nodeId, position);
        cacheReducers.createNode(s, newNode);
        nodeLifecycleReducers.validate(s, nodeId);

        return nodeId;
    },
    disconnect: (s, nodeId) => {
        s.isDirty = true;

        const inNodes = cacheReducers.ensureIncomingNodeEdges(s, nodeId);
        const outNodes = cacheReducers.ensureOutgoingNodeEdges(s, nodeId);

        Object.entries(inNodes).forEach(([_inNodeId, edgeId]) => {
            edgeReducers.remove(s, edgeId as Workflow.Edge.Id);
        })

        Object.entries(outNodes).forEach(([_outNodeId, edgeId]) => {
            edgeReducers.remove(s, edgeId as Workflow.Edge.Id);
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

        const newNode = constructNode({
            id          : nodeId,
            blueprintId : blueprint.id,
            displayName : blueprint.displayName,

            fields      : blueprint.fields,
            inputs      : blueprint.inputs,
            outputs     : blueprint.outputs,
            webhooks    : blueprint.webhooks ?? [],
            credentials : blueprint.credentials ?? [],

            icon        : blueprint.icon,
            description : blueprint.description,
            isMinimized : node.isMinimized,
            isFlipped   : node.isFlipped,
            isDisabled  : node.isDisabled,
            accent      : blueprint.accent,
            iconColor   : blueprint.iconColor,
            dependency  : node.dependency ?? blueprint.dependency,
            flags       : blueprint.flags ?? {},
            toolCompatible: blueprint.toolCompatible,
        })

        const result = Workflow.Node.Schema.safeParse(newNode)
        if (!result.success)
            throw new Error(`Node schema validation failed. Could not recreate node from blueprint id ${blueprint.id}`)

        // Clear dependency before remove so it doesn't trigger dependencyReducers.removeUnused while the node
        // is temporarily absent — the dependency is already captured in newNode above.
        s.data.nodes[nodeId].dependency = undefined
        nodeLifecycleReducers.remove(s, nodeId)

        s.data.nodes[nodeId] = newNode;
        cacheReducers.createNode(s, newNode);

        // Restore the carried-over values/credentials (kept where keys still exist,
        // gaps filled with the new blueprint's defaults).
        nodeValueReducers.populateInitialValues(s, nodeId, blueprint.fields, blueprint.inputs, staticValues);
        nodeValueReducers.populateCredentialInstances(s, nodeId, credentialInstances);

        if (nodeLayout)
            layoutReducers.node.add(s, nodeId, nodeLayout);

        incomingEdges.forEach(oldEdge => {
            edgeReducers.create(s, {
                source: oldEdge.source.nodeId,
                sourceHandle: oldEdge.source.portId,
                target: oldEdge.target.nodeId,
                targetHandle: oldEdge.target.portId
            })
        })

        outgoingEdges.forEach(oldEdge => {
            edgeReducers.create(s, {
                source: oldEdge.source.nodeId,
                sourceHandle: oldEdge.source.portId,
                target: oldEdge.target.nodeId,
                targetHandle: oldEdge.target.portId
            })
        })


        // If the original node had a dependency, run GC now that the new node is fully
        // in place — removeUnused will correctly keep deps still referenced and clean up any that aren't.
        if (hadDependency)
            dependencyReducers.removeUnused(s);

        nodeLifecycleReducers.validate(s, nodeId);
    },
    duplicate: (s, originalNode, position) => {
        s.isDirty = true
        if (!position) {
            position = cloneDeep(s.selectors.layout.node.get(s, originalNode.id) ?? { x: 0, y: 0 })
            position.x += 40
            position.y += 40
        }
        const newNodeId = Workflow.Node.createId(originalNode.blueprintId)
        const newNode = constructNode({
            id           : newNodeId,
            blueprintId  : originalNode.blueprintId,
            displayName  : originalNode.displayName,

            fields       : originalNode.fields,
            inputs       : originalNode.inputs,
            outputs      : originalNode.outputs,
            webhooks     : originalNode.webhooks ?? [],
            credentials  : originalNode.credentials ?? [],

            icon         : originalNode.icon,
            description  : originalNode.description,
            isMinimized  : originalNode.isMinimized,
            isFlipped    : originalNode.isFlipped,
            isDisabled   : originalNode.isDisabled,
            accent       : originalNode.accent,
            iconColor    : originalNode.iconColor,
            dependency   : originalNode.dependency,
            flags        : originalNode.flags ?? {},
            toolCompatible: originalNode.toolCompatible,
        })

        s.data.nodes[newNodeId] = newNode;
        s.data.staticValues[newNodeId] = cloneDeep(s.data.staticValues[originalNode.id]);
        nodeValueReducers.populateCredentialInstances(s, newNodeId, s.data.credentialInstanceIds[originalNode.id]);

        layoutReducers.node.add(s, newNodeId, position);
        cacheReducers.createNode(s, newNode);
        nodeLifecycleReducers.validate(s, newNodeId);

        return newNode;
    },
    reconcile: (s, nodeId, blueprint) => {
        s.isDirty = true;
        const node = s.data.nodes[nodeId];
        if (!node)
            throw new Error(`Node ${blueprint.id} not found`);

        if (node.blueprintId !== blueprint.id)
            throw new Error(`Node ${nodeId} is not of type ${blueprint.id}`);

        // --- Diff inputs: remove edges for removed/variant-changed inputs ---
        const newInputsById = new Map(blueprint.inputs.map(i => [i.id, i]));
        const inputHandles = s.cache.inputHandlesMap[nodeId] ?? {};

        for (const oldInput of node.inputs) {
            const newInput = newInputsById.get(oldInput.id);
            const edgeId = inputHandles[oldInput.id];

            if (edgeId && (!newInput || newInput.variant !== oldInput.variant)) {
                edgeReducers.remove(s, edgeId);
            }
        }

        // --- Diff outputs: remove edges for removed/variant-changed outputs ---
        const newOutputsById = new Map(blueprint.outputs.map(o => [o.id, o]));
        const outputHandles = s.cache.outputHandlesMap[nodeId] ?? {};

        for (const oldOutput of node.outputs) {
            const newOutput = newOutputsById.get(oldOutput.id);
            const edgeId = outputHandles[oldOutput.id];

            if (edgeId && (!newOutput || newOutput.variant !== oldOutput.variant))
                edgeReducers.remove(s, edgeId);
        }

        // --- Apply reconciled blueprint ---
        node.fields = blueprint.fields as Workflow.Node['fields']
        node.inputs = blueprint.inputs as Workflow.Node['inputs']
        node.outputs = blueprint.outputs as Workflow.Node['outputs']
        node.accent = blueprint.accent;

        // Seed from existing values, then fill gaps with initialValue
        nodeValueReducers.populateInitialValues(s, nodeId, blueprint.fields, blueprint.inputs);
    },
    wipe: (s, nodeId, replace = {}) => {
        const node = s.data.nodes[nodeId];
        if (!node) return;
        s.isDirty = true;

        nodeLifecycleReducers.disconnect(s, nodeId);
        cacheReducers.deleteNode(s, nodeId);

        const wiped: Workflow.Node = {
            id          : nodeId,
            blueprintId : node.blueprintId,
            displayName : replace.displayName ?? "Wiped Node",
            icon        : "",
            fields      : replace.fields ?? [],
            inputs      : replace.inputs ?? [],
            outputs     : replace.outputs ?? [],
            isMinimized : replace.isMinimized ?? false,
            isFlipped   : replace.isFlipped ?? false,
            dependency  : replace.dependency,
            accent      : replace.accent ?? "utility",
            flags       : replace.flags,
            toolCompatible: replace.toolCompatible,
            credentials: replace.credentials,
        };

        s.data.nodes[nodeId]    = wiped;
        s.data.staticValues[nodeId] = {};
        delete s.data.credentialInstanceIds[nodeId];

        cacheReducers.createNode(s, wiped);
        nodeLifecycleReducers.clearIssues(s, nodeId);
    },
    validate: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        if (!node){
            if(nodeId in s.issues)
                delete s.issues.nodes[nodeId];
            return
        }


        const nodeIssues = Validation.Issue.Node.check(node, s.data, s.cache);

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
    duplicate   : (s: S, originalNode: Workflow.Node, position?: { x: number, y: number }) => Workflow.Node;
    reconcile   : (s: S, nodeId: NodeId, blueprint: Foundations.Blueprint) => void;
    wipe        : (s: S, nodeId: NodeId, replace?: Partial<Workflow.Node>) => void;
    validate    : (s: S, nodeId: NodeId) => void;
    clearIssues : (s: S, nodeId: NodeId) => void;
}


/** Forces every property key to be present, while keeping each value's original type (incl. null/undefined). */
type Explicit<T> = { [K in keyof Required<T>]: T[K] };

const constructNode = ({
    id, blueprintId, displayName, fields, inputs, outputs, webhooks, credentials, icon, description, isMinimized, isFlipped, isDisabled, accent, iconColor, toolCompatible, dependency, flags
}: Explicit<Omit<Workflow.Node, 'fields' | 'inputs' | 'outputs' | 'webhooks' | 'credentials' | 'flags' | 'dependency'>> & {
    fields      : readonly Foundations.Field[],
    inputs      : readonly Foundations.Port.Input[],
    outputs     : readonly Foundations.Port.Output[],
    webhooks    : readonly Webhook[],
    credentials : readonly Vault.Credential.Template[],
    flags       : Record<string, unknown>,
    dependency  : Workflow.Node['dependency'],
}) => {
    return {
        id,
        blueprintId,
        displayName,
        icon,
        isMinimized,

        // Arrays/objects/booleans collapse to `undefined` when empty/default so the
        // serialized workflow JSON omits them entirely (keeps persisted nodes lean).
        fields      : cloneDeep(fields) as Workflow.Node["fields"],
        inputs      : cloneDeep(inputs) as Workflow.Node["inputs"],
        outputs     : cloneDeep(outputs) as Workflow.Node["outputs"],
        webhooks    : webhooks.length === 0 ? undefined : cloneDeep(webhooks) as Workflow.Node["webhooks"],
        credentials : credentials.length === 0 ? undefined : cloneDeep(credentials) as Workflow.Node["credentials"],
        flags       : Object.keys(flags).length === 0 ? undefined : cloneDeep(flags) as Workflow.Node["flags"],
        dependency  : dependency === undefined ? undefined : cloneDeep(dependency) as Workflow.Node["dependency"],

        description    : description ? description : undefined,
        accent         : accent ? accent : undefined,
        iconColor      : iconColor ? iconColor : undefined,
        isFlipped      : isFlipped ? true : undefined,
        isDisabled     : isDisabled ? true : undefined,
        toolCompatible : toolCompatible ? true : undefined,
    } satisfies Workflow.Node
}
