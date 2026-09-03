import { Foundations } from "../../../../Foundations";
import { Vault } from "../../../../Vault";
import { Workflow } from "../../../../Workflow";
import type { Document } from "../../index";
import uid from "../../uid";
import { isEqual } from "lodash";

type NodeId = Workflow.Node.Id

const generateUniqueString = (field: Foundations.Field): string => {
    if (field.variant !== "UniqueString") return "";
    return `${field.prefix ?? ""}${uid.randomUUID(field.length ?? 5)}`;
}

export const nodeValueReducers: NodeValueReducers = {
    // Lazily create (and return) a node's staticValues bucket. Writers should go through this
    // instead of manually `??= {}`-ing so we never assume the bucket was pre-seeded.
    ensureStaticValues: (d, nodeId) => (d.data.staticValues[nodeId] ??= {}),
    // Normalize a loaded (possibly fat) node: drop any staticValue that equals its field/input
    // initialValue — those are derived on read. UniqueString values are kept (generated, not
    // derivable). Needs blueprints hydrated; call from load().
    pruneDefaultStaticValues: (d, nodeId) => {
        const bucket = d.data.staticValues[nodeId];
        if (!bucket) return;

        const initialById = new Map<string, any>();
        for (const field of d.selectors.node.getFields(d, nodeId)) {
            if (field.variant === "UniqueString") continue;
            if ("initialValue" in field) initialById.set(field.id, field.initialValue);
        }
        for (const input of d.selectors.node.getInputs(d, nodeId))
            if ("initialValue" in input && input.initialValue !== undefined)
                initialById.set(input.id, input.initialValue);

        for (const key of Object.keys(bucket) as (Foundations.Field.Id | Foundations.Port.Input.Id)[])
            if (initialById.has(key) && isEqual(bucket[key], initialById.get(key))) {
                delete bucket[key];
                d.isDirty = true;
            }

        if (Object.keys(bucket).length === 0)
            delete d.data.staticValues[nodeId];
    },
    // Normalize a loaded node's `ui`: drop any override key that equals the blueprint's ui value
    // (derived on read via node.getUI). isMinimized/isFlipped are pure view-state with no
    // blueprint counterpart, so they're always kept. Needs blueprints hydrated; call from load().
    pruneDefaultUI: (d, nodeId) => {
        const node = d.data.nodes[nodeId];
        if (!node?.ui) return;

        const bp = d.selectors.node.getBlueprint(d, nodeId);
        if (!bp) return;
        for (const key of ["displayName", "description", "icon", "accent", "iconColor"] as const)
            if (node.ui[key] !== undefined && node.ui[key] === bp.ui[key]) {
                delete node.ui[key];
                d.isDirty = true;
            }
    },
    // Plain field/input defaults are NOT persisted — they're derived on read from the
    // blueprint's `initialValue` everywhere it matters (render, worker, validation). We only
    // materialize (a) explicit `overrides` (paste/duplicate) and (b) UniqueString fields, whose
    // value is generated per-node and can't be re-derived from the blueprint.
    populateInitialValues: (d, nodeId, fields, inputs, overrides?) => {
        const next: Record<Foundations.Field.Id | Foundations.Port.Input.Id, any> = { ...(d.data.staticValues[nodeId] ?? {}) };

        for (const field of fields) {
            if (overrides && overrides[field.id] !== undefined)
                next[field.id] = overrides[field.id];
            else if (!(field.id in next) && field.variant === "UniqueString")
                next[field.id] = generateUniqueString(field);
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
    pruneDefaultStaticValues    : (document: Document, nodeId: NodeId) => void;
    pruneDefaultUI              : (document: Document, nodeId: NodeId) => void;
    populateInitialValues       : (document: Document, nodeId: NodeId, fields: readonly Foundations.Field[], inputs: readonly Foundations.Port.Input[], overrides?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>) => void;
    populateCredentialInstances : (document: Document, nodeId: NodeId, assignments?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>) => void;
}
