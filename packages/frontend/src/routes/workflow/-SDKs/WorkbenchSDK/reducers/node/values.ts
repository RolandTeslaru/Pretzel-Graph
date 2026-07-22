import { Foundations, Vault, Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../../sdk";
import uid from "../../../../../../utils/uid";
import { VaultSDK } from "@/SDKs/VaultSDK/sdk";
import { ShelfSDK } from "../../../ShelfSDK/sdk";
import { isEqual } from "lodash";

type S      = WorkbenchSDK.State
type NodeId = Workflow.Node.Id

const generateUniqueString = (field: Foundations.Field): string => {
    if (field.variant !== "UniqueString") return "";
    return `${field.prefix ?? ""}${uid.randomUUID(field.length ?? 5)}`;
}

export const nodeValueReducers = {
    // Lazily create (and return) a node's staticValues bucket. Writers should go through this
    // instead of manually `??= {}`-ing so we never assume the bucket was pre-seeded.
    ensureStaticValues: (s, nodeId) => (s.data.staticValues[nodeId] ??= {}),
    // Normalize a loaded (possibly fat) node: drop any staticValue that equals its field/input
    // initialValue — those are derived on read. UniqueString values are kept (generated, not
    // derivable). Needs blueprints hydrated; call from load().
    pruneDefaultStaticValues: (s, nodeId) => {
        const bucket = s.data.staticValues[nodeId];
        if (!bucket) return;

        const initialById = new Map<string, any>();
        for (const field of s.selectors.node.getFields(s, nodeId)) {
            if (field.variant === "UniqueString") continue;
            if ("initialValue" in field) initialById.set(field.id, field.initialValue);
        }
        for (const input of s.selectors.node.getInputs(s, nodeId))
            if ("initialValue" in input && input.initialValue !== undefined)
                initialById.set(input.id, input.initialValue);

        for (const key of Object.keys(bucket) as (Foundations.Field.Id | Foundations.Port.Input.Id)[])
            if (initialById.has(key) && isEqual(bucket[key], initialById.get(key))) {
                delete bucket[key];
                s.isDirty = true;
            }

        if (Object.keys(bucket).length === 0)
            delete s.data.staticValues[nodeId];
    },
    // Normalize a loaded node's `ui`: drop any override key that equals the blueprint's ui value
    // (derived on read via node.getUI). isMinimized/isFlipped are pure view-state with no
    // blueprint counterpart, so they're always kept. Needs blueprints hydrated; call from load().
    pruneDefaultUI: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        if (!node?.ui) return;

        const bp = s.selectors.node.getBlueprint(s, nodeId);
        if (!bp) return;
        for (const key of ["displayName", "description", "icon", "accent", "iconColor"] as const)
            if (node.ui[key] !== undefined && node.ui[key] === bp.ui[key]) {
                delete node.ui[key];
                s.isDirty = true;
            }
    },
    // Plain field/input defaults are NOT persisted — they're derived on read from the
    // blueprint's `initialValue` everywhere it matters (render, worker, validation). We only
    // materialize (a) explicit `overrides` (paste/duplicate) and (b) UniqueString fields, whose
    // value is generated per-node and can't be re-derived from the blueprint.
    populateInitialValues: (s, nodeId, fields, inputs, overrides?) => {
        const next: Record<Foundations.Field.Id | Foundations.Port.Input.Id, any> = { ...(s.data.staticValues[nodeId] ?? {}) };

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
            delete s.data.staticValues[nodeId];
        else
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

        const blueprint = s.selectors.node.getBlueprint(s, nodeId);
        if (!blueprint) return;

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
} satisfies NodeValueReducers

export interface NodeValueReducers {
    ensureStaticValues          : (s: S, nodeId: NodeId) => Record<Foundations.Field.Id | Foundations.Port.Input.Id, any>;
    pruneDefaultStaticValues    : (s: S, nodeId: NodeId) => void;
    pruneDefaultUI              : (s: S, nodeId: NodeId) => void;
    populateInitialValues       : (s: S, nodeId: NodeId, fields: readonly Foundations.Field[], inputs: readonly Foundations.Port.Input[], overrides?: Record<Foundations.Field.Id | Foundations.Port.Input.Id, Foundations.Field.Value>) => void;
    populateCredentialInstances : (s: S, nodeId: NodeId, overrides?: Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>) => void;
}
