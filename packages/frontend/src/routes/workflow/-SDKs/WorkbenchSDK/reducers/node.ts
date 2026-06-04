import { Foundations, Validation, Vault, Webhook, Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cloneDeep } from 'lodash';
import { edgeReducers } from "./edge";
import { cacheReducers } from "./cache";
import { layoutReducers } from "./layout";
import { fieldReducers } from "./field";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import uid from "../../../../../utils/uid";
import { dependencyReducers } from "./dependency";
import { VaultSDK } from "@/SDKs/VaultSDK/sdk";

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
        const nodes = s.data.nodes
        const staticValues = s.data.staticValues

        const dependency = nodes[deletedNodeId]?.dependency;

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
        delete s.data.credentialInstanceIds[deletedNodeId];

        cacheReducers.deleteNode(s, deletedNodeId);
        layoutReducers.node.remove(s, deletedNodeId);
        nodeReducers.clearIssues(s, deletedNodeId);

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

        nodeReducers.populateInitialValues(s, nodeId, blueprint.fields, blueprint.inputs, staticValues);
        nodeReducers.populateCredentialInstances(s, nodeId);

        layoutReducers.node.add(s, nodeId, position);
        cacheReducers.createNode(s, newNode);
        nodeReducers.validate(s, nodeId);

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

        const incomingEdges = s.selectors.node.getIncomingEdges(s, nodeId);
        const outgoingEdges = s.selectors.node.getOutgoingEdges(s, nodeId);

        // Capture before `remove` wipes them, so we can carry the user's values/credentials
        // across the recreate instead of losing them.
        const staticValues = s.data.staticValues[nodeId] ?? {};
        const credentialInstances = s.data.credentialInstanceIds[nodeId];

        const nodeLayout = cloneDeep(s.selectors.layout.node.get(s, nodeId));

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
            dependency  : node.dependency ?? blueprint.dependency,
            flags       : blueprint.flags ?? {},
            toolCompatible: blueprint.toolCompatible,
        })

        const result = Workflow.Node.Schema.safeParse(newNode)
        if (!result.success)
            throw new Error(`Node schema validation failed. Could not recreate node from blueprint id ${blueprint.id}`)

        nodeReducers.remove(s, nodeId)

        s.data.nodes[nodeId] = newNode;
        cacheReducers.createNode(s, newNode);

        // Restore the carried-over values/credentials (kept where keys still exist,
        // gaps filled with the new blueprint's defaults).
        nodeReducers.populateInitialValues(s, nodeId, blueprint.fields, blueprint.inputs, staticValues);
        nodeReducers.populateCredentialInstances(s, nodeId, credentialInstances);

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


        nodeReducers.validate(s, nodeId);
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
            dependency   : originalNode.dependency,
            flags        : originalNode.flags ?? {},
            toolCompatible: originalNode.toolCompatible,
        })

        s.data.nodes[newNodeId] = newNode;
        s.data.staticValues[newNodeId] = cloneDeep(s.data.staticValues[originalNode.id]);
        nodeReducers.populateCredentialInstances(s, newNodeId, s.data.credentialInstanceIds[originalNode.id]);

        layoutReducers.node.add(s, newNodeId, position);
        cacheReducers.createNode(s, newNode);
        nodeReducers.validate(s, newNodeId);

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
        nodeReducers.populateInitialValues(s, nodeId, blueprint.fields, blueprint.inputs);
    },
    populateInitialValues: (s, nodeId, fields, inputs, overrides?) => {
        // Seed from any existing values so we never clobber user edits, then fill
        // gaps: an explicit `overrides` entry wins over a field/input's initialValue.
        const next: Record<Foundations.Field.Id | Foundations.Port.Input.Id, any> = { ...(s.data.staticValues[nodeId] ?? {}) };

        for (const field of fields) {
            if (overrides && overrides[field.id] !== undefined) {
                next[field.id] = overrides[field.id];
            } else if (!(field.id in next)) {
                const resolved = resolveFieldInitialValue(field);
                if (resolved !== undefined) next[field.id] = resolved;
            }
        }

        for (const input of inputs) {
            if (overrides && overrides[input.id] !== undefined) {
                next[input.id] = overrides[input.id];
            } else if (!(input.id in next) && 'initialValue' in input && input.initialValue !== undefined) {
                next[input.id] = input.initialValue;
            }
        }

        s.data.staticValues[nodeId] = next;
    },
    populateCredentialInstances: (s, nodeId, overrides?) => {
        const node = s.data.nodes[nodeId];
        if (!node) return;

        // Seed from existing assignments, let explicit `overrides` win over them.
        const next: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id> = {
            ...(s.data.credentialInstanceIds[nodeId] ?? {}),
            ...(overrides ?? {}),
        };

        // Auto-fill any still-unassigned credential the node declares, but only when
        // exactly one matching vault instance exists (unambiguous default).
        for (const template of node.credentials ?? []) {
            if (next[template.id] !== undefined) continue;
            const instances = VaultSDK.selectors.byTemplateId(VaultSDK.state, template.id);
            if (instances.length === 1)
                next[template.id] = instances[0].id;
        }

        // Keep serialized workflow lean: omit the key entirely when nothing is assigned.
        if (Object.keys(next).length === 0)
            delete s.data.credentialInstanceIds[nodeId];
        else
            s.data.credentialInstanceIds[nodeId] = next;
    },
    polymorphism: {
        resolveGroup: (s, nodeId, triggerPort, resolvedVariant) => {
            console.log("Resolving polymorphic group", { nodeId, triggerPort, resolvedVariant })
            const node = s.data.nodes[nodeId];
    
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
            const node = s.data.nodes[nodeId];
    
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
        const node = s.data.nodes[nodeId];
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
        s.data.nodes[nodeId].isDisabled = isDisabled;
    },
    setMinimized: (s, nodeId, isMinimized) => {
        s.isDirty = true;
        s.data.nodes[nodeId].isMinimized = isMinimized;
    },
    setFlipped: (s, nodeId, isFlipped) => {
        s.isDirty = true;
        s.data.nodes[nodeId].isFlipped = isFlipped;
    },
    setDisplayName: (s, nodeId, newDisplayName) => {
        s.isDirty = true;
        s.data.nodes[nodeId].displayName = newDisplayName;
    },
    setDescription: (s, nodeId, newDescription) => {
        s.isDirty = true;
        s.data.nodes[nodeId].description = newDescription;
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
    wipe: (s, nodeId, replace = {}) => {
        const node = s.data.nodes[nodeId];
        if (!node) return;
        s.isDirty = true;

        nodeReducers.disconnect(s, nodeId);
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
        nodeReducers.clearIssues(s, nodeId);
    },
    setCredential: (s, nodeId, templateId, instanceId) => {
        s.isDirty = true;
        if (!s.data.credentialInstanceIds[nodeId])
            s.data.credentialInstanceIds[nodeId] = {};
        if (instanceId === null) {
            delete s.data.credentialInstanceIds[nodeId][templateId];
        } else {
            s.data.credentialInstanceIds[nodeId][templateId] = instanceId;
        }
    },
} satisfies NodeReducers

interface NodeReducers {
    remove         : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;
    create         : (state: WorkbenchSDK.State, blueprint: Foundations.Blueprint, position: { x: number, y: number }, staticValues?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>) => Workflow.Node.Id;
    disconnect     : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;  
    recreate       : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, blueprint: Foundations.Blueprint) => void;
    duplicate      : (state: WorkbenchSDK.State, originalNode: Workflow.Node, position?: { x: number, y: number }) => Workflow.Node;
    reconcile      : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, blueprint: Foundations.Blueprint) => void;
    populateInitialValues : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fields: readonly Foundations.Field[], inputs: readonly Foundations.Port.Input[], overrides?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>) => void;
    populateCredentialInstances : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, overrides?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>) => void;
    setSignalStrategy : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, strategy: "AND" | "OR" | "XOR") => void;
    setDisabled    : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isDisabled: boolean) => void;
    setMinimized   : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isMinimized: boolean) => void;
    setFlipped     : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, isFlipped: boolean) => void;
    setDisplayName : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDisplayName: string) => void;
    setDescription : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, newDescription: string) => void;
    validate       : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;
    clearIssues    : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void;
    
    wipe          : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, replace?: Partial<Workflow.Node>) => void;
    setCredential         : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, templateId: Vault.Credential.Template.Id, instanceId: Vault.Credential.Instance.Id | null) => void;

    polymorphism: {
        resolveGroup: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, triggerPort: Foundations.Port.Input | Foundations.Port.Output, resolvedVariant: Foundations.Port.Variant) => void
        unresolveGroup: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, polymorphicGroupId: string) => void
    }
}


/** Forces every property key to be present, while keeping each value's original type (incl. null/undefined). */
type Explicit<T> = { [K in keyof Required<T>]: T[K] };

const constructNode = ({
    id, blueprintId, displayName, fields, inputs, outputs, webhooks, credentials, icon, description, isMinimized, isFlipped, isDisabled, accent, toolCompatible, dependency, flags
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
        isFlipped      : isFlipped ? true : undefined,
        isDisabled     : isDisabled ? true : undefined,
        toolCompatible : toolCompatible ? true : undefined,
    } satisfies Workflow.Node
}