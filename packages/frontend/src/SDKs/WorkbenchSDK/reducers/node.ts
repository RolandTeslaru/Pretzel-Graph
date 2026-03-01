import { Validation, Workflow, type Foundations } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cloneDeep } from 'lodash';
import { edgeReducers } from "./edge";
import { cacheReducers } from "./cache";
import { layoutReducers } from "./layout";
import { toast } from "sonner";
import { workbenchSelectors } from "../selectors";

const sel = workbenchSelectors;

export const nodeReducers = {
    remove: (s, deletedNodeId) => {
        s.isDirty = true;
        const nodes = s.workflow.data.nodes
        const staticValues = s.workflow.data.staticValues

        if (nodes[deletedNodeId])
            delete nodes[deletedNodeId];

        delete staticValues[deletedNodeId];

        // Delete the edges coming into the node 
        const inNodes = sel.ensureInNodesCache(s, deletedNodeId)

        Object.entries(inNodes).forEach(([_inNodeId, _edgeId]) => {
            edgeReducers.remove(s, _edgeId);
        })

        // Delete the edges going out of the nodes
        const outNodes = sel.ensureOutNodesCache(s, deletedNodeId)

        Object.entries(outNodes).forEach(([_outNodeId, _edgeId]) => {
            edgeReducers.remove(s, _edgeId);
        })

        cacheReducers.deleteNode(s, deletedNodeId);
        layoutReducers.node.remove(s, deletedNodeId);
    },
    createId: Workflow.Node.createId,
    create: (s, blueprint, position) => {
        s.isDirty = true;
        const nodeId = Workflow.Node.createId(blueprint.id);
        const newNode = {
            id          : nodeId,
            blueprintId : blueprint.id,
            displayName : blueprint.displayName,

            fields      : cloneDeep(blueprint.fields)   as Workflow.Node['fields'],
            inputs      : cloneDeep(blueprint.inputs)   as Workflow.Node['inputs'],
            outputs     : cloneDeep(blueprint.outputs)  as Workflow.Node["outputs"],
            icon        : blueprint.icon,
            description : blueprint.description,
            isMinimized : false,
            accent      : blueprint.accent ? `var(--${blueprint.accent})` : undefined,
        } satisfies Workflow.Node

        const result = Workflow.Node.Schema.safeParse(newNode)
        if (!result.success) {
            console.error("WorkbenchSDK: Node schema validation failed:", result.error)
            toast.error(`WorkbenchSDK: Node schema validation failed. Could not create node from blueprint id ${blueprint.id}`,)
            return;
        }

        s.workflow.data.nodes[nodeId] = newNode;

        const initialStaticValues: Record<Foundations.Field.Id | Foundations.Port.Input.Id, any> = {};

        // Populate default values from fields
        for (const field of blueprint.fields) {
            if ('initialValue' in field && field.initialValue !== undefined) {
                initialStaticValues[field.id] = field.initialValue;
            }
        }

        // Populate default values from inputs
        for (const input of blueprint.inputs) {
            if ('initialValue' in input && input.initialValue !== undefined) {
                initialStaticValues[input.id] = input.initialValue;
            }
        }

        s.workflow.data.staticValues[nodeId] = initialStaticValues;

        layoutReducers.node.add(s, nodeId, position);
        cacheReducers.createNode(s, newNode);
        nodeReducers.validate(s, nodeId);
    },
    recreate: (s, nodeId, blueprint) => {
        const node = s.workflow.data.nodes[nodeId];
        if (!node)
            throw new Error(`Node ${nodeId} not found`);

        const isMinimized = node.isMinimized;
        s.isDirty = true;

        // Delete the edges coming into the node 
        const inNodes = sel.ensureInNodesCache(s, nodeId)
        Object.entries(inNodes).forEach(([_inNodeId, _edgeId]) => {
            edgeReducers.remove(s, _edgeId);
        })

        // Delete the edges going out of the node
        const outNodes = sel.ensureOutNodesCache(s, nodeId)
        Object.entries(outNodes).forEach(([_outNodeId, _edgeId]) => {
            edgeReducers.remove(s, _edgeId);
        })

        cacheReducers.deleteNode(s, nodeId);

        const newNode = {
            id          : nodeId,
            blueprintId : blueprint.id,
            displayName : blueprint.displayName,

            fields      : cloneDeep(blueprint.fields)   as Workflow.Node['fields'],
            inputs      : cloneDeep(blueprint.inputs)   as Workflow.Node['inputs'],
            outputs     : cloneDeep(blueprint.outputs)  as Workflow.Node["outputs"],
            icon        : blueprint.icon,
            description : blueprint.description,
            isMinimized : isMinimized,
            accent      : blueprint.accent ? `var(--${blueprint.accent})` : undefined,
        } satisfies Workflow.Node

        const result = Workflow.Node.Schema.safeParse(newNode)
        if (!result.success) {
            console.error("WorkbenchSDK: Node schema validation failed:", result.error)
            toast.error(`WorkbenchSDK: Node schema validation failed. Could not recreate node from blueprint id ${blueprint.id}`)
            return;
        }

        s.workflow.data.nodes[nodeId] = newNode;
        cacheReducers.createNode(s, newNode);
        nodeReducers.validate(s, nodeId);
    },
    duplicate: (s, originalNode, position) => {
        s.isDirty = true
        if (!position) {
            position = cloneDeep(s.workflow.data.ui.layout[originalNode.id])
            position.x += 40
            position.y += 40
        }
        const newNodeId = Workflow.Node.createId(originalNode.blueprintId)
        const newNode = {
            id           : newNodeId,
            blueprintId  : originalNode.blueprintId,
            displayName  : originalNode.displayName,

            fields       : cloneDeep(originalNode.fields)   as Workflow.Node['fields'],
            inputs       : cloneDeep(originalNode.inputs)   as Workflow.Node['inputs'],
            outputs      : cloneDeep(originalNode.outputs)  as Workflow.Node["outputs"],
            icon         : originalNode.icon,
            description  : originalNode.description,
            isMinimized  : originalNode.isMinimized,
            accent       : originalNode.accent,
        } satisfies Workflow.Node

        s.workflow.data.nodes[newNodeId] = newNode;
        s.workflow.data.staticValues[newNodeId] = cloneDeep(s.workflow.data.staticValues[originalNode.id]);

        layoutReducers.node.add(s, newNodeId, position);
        cacheReducers.createNode(s, newNode);
        nodeReducers.validate(s, newNodeId);

        return newNode;
    },
    reconcile: (s, nodeId, blueprint) => {
        s.isDirty = true;
        const node = s.workflow.data.nodes[nodeId];
        if (!node)
            throw new Error(`Node ${blueprint.id} not found`);

        if (node.blueprintId !== blueprint.id)
            throw new Error(`Node ${nodeId} is not of type ${blueprint.id}`);

        node.fields = blueprint.fields as Workflow.Node['fields']
        node.inputs = blueprint.inputs as Workflow.Node['inputs']
        node.outputs = blueprint.outputs as Workflow.Node['outputs']

        const initialStaticValues: Record<Foundations.Field.Id | Foundations.Port.Input.Id, any> = {};

        // Populate default values from fields
        for (const field of blueprint.fields) {
            if ('initialValue' in field && field.initialValue !== undefined) {
                initialStaticValues[field.id] = field.initialValue;
            }
        }

        // Populate default values from inputs
        for (const input of blueprint.inputs) {
            if ('initialValue' in input && input.initialValue !== undefined) {
                initialStaticValues[input.id] = input.initialValue;
            }
        }

        s.workflow.data.staticValues[nodeId] = initialStaticValues;
    },
    setMinimized: (s, nodeId, isMinimized) => {
        s.isDirty = true;
        s.workflow.data.nodes[nodeId].isMinimized = isMinimized;
    },
    setDisplayName: (s, nodeId, newDisplayName) => {
        s.isDirty = true;
        s.workflow.data.nodes[nodeId].displayName = newDisplayName;
    },
    setDescription: (s, nodeId, newDescription) => {
        s.isDirty = true;
        s.workflow.data.nodes[nodeId].description = newDescription;
    },
    validate: (s, nodeId) => {
        const node = s.workflow.data.nodes[nodeId];
        if (!node) return;

        const nodeIssues = Validation.Issue.Node.check(node, s.workflow, s.cache);

        if(!nodeIssues)
            delete s.issues[nodeId];
        else
            s.issues[nodeId] = nodeIssues;
    },
    clearIssues: (s, nodeId) => {
        delete s.issues[nodeId];
    }
} satisfies NodeReducers

interface NodeReducers {
    remove        : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;
    createId      : typeof Workflow.Node.createId
    create        : (state: WorkbenchSDK.State, blueprint: Foundations.Blueprint, position: { x: number, y: number }) => void;
    recreate      : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, blueprint: Foundations.Blueprint) => void;
    duplicate     : (state: WorkbenchSDK.State, originalNode: Workflow.Node, position?: { x: number, y: number }) => Workflow.Node;
    reconcile     : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, blueprint: Foundations.Blueprint) => void;
    setMinimized  : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isMinimized: boolean) => void;
    setDisplayName: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDisplayName: string) => void;
    setDescription: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDescription: string) => void;
    validate: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;
    clearIssues: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;
}