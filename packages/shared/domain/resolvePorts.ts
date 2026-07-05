import { Foundations } from "./Foundations";
import { Port } from "./Foundations/Port";
import type { Node } from "./Workflow/node";
import type { Workflow } from "./Workflow";

type PolymorphicResolutions = Record<Port.PolymorphicGroupId, Port.Variant>;

const EXPOSED_PORT_ID_FIELD = "exposed_port_id" as Foundations.Field.Id;
const REQUIRED_FIELD        = "required" as Foundations.Field.Id;

function resolveVariant(unresolved: Port.Variant, resolved: Port.Variant): Port.Variant {
    if (unresolved === "UnresolvedList")   return Port.LIST_PROMOTION_MAP[resolved] ?? resolved;
    if (unresolved === "UnresolvedScalar") return Port.LIST_DEMOTION_MAP[resolved] ?? resolved;
    return resolved;
}

// Base blueprint ports + the node's added ports, with each polymorphic group's variant replayed
// from `resolutions`. Variadic slots are already materialized in `added`, so no count expansion.
function resolve<P extends Foundations.Port.Input | Foundations.Port.Output>(
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
function extractExposedInputs(wfData: Workflow.Data): Foundations.Port.Input[] {
    const byId: Record<Port.Input.Id, Foundations.Port.Input> = {};

    for (const node of Object.values(wfData.nodes)) {
        if (node.blueprintId !== "Core.SubWorkflow.ExposeInputPort") continue;

        const variant = Object.values(node.polymorphicResolutions ?? {})[0];
        const portId  = wfData.staticValues[node.id]?.[EXPOSED_PORT_ID_FIELD] as Port.Input.Id | undefined;
        if (!variant || !portId) continue;

        byId[portId] = {
            id: portId,
            displayName: node.ui.displayName,
            variant,
            required: Boolean(wfData.staticValues[node.id]?.[REQUIRED_FIELD]),
        } as Foundations.Port.Input;
    }

    return Object.values(byId);
}

// A subworkflow's exposed output ports, read from its `ExposeOutputPort` nodes. Same skip-if-unresolved rule.
function extractExposedOutputs(wfData: Workflow.Data): Foundations.Port.Output[] {
    const outputs: Foundations.Port.Output[] = [];

    for (const node of Object.values(wfData.nodes)) {
        if (node.blueprintId !== "Core.SubWorkflow.ExposeOutputPort") continue;

        const variant = Object.values(node.polymorphicResolutions ?? {})[0];
        if (!variant) continue;

        outputs.push({
            id: Port.Output.Id.parse(node.id),
            displayName: node.ui.displayName,
            variant,
        } as Foundations.Port.Output);
    }

    return outputs;
}

/**
 * Derive a slim node's live input ports. When the node is a subworkflow (a `dependency` record is
 * passed), the "added" ports are the subworkflow's exposed inputs; otherwise they're the node's
 * own `addedInputs`.
 */
export function resolveInputs(
    base: readonly Foundations.Port.Input[],
    node: Node,
    dependency: Workflow.Dependency | null,
): Foundations.Port.Input[] {
    const added = dependency ? extractExposedInputs(dependency.workflow_data) : node.addedInputs;
    return resolve(base, added, node.polymorphicResolutions);
}

/** Derive a slim node's live output ports. See {@link resolveInputs} for the `dependency` behavior. */
export function resolveOutputs(
    base: readonly Foundations.Port.Output[],
    node: Node,
    dependency: Workflow.Dependency | null,
): Foundations.Port.Output[] {
    const added = dependency ? extractExposedOutputs(dependency.workflow_data) : node.addedOutputs;
    return resolve(base, added, node.polymorphicResolutions);
}
