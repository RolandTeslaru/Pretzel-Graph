import { Foundations } from "../Foundations";
import { Blueprint } from "../Foundations/Blueprint";
import { Field } from "../Foundations/Field";
import { Port } from "../Foundations/Port";
import type { Node } from "./node";
import type { Workflow } from "./index";
import type { Dependency } from "../Dependency";
import type { Vault } from "../Vault";
import { SHAPE_DEPENDENCY_FIELD_ID } from "../ids";

type PolymorphicResolutions = Record<Port.PolymorphicGroupId, Port.Variant>;

const EXPOSED_PORT_ID_FIELD = "exposed_port_id" as Field.Id;
const REQUIRED_FIELD        = "required" as Field.Id;

function resolveVariant(unresolved: Port.Variant, resolved: Port.Variant): Port.Variant {
    if (unresolved === "UnresolvedList")   return Port.LIST_PROMOTION_MAP[resolved] ?? resolved;
    if (unresolved === "UnresolvedScalar") return Port.LIST_DEMOTION_MAP[resolved] ?? resolved;
    return resolved;
}

// Base blueprint ports + the node's added ports, with each polymorphic group's variant replayed
// from `resolutions`. Variadic slots are already materialized in `added`, so no count expansion.
function resolve<P extends Port.Input | Port.Output>(
    base: readonly P[],
    added: readonly P[] | undefined,
    resolutions: PolymorphicResolutions | undefined,
): P[] {
    const all = added && added.length > 0 ? [...base, ...added] : [...base];
    if (!resolutions) return all;

    return all.map(port => {
        const groupId = port.polymorphicGroupId;
        if (!groupId || !Port.isUnresolvedLike(port.variant))
            return port;

        const resolved = resolutions[groupId];
        if (!resolved)
            return port;

        return { ...port, variant: resolveVariant(port.variant, resolved) };
    });
}

// A subworkflow's exposed input ports, read from its `ExposeInputPort` nodes. An expose-node that
// hasn't resolved its variant (or hasn't picked a port id) isn't a real port yet, so it's skipped
// rather than throwing — this runs on the read path, per render.
export function extractExposedInputs(wfData: Workflow.Data): Port.Input[] {
    const byId: Record<Port.Input.Id, Port.Input> = {};

    for (const node of Object.values(wfData.nodes)) {
        if (node.blueprintId !== "Core.SubWorkflow.ExposeInputPort") continue;

        const variant = Object.values(node.polymorphicResolutions ?? {})[0];
        const portId  = wfData.staticValues[node.id]?.[EXPOSED_PORT_ID_FIELD] as Port.Input.Id | undefined;
        if (!variant || !portId) 
            continue;

        byId[portId] = {
            id: portId,
            displayName: node.ui.displayName,
            variant,
            required: Boolean(wfData.staticValues[node.id]?.[REQUIRED_FIELD]),
        } as Port.Input;
    }

    return Object.values(byId);
}

// A subworkflow's exposed output ports, read from its `ExposeOutputPort` nodes. Same skip-if-unresolved rule.
export function extractExposedOutputs(wfData: Workflow.Data): Port.Output[] {
    const byId: Record<Port.Output.Id, Port.Output> = {};

    for (const node of Object.values(wfData.nodes)) {
        if (node.blueprintId !== "Core.SubWorkflow.ExposeOutputPort") continue;

        const variant = Object.values(node.polymorphicResolutions ?? {})[0];
        const portId  = wfData.staticValues[node.id]?.[EXPOSED_PORT_ID_FIELD] as Port.Output.Id | undefined;
        if (!variant || !portId)
            continue;

        byId[portId] = {
            id: portId,
            displayName: node.ui.displayName,
            variant,
        } as Port.Output;
    }

    return Object.values(byId);
}



// A node's live input ports: the subworkflow's exposed inputs when a dependency graph is passed, else the blueprint base, plus the node's `addedInputs`.
export function resolveInputs(
    base: readonly Port.Input[],
    node: Node.Raw,
    shapeDepData: Workflow.Data | null,
): Port.Input[] {
    if (shapeDepData)
        return resolve(extractExposedInputs(shapeDepData), node.addedInputs, node.polymorphicResolutions);
    return resolve(base, node.addedInputs, node.polymorphicResolutions);
}

/** Derive a slim node's live output ports. See {@link resolveInputs} for the `shapeDepData` behavior. */
export function resolveOutputs(
    base: readonly Port.Output[],
    node: Node.Raw,
    shapeDepData: Workflow.Data | null,
): Port.Output[] {
    if (shapeDepData)
        return resolve([], extractExposedOutputs(shapeDepData), node.polymorphicResolutions);
    return resolve(base, node.addedOutputs, node.polymorphicResolutions);
}

// A workflow served as a node: the base blueprint skinned with the workflow's display meta, exposed ports, and fields.
export function toBlueprint(
    base: Blueprint, 
    args: {
        id: Blueprint.Id;
        meta: Workflow.Meta;
        data: Workflow.Data;
        dependencyRef: Dependency.Ref.Workflow;
    }
): Blueprint {
    return {
        ...base,
        id: args.id,
        ui: {
            displayName: args.meta.display_name,
            description: args.meta.description ?? undefined,
            icon:        args.meta.icon ?? base.ui.icon,
            accent:      args.meta.accent ?? base.ui.accent,
            iconColor:   base.ui.iconColor,
        },
        fields:  mergeFieldsById(pinDependency(base.fields, args.dependencyRef), args.data.globalFields ?? []),
        inputs:  extractExposedInputs(args.data),
        outputs: extractExposedOutputs(args.data),
    };
}

// Presets the node's own dependency field to the workflow and hides it; other dependency fields stay as declared.
function pinDependency(fields: readonly Foundations.Field[], dependencyRef: Dependency.Ref.Workflow): Foundations.Field[] {
    return fields.map(field => {
        if (field.id !== SHAPE_DEPENDENCY_FIELD_ID || field.variant !== "Dependency")
            return field;

        return { ...field, initialValue: dependencyRef, hidden: true };
    });
}

// Base fields win; the workflow's own fields fill in behind them.
function mergeFieldsById(
    baseFields: readonly Foundations.Field[],
    dependencyFields: readonly Foundations.Field[],
): Foundations.Field[] {
    const fieldsById = new Map<Foundations.Field.Id, Foundations.Field>();

    for (const field of baseFields)
        fieldsById.set(field.id, field);

    for (const field of dependencyFields)
        if (!fieldsById.has(field.id))
            fieldsById.set(field.id, field);

    return [...fieldsById.values()];
}


// Every credential instance a workflow references, including the ones inside its
// sub-workflow dependencies — what the backend loads before queueing a run.
export function collectCredentialInstanceIds(data: Workflow.Data): Set<Vault.Credential.Instance.Id> {
    const ids = new Set<Vault.Credential.Instance.Id>();

    for (const nodeMap of Object.values(data.credentialInstanceIds))
        for (const instanceId of Object.values(nodeMap) as Vault.Credential.Instance.Id[])
            ids.add(instanceId);

    for (const dependency of Object.values(data.dependencies)) {
        switch (dependency.kind) {
            case "draftWorkflow":
            case "publishedWorkflow":
            case "listing":
                collectCredentialInstanceIds(dependency.workflow_data).forEach(id => ids.add(id));
                break;

            case "skill":
                break;

            default:
                dependency satisfies never;
        }
    }

    return ids;
}
