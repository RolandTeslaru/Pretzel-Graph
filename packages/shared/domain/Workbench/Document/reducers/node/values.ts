import { Foundations } from "../../../../Foundations";
import { Vault } from "../../../../Vault";
import { Workflow } from "../../../../Workflow";
import type { Document } from "../../index";
import uid from "../../uid";

type NodeId = Workflow.Node.Id

const generateUniqueString = (field: Foundations.Field): string => {
    if (field.variant !== "UniqueString") return "";
    return `${field.prefix ?? ""}${uid.randomUUID(field.length ?? 5)}`;
}

export const nodeValueReducers: NodeValueReducers = {
    // Lazily create (and return) a node's staticValues bucket. Writers should go through this
    // instead of manually `??= {}`-ing so we never assume the bucket was pre-seeded.
    ensureStaticValues: (d, nodeId) => (d.data.staticValues[nodeId] ??= {}),
    // Plain field/input defaults are NOT persisted — they're derived on read from the
    // blueprint's `initialValue` everywhere it matters (render, worker, validation). We only
    // materialize (a) explicit `overrides` (paste/duplicate), (b) UniqueString fields, whose
    // value is generated per-node and can't be re-derived from the blueprint, and (c) dependency
    // pointers, which must resolve without the node's blueprint.
    populateInitialValues: (d, nodeId, fields, inputs, overrides?) => {
        const next: Record<Foundations.Field.Id | Foundations.Port.Input.Id, any> = { ...(d.data.staticValues[nodeId] ?? {}) };

        for (const field of fields) {
            if (overrides && overrides[field.id] !== undefined)
                next[field.id] = overrides[field.id];
            else if (!(field.id in next) && field.variant === "UniqueString")
                next[field.id] = generateUniqueString(field);
            else if (!(field.id in next) && field.variant === "Dependency" && field.initialValue)
                next[field.id] = field.initialValue;
        }

        for (const input of inputs) {
            if (overrides && overrides[input.id] !== undefined)
                next[input.id] = overrides[input.id];
        }

        if (Object.keys(next).length === 0)
            delete d.data.staticValues[nodeId];
        else
            d.data.staticValues[nodeId] = next;
    },
    // Which instance to attach is resolved by the caller — the vault is not part of the
    // document, so the "exactly one match" default lives in the action layer.
    populateCredentialInstances: (d, nodeId, assignments?) => {
        const node = d.data.nodes[nodeId];
        if (!node) return;

        // Seed from existing assignments, let the caller's win over them.
        const next: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id> = {
            ...(d.data.credentialInstanceIds[nodeId] ?? {}),
            ...(assignments ?? {}),
        };

        // Keep serialized workflow lean: omit the key entirely when nothing is assigned.
        if (Object.keys(next).length === 0)
            delete d.data.credentialInstanceIds[nodeId];
        else
            d.data.credentialInstanceIds[nodeId] = next;
    },
}

export interface NodeValueReducers {
    ensureStaticValues          : (document: Document, nodeId: NodeId) => Record<Foundations.Field.Id | Foundations.Port.Input.Id, any>;
    populateInitialValues       : (document: Document, nodeId: NodeId, fields: readonly Foundations.Field[], inputs: readonly Foundations.Port.Input[], overrides?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>) => void;
    populateCredentialInstances : (document: Document, nodeId: NodeId, assignments?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>) => void;
}
