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
            isFlipped   : false,
            accent      : blueprint.accent ? blueprint.accent : undefined,
        } satisfies Workflow.Node

        const result = Workflow.Node.Schema.safeParse(newNode)
        if (!result.success)
            throw new Error(`Node schema validation failed. Could not create node from blueprint id ${blueprint.id}`)

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
        const isFlipped = node.isFlipped;
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
            isFlipped   : isFlipped,
            accent      : blueprint.accent ? `var(--${blueprint.accent})` : undefined,
        } satisfies Workflow.Node

        const result = Workflow.Node.Schema.safeParse(newNode)
        if (!result.success) {
            throw new Error(`Node schema validation failed. Could not recreate node from blueprint id ${blueprint.id}`)
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
            isFlipped    : originalNode.isFlipped,
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
    resolveDynamicPortGroup: (s, nodeId, triggerPort, resolvedVariant) => {
        const node = s.workflow.data.nodes[nodeId];

        if(!triggerPort.isDynamic || !triggerPort.syncGroupId)
            throw new Error(`Port ${triggerPort.id} is not dynamic`);

        const syncGroupId = triggerPort.syncGroupId;
        const triggerIsInput = 'required' in triggerPort;

        const listPromotion: Partial<Record<Foundations.Port.Variant, Foundations.Port.Variant>> = {
            Message: "MessageList",
            Data: "DataList",
        };

        node.inputs.forEach(input => {
            if(!input.isDynamic || input.syncGroupId !== syncGroupId) return;
            if (input.variant === "UnresolvedList") {
                if (!triggerIsInput) return;
                (input as any).variant = listPromotion[resolvedVariant] ?? resolvedVariant;
            } else {
                (input as any).variant = resolvedVariant;
            }
        })

        node.outputs.forEach(output => {
            if(!output.isDynamic || output.syncGroupId !== syncGroupId) return;
            if (output.variant === "UnresolvedList") {
                if (!triggerIsInput) return;
                (output as any).variant = listPromotion[resolvedVariant] ?? resolvedVariant;
            } else {
                (output as any).variant = resolvedVariant;
            }
        })
    },
    unresolveDynamicPortGroup: (s, nodeId, syncGroupId) => {
        const node = s.workflow.data.nodes[nodeId];

        node.inputs.forEach(input => {
            if(!input.isDynamic || input.syncGroupId !== syncGroupId) return;
            // Restore to the original blueprint variant ("Unresolved" or "UnresolvedList"),
            // not always "Unresolved", so UnresolvedList ports stay as UnresolvedList after disconnection.
            (input as any).variant = input.unresolvedVariant ?? "Unresolved";
        })

        node.outputs.forEach(output => {
            if(!output.isDynamic || output.syncGroupId !== syncGroupId) return;
            // Restore to the original blueprint variant ("Unresolved" or "UnresolvedList"),
            // not always "Unresolved", so UnresolvedList ports stay as UnresolvedList after disconnection.
            (output as any).variant = output.unresolvedVariant ?? "Unresolved";
        })
    },
    setDisabled: (s, nodeId, isDisabled) => {
        s.isDirty = true;
        s.workflow.data.nodes[nodeId].isDisabled = isDisabled;
    },
    setMinimized: (s, nodeId, isMinimized) => {
        s.isDirty = true;
        s.workflow.data.nodes[nodeId].isMinimized = isMinimized;
    },
    setFlipped: (s, nodeId, isFlipped) => {
        s.isDirty = true;
        s.workflow.data.nodes[nodeId].isFlipped = isFlipped;
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
    remove         : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;
    create         : (state: WorkbenchSDK.State, blueprint: Foundations.Blueprint, position: { x: number, y: number }) => void;
    recreate       : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, blueprint: Foundations.Blueprint) => void;
    duplicate      : (state: WorkbenchSDK.State, originalNode: Workflow.Node, position?: { x: number, y: number }) => Workflow.Node;
    reconcile      : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, blueprint: Foundations.Blueprint) => void;
    setDisabled    : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isDisabled: boolean) => void;
    setMinimized   : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isMinimized: boolean) => void;
    setFlipped     : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isFlipped: boolean) => void;
    setDisplayName : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDisplayName: string) => void;
    setDescription : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDescription: string) => void;
    validate       : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;
    clearIssues    : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;

    resolveDynamicPortGroup: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, triggerPort: Foundations.Port.Input | Foundations.Port.Output, resolvedVariant: Foundations.Port.Variant) => void
    unresolveDynamicPortGroup: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, syncGroupId: string) => void
}