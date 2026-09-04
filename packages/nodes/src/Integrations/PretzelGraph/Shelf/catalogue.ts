import { CatalogueService } from "@pretzel-graph/node-sdk";
import { ALL_DRAWERS } from "@pretzel-graph/shared/constants/drawers";
import type { Foundations } from "@pretzel-graph/shared/domain";

// The shelf as a caller sees it: which blueprints exist, and what one needs to be placed and
// wired — ids, kinds, and whether a field reshapes the node. Never the whole definition.

export const listDrawers = () =>
    Object.values(ALL_DRAWERS).map(drawer => ({
        id:           drawer.id,
        displayName:  drawer.displayName,
        blueprintIds: drawer.blueprintIds,
    }));

export const projectBlueprint = (bp: Foundations.Blueprint) => ({
    id:          bp.id,
    displayName: bp.ui.displayName,
    description: bp.ui.description,
    fields: bp.fields.map(f => ({
        id:          f.id,
        displayName: f.displayName,
        variant:     f.variant,
        required:    f.required,
        tooltip:     f.tooltip,
        reconcile:   f.reconcile || undefined,
        options:     "options" in f ? f.options : undefined,
    })),
    inputs:  bp.inputs.map(p => ({ id: p.id, displayName: p.displayName, variant: p.variant })),
    outputs: bp.outputs.map(p => ({ id: p.id, displayName: p.displayName, variant: p.variant })),
});

export const getBlueprint = async (blueprintId: Foundations.Blueprint.Id) => {
    const blueprint = await CatalogueService.loadBaseBlueprint(blueprintId);

    if (!blueprint)
        throw new Error(`Blueprint ${blueprintId} not found`);

    return projectBlueprint(blueprint);
};
