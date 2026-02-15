import { Workflow, type Foundations } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cloneDeep } from 'lodash';
import { edgeReducers } from "./edge";
import { cacheReducers } from "./cache";
import { layoutReducers } from "./layout";
import { toast } from "sonner";
import { workbenchSelectors } from "../selectors";

const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}

const sel = workbenchSelectors;

const createNodeId: NodeReducers["createId"] = (blueprintId) => {
    return `${blueprintId}-${uid.randomUUID(5)}` as Workflow.Node.Id
}


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
    createId: createNodeId,
    // TODO: Migrate from DB schema creation to runtime schema creation from backend
    create: (s, blueprint, position) => {
        s.isDirty = true;
        const nodeId = createNodeId(blueprint.id);
        const newNode = {
            id: nodeId,
            blueprintId: blueprint.id,
            displayName: blueprint.displayName,

            fields: cloneDeep(blueprint.fields) as Workflow.Node['fields'],
            inputs: cloneDeep(blueprint.inputs) as Workflow.Node['inputs'],
            outputs: cloneDeep(blueprint.outputs) as Workflow.Node["outputs"],
            icon: blueprint.icon,
            description: blueprint.description,
            isMinimized: false,
        } satisfies Workflow.Node

        const result = Workflow.Node.Schema.safeParse(newNode)
        if (!result.success) {
            console.error("WorkbenchSDK: Node schema validation failed:", result.error)
            toast.error(`WorkbenchSDK: Node schema validation failed. Could not create node from blueprint id ${blueprint.id}`,)
            return;
        }

        s.workflow.data.nodes[nodeId] = newNode;

        layoutReducers.node.add(s, nodeId, position);

        s.workflow.data.staticValues[nodeId] = {}

        cacheReducers.createNode(s, newNode);
    },
    reconcile: (s, nodeId, blueprint) => {
        s.isDirty = true;
        const node = s.workflow.data.nodes[nodeId];
        if (!node)
            throw new Error(`Node ${blueprint.id} not found`);

        if(node.blueprintId !== blueprint.id)
            throw new Error(`Node ${nodeId} is not of type ${blueprint.id}`);

        node.fields = blueprint.fields as Workflow.Node['fields']
        node.inputs = blueprint.inputs as Workflow.Node['inputs']
        node.outputs = blueprint.outputs as Workflow.Node['outputs']
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
    }
} satisfies NodeReducers

type NodeReducers = {
    remove: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void
    createId: (blueprintId: Foundations.Blueprint.Id) => Workflow.Node.Id
    create: (state: WorkbenchSDK.State, blueprint: Foundations.Blueprint, position: { x: number, y: number }) => void
    reconcile: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, blueprint: Foundations.Blueprint) => void;
    setMinimized: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isMinimized: boolean) => void
    setDisplayName: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDisplayName: string) => void
    setDescription: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDescription: string) => void
}