import { Foundations, Validation, Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cloneDeep } from 'lodash';
import { edgeReducers } from "./edge";
import { cacheReducers } from "./cache";
import { layoutReducers } from "./layout";
import { fieldReducers } from "./field";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import uid from "../../../../../utils/uid";

const generateUniqueString = (field: Foundations.Field): string => {
    if (field.variant !== "UniqueString") return "";
    return `${field.prefix ?? ""}${uid.randomUUID(field.length ?? 5)}`;
}

const resolveFieldInitialValue = (field: Foundations.Field) => {
    if (field.variant === "UniqueString") return generateUniqueString(field);
    if ('initialValue' in field) return field.initialValue;
    return undefined;
}

export const nodeReducers = {
    remove: (s, deletedNodeId) => {
        s.isDirty = true;
        const nodes = s.workflow.data.nodes
        const staticValues = s.workflow.data.staticValues

        // IMPORTANT: remove incident edges BEFORE deleting the node.
        // Edge removal relies on node/port lookups for validation and cache cleanup.

        // Delete the edges coming into the node
        const inNodes = cacheReducers.ensureIncomingNodeEdges(s, deletedNodeId)
        Object.entries(inNodes).forEach(([_inNodeId, _edgeId]) => {
            edgeReducers.remove(s, _edgeId as Workflow.Edge.Id);
        })

        // Delete the edges going out of the node
        const outNodes = cacheReducers.ensureOutgoingNodeEdges(s, deletedNodeId)
        Object.entries(outNodes).forEach(([_outNodeId, _edgeId]) => {
            edgeReducers.remove(s, _edgeId as Workflow.Edge.Id);
        })

        if (nodes[deletedNodeId])
            delete nodes[deletedNodeId];

        delete staticValues[deletedNodeId];

        cacheReducers.deleteNode(s, deletedNodeId);
        layoutReducers.node.remove(s, deletedNodeId);
        nodeReducers.clearIssues(s, deletedNodeId);
    },
    create: (s, blueprint, position, staticValues) => {
        s.isDirty = true;
        const nodeId = Workflow.Node.createId(blueprint.id);
        const newNode = {
            id          : nodeId,
            blueprintId : blueprint.id,
            displayName : blueprint.displayName,

            fields      : cloneDeep(blueprint.fields)   as Workflow.Node['fields'],
            inputs      : cloneDeep(blueprint.inputs)   as Workflow.Node['inputs'],
            outputs     : cloneDeep(blueprint.outputs)  as Workflow.Node["outputs"],
            webhooks    : cloneDeep(blueprint.webhooks) as Workflow.Node["webhooks"] | undefined,

            icon        : blueprint.icon,
            description : blueprint.description,
            isMinimized : false,
            isFlipped   : false,
            accent      : blueprint.accent ? blueprint.accent : undefined,

            toolCompatible: blueprint.toolCompatible,
        } satisfies Workflow.Node

        try {
            Workflow.Node.Schema.parse(newNode)
        } catch (error) {
            console.error(error);
            throw new Error(`Node schema validation failed. Could not create node from blueprint id ${blueprint.id}.`)
        }

        s.workflow.data.nodes[nodeId] = newNode;

        const initialStaticValues: Record<Foundations.Field.Id | Foundations.Port.Input.Id, any> = {};

        // Populate default values from fields
        for (const field of blueprint.fields) {
            if (staticValues && staticValues[field.id] !== undefined) {
                initialStaticValues[field.id] = staticValues[field.id];
            } else {
                const resolved = resolveFieldInitialValue(field);
                if (resolved !== undefined) initialStaticValues[field.id] = resolved;
            }
        }

        // Populate default values from inputs
        for (const input of blueprint.inputs) {
            if (staticValues && staticValues[input.id] !== undefined) {
                initialStaticValues[input.id] = staticValues[input.id];
            } else if ('initialValue' in input && input.initialValue !== undefined) {
                initialStaticValues[input.id] = input.initialValue;
            }
        }

        s.workflow.data.staticValues[nodeId] = initialStaticValues;

        layoutReducers.node.add(s, nodeId, position);
        cacheReducers.createNode(s, newNode);
        nodeReducers.validate(s, nodeId);
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
        const node = s.workflow.data.nodes[nodeId];
        if (!node) return;        
    },
    recreate: (s, nodeId, blueprint) => {
        const node = s.workflow.data.nodes[nodeId];
        if (!node)
            throw new Error(`Node ${nodeId} not found`);

        const isMinimized = node.isMinimized;
        const isFlipped = node.isFlipped;
        s.isDirty = true;

        // Delete the edges coming into the node 
        const inNodes = cacheReducers.ensureIncomingNodeEdges(s, nodeId)
        Object.entries(inNodes).forEach(([_inNodeId, _edgeId]) => {
            edgeReducers.remove(s, _edgeId as Workflow.Edge.Id);
        })

        // Delete the edges going out of the node
        const outNodes = cacheReducers.ensureOutgoingNodeEdges(s, nodeId)
        Object.entries(outNodes).forEach(([_outNodeId, _edgeId]) => {
            edgeReducers.remove(s, _edgeId as Workflow.Edge.Id);
        })

        cacheReducers.deleteNode(s, nodeId);

        const newNode = {
            id          : nodeId,
            blueprintId : blueprint.id,
            displayName : blueprint.displayName,

            fields      : cloneDeep(blueprint.fields)   as Workflow.Node['fields'],
            inputs      : cloneDeep(blueprint.inputs)   as Workflow.Node['inputs'],
            outputs     : cloneDeep(blueprint.outputs)  as Workflow.Node["outputs"],
            webhooks    : cloneDeep(blueprint.webhooks) as Workflow.Node["webhooks"] | undefined,

            icon        : blueprint.icon,
            description : blueprint.description,
            isMinimized : isMinimized,
            isFlipped   : isFlipped,
            accent      : blueprint.accent ? blueprint.accent : undefined,

            toolCompatible: blueprint.toolCompatible,
        } satisfies Workflow.Node

        const result = Workflow.Node.Schema.safeParse(newNode)
        if (!result.success)
            throw new Error(`Node schema validation failed. Could not recreate node from blueprint id ${blueprint.id}`)

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
            webhooks     : cloneDeep(originalNode.webhooks) as Workflow.Node["webhooks"] | undefined,

            icon         : originalNode.icon,
            description  : originalNode.description,
            isMinimized  : originalNode.isMinimized,
            isFlipped    : originalNode.isFlipped,
            accent       : originalNode.accent,
            toolCompatible: originalNode.toolCompatible,
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
        const existing = s.workflow.data.staticValues[nodeId] ?? {};
        const next: Record<Foundations.Field.Id | Foundations.Port.Input.Id, any> = { ...existing };

        for (const field of blueprint.fields) {
            if (field.id in next) continue;
            const resolved = resolveFieldInitialValue(field);
            if (resolved !== undefined) next[field.id] = resolved;
        }

        for (const input of blueprint.inputs) {
            if (input.id in next) continue;
            if ('initialValue' in input && input.initialValue !== undefined)
                next[input.id] = input.initialValue;
        }

        s.workflow.data.staticValues[nodeId] = next;
    },
    polymorphism: {
        resolveGroup: (s, nodeId, triggerPort, resolvedVariant) => {
            console.log("Resolving polymorphic group", { nodeId, triggerPort, resolvedVariant })
            const node = s.workflow.data.nodes[nodeId];
    
            if(!Port.isPolymorphic(triggerPort) || !triggerPort.polymorphicGroupId)
                throw new Error(`Port ${triggerPort.id} is not polymorphic or does not have a polymorphicGroupId`);
    
            const polymorphicGroupId = triggerPort.polymorphicGroupId;
    
            const inputs = node.inputs.filter(i => Port.isPolymorphic(i) && i.polymorphicGroupId === polymorphicGroupId)
            const outputs = node.outputs.filter(o => Port.isPolymorphic(o) && o.polymorphicGroupId === polymorphicGroupId)
    
            inputs.forEach(i => {
                if(!Port.isUnresolvedLike(i.variant))
                    return
                if (i.variant === "UnresolvedList") {
                    (i as any).variant = Port.LIST_PROMOTION_MAP[resolvedVariant] ?? resolvedVariant;
                } else if (i.variant === "UnresolvedScalar") {
                    (i as any).variant = Port.LIST_DEMOTION_MAP[resolvedVariant] ?? resolvedVariant;
                } else {
                    (i as any).variant = resolvedVariant; // Normal Unresolved type
                }
            })
    
            outputs.forEach(o => {
                if(!Port.isUnresolvedLike(o.variant))
                    return
    
                if (o.variant === "UnresolvedList") {
                    (o as any).variant = Port.LIST_PROMOTION_MAP[resolvedVariant] ?? resolvedVariant;
                } else if (o.variant === "UnresolvedScalar") {
                    (o as any).variant = Port.LIST_DEMOTION_MAP[resolvedVariant] ?? resolvedVariant;
                } else {
                    (o as any).variant = resolvedVariant;
                }
            })
        },
        unresolveGroup: (s, nodeId, polymorphicGroupId) => {
            const node = s.workflow.data.nodes[nodeId];
    
            const inputs = node.inputs.filter(i => Foundations.Port.isPolymorphic(i) && i.polymorphicGroupId === polymorphicGroupId) as Foundations.Port.Variants.UnresolvedLike[];
            const outputs = node.outputs.filter(o => Foundations.Port.isPolymorphic(o) && o.polymorphicGroupId === polymorphicGroupId) as Foundations.Port.Variants.UnresolvedLike[];
    
            inputs.forEach(input => {
                input.variant = input.originalVariant;
            })
    
            outputs.forEach(output => {
                output.variant = output.originalVariant;
            })
        },
    },
    setSignalStrategy: (s, nodeId, strategy) => {
        s.isDirty = true;
        const node = s.workflow.data.nodes[nodeId];
        if (!node) return;

        fieldReducers.setValue(s, nodeId, "signalDependency" as Foundations.Field.Id, strategy);

        // When signals are AND-joined, every incoming signal must fire —
        // which implies all data is present. The dataDependency field is
        // meaningless in that case, so hide it from the inspector.
        const dataDep = node.fields.find(f => f.id === "dataDependency" as Foundations.Field.Id);
        if (dataDep) dataDep.hidden = strategy === "AND";
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
        if (!node){
            if(nodeId in s.issues)
                delete s.issues.nodes[nodeId];
            return
        }
            

        const nodeIssues = Validation.Issue.Node.check(node, s.workflow.data, s.cache);

        if(!nodeIssues)
            delete s.issues.nodes[nodeId];
        else
            s.issues.nodes[nodeId] = nodeIssues;
    },
    clearIssues: (s, nodeId) => {
        delete s.issues.nodes[nodeId];
    }
} satisfies NodeReducers

interface NodeReducers {
    remove         : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;
    create         : (state: WorkbenchSDK.State, blueprint: Foundations.Blueprint, position: { x: number, y: number }, staticValues?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>) => void;
    disconnect     : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;  
    recreate       : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, blueprint: Foundations.Blueprint) => void;
    duplicate      : (state: WorkbenchSDK.State, originalNode: Workflow.Node, position?: { x: number, y: number }) => Workflow.Node;
    reconcile      : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, blueprint: Foundations.Blueprint) => void;
    setSignalStrategy : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, strategy: "AND" | "OR" | "XOR") => void;
    setDisabled    : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isDisabled: boolean) => void;
    setMinimized   : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isMinimized: boolean) => void;
    setFlipped     : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isFlipped: boolean) => void;
    setDisplayName : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDisplayName: string) => void;
    setDescription : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDescription: string) => void;
    validate       : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;
    clearIssues    : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;

    polymorphism: {
        resolveGroup: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, triggerPort: Foundations.Port.Input | Foundations.Port.Output, resolvedVariant: Foundations.Port.Variant) => void
        unresolveGroup: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, polymorphicGroupId: string) => void
    }
}
