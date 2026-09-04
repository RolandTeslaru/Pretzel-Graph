import type { Foundations } from "@pretzel-graph/shared/domain";

type Derivative = Foundations.Blueprint.Derivative;

// What a caller needs to pick a blueprint and wire it: ids, kinds, and whether a field reshapes
// the node. Never the whole definition.
export const projectToBaseBlueprint = (bp: Foundations.Blueprint) => ({
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

export interface Derivation {
    /** Conditions from the base down, e.g. "target==node/nodeOperation==create". */
    path:     string
    adds:     { fields: Foundations.Field.Id[], inputs: Foundations.Port.Input.Id[], outputs: Foundations.Port.Output.Id[] }
    /** Base members this branch drops rather than extends. */
    replaces: { fields?: Foundations.Field.Id[], inputs?: Foundations.Port.Input.Id[], outputs?: Foundations.Port.Output.Id[] }
}

const TOOL_MODE_FIELD = "isConvertedToTool";

const describe = (c: Derivative["condition"]) => `${c.fieldId}${c.operator}${String(c.value)}`;

// Every reachable branch of the derivative tree, flattened, with what it contributes. Tool mode
// is a branch too, but not one a caller placing a node would set, so it is left out.
export const listDerivations = (bp: Foundations.Blueprint): Derivation[] => {
    const out: Derivation[] = [];

    const walk = (branches: readonly Derivative[] | undefined, prefix: string) => {
        for (const branch of branches ?? []) {
            if (branch.condition.fieldId === TOOL_MODE_FIELD)
                continue;

            const path     = prefix ? `${prefix}/${describe(branch.condition)}` : describe(branch.condition);
            const replaces = new Set(branch.replaces ?? []);

            out.push({
                path,
                adds: {
                    fields:  (branch.fields  ?? []).map(f => f.id),
                    inputs:  (branch.inputs  ?? []).map(p => p.id),
                    outputs: (branch.outputs ?? []).map(p => p.id),
                },
                replaces: {
                    ...(replaces.has("fields")  && { fields:  bp.fields.map(f => f.id) }),
                    ...(replaces.has("inputs")  && { inputs:  bp.inputs.map(p => p.id) }),
                    ...(replaces.has("outputs") && { outputs: bp.outputs.map(p => p.id) }),
                },
            });

            walk(branch._derivatives, path);
        }
    };

    walk(bp._derivatives, "");

    return out;
};
