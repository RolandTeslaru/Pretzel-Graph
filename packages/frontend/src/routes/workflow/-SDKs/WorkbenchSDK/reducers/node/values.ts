import { Foundations, Vault, Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../../sdk";
import uid from "../../../../../../utils/uid";
import { VaultSDK } from "@/SDKs/VaultSDK/sdk";
import { ShelfSDK } from "../../../ShelfSDK/sdk";
import { nodeSelectors } from "../../selectors/node";

type S      = WorkbenchSDK.State
type NodeId = Workflow.Node.Id

const generateUniqueString = (field: Foundations.Field): string => {
    if (field.variant !== "UniqueString") return "";
    return `${field.prefix ?? ""}${uid.randomUUID(field.length ?? 5)}`;
}

const resolveFieldInitialValue = (field: Foundations.Field) => {
    if (field.variant === "UniqueString") return generateUniqueString(field);
    if ('initialValue' in field) return field.initialValue;
    return undefined;
}

export const nodeValueReducers = {
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

        const blueprint = nodeSelectors.getBlueprint(s, nodeId);

        // Auto-fill any still-unassigned credential the node declares, but only when
        // exactly one matching vault instance exists (unambiguous default).
        for (const template of blueprint.credentials ?? []) {
            if (next[template.id] !== undefined) 
                continue;
            
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
} satisfies NodeValueReducers

export interface NodeValueReducers {
    populateInitialValues       : (s: S, nodeId: NodeId, fields: readonly Foundations.Field[], inputs: readonly Foundations.Port.Input[], overrides?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>) => void;
    populateCredentialInstances : (s: S, nodeId: NodeId, overrides?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>) => void;
    setCredential               : (s: S, nodeId: NodeId, templateId: Vault.Credential.Template.Id, instanceId: Vault.Credential.Instance.Id | null) => void;
}
