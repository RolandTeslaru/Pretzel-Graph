"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractExposedInputs = extractExposedInputs;
exports.extractExposedOutputs = extractExposedOutputs;
exports.resolveInputs = resolveInputs;
exports.resolveOutputs = resolveOutputs;
const Port_1 = require("../Foundations/Port");
const EXPOSED_PORT_ID_FIELD = "exposed_port_id";
const REQUIRED_FIELD = "required";
function resolveVariant(unresolved, resolved) {
    if (unresolved === "UnresolvedList")
        return Port_1.Port.LIST_PROMOTION_MAP[resolved] ?? resolved;
    if (unresolved === "UnresolvedScalar")
        return Port_1.Port.LIST_DEMOTION_MAP[resolved] ?? resolved;
    return resolved;
}
// Base blueprint ports + the node's added ports, with each polymorphic group's variant replayed
// from `resolutions`. Variadic slots are already materialized in `added`, so no count expansion.
function resolve(base, added, resolutions) {
    const all = added && added.length > 0 ? [...base, ...added] : [...base];
    if (!resolutions)
        return all;
    return all.map(port => {
        const groupId = port.polymorphicGroupId;
        if (!groupId || !Port_1.Port.isUnresolvedLike(port.variant))
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
function extractExposedInputs(wfData) {
    const byId = {};
    for (const node of Object.values(wfData.nodes)) {
        if (node.blueprintId !== "Core.SubWorkflow.ExposeInputPort")
            continue;
        const variant = Object.values(node.polymorphicResolutions ?? {})[0];
        const portId = wfData.staticValues[node.id]?.[EXPOSED_PORT_ID_FIELD];
        if (!variant || !portId)
            continue;
        byId[portId] = {
            id: portId,
            displayName: node.ui.displayName,
            variant,
            required: Boolean(wfData.staticValues[node.id]?.[REQUIRED_FIELD]),
        };
    }
    return Object.values(byId);
}
// A subworkflow's exposed output ports, read from its `ExposeOutputPort` nodes. Same skip-if-unresolved rule.
function extractExposedOutputs(wfData) {
    const outputs = [];
    for (const node of Object.values(wfData.nodes)) {
        if (node.blueprintId !== "Core.SubWorkflow.ExposeOutputPort")
            continue;
        const variant = Object.values(node.polymorphicResolutions ?? {})[0];
        if (!variant)
            continue;
        outputs.push({
            id: Port_1.Port.Output.Id.parse(node.id),
            displayName: node.ui.displayName,
            variant,
        });
    }
    return outputs;
}
/**
 * Derive a slim node's live input ports. When the node is a subworkflow (a `dependency` record is
 * passed), its ports ARE the subworkflow's exposed inputs — the `base` (blueprint's own inputs) is
 * only a drawer-preview snapshot and would double the ports if concatenated, so it's dropped.
 * Otherwise it's the blueprint base plus the node's own `addedInputs`.
 */
function resolveInputs(base, node, dependency) {
    if (dependency)
        return resolve([], extractExposedInputs(dependency.workflow_data), node.polymorphicResolutions);
    return resolve(base, node.addedInputs, node.polymorphicResolutions);
}
/** Derive a slim node's live output ports. See {@link resolveInputs} for the `dependency` behavior. */
function resolveOutputs(base, node, dependency) {
    if (dependency)
        return resolve([], extractExposedOutputs(dependency.workflow_data), node.polymorphicResolutions);
    return resolve(base, node.addedOutputs, node.polymorphicResolutions);
}
