import type { Field }      from "@pretzel-graph/shared/domain/Foundations/Field";
import { Blueprint }       from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { Derivative } from "@pretzel-graph/shared/domain/Foundations/Blueprint/derivative";
import { RESERVED_DEFINITION_KEYS, type DerivativeBody } from "./types";


// Anything not structural is a condition key. A derivative body adds `ui` (a per-branch override)
// on top of the root's reserved keys; the union covers both, since neither set can collide.
const STRUCTURAL_KEYS: ReadonlySet<string> = new Set([...RESERVED_DEFINITION_KEYS, "ui"]);


export type CompiledDerivatives = {
    derivatives:     readonly Derivative[]
    discriminantIds: ReadonlySet<string>
}

// Condition literals are authored as strings; compare against the field's real value type once
// here rather than coercing on every derive().
function coerce(field: Field, literal: string, where: string): Field.Value {
    switch (field.variant) {
        case "Boolean":
            if (literal !== "true" && literal !== "false")
                throw new Error(`${where}: "${literal}" is not a boolean — expected "true" or "false"`);
            return literal === "true";

        case "Integer":
        case "Float": {
            const parsed = Number(literal);
            if (Number.isNaN(parsed))
                throw new Error(`${where}: "${literal}" is not a number`);
            return parsed;
        }

        case "MultiOption": {
            const options = (field as { options?: readonly { value: string }[] }).options ?? [];
            if (!options.some(option => option.value === literal))
                throw new Error(
                    `${where}: "${literal}" is not one of ${field.id}'s options `
                    + `(${options.map(o => o.value).join(", ")})`,
                );
            return literal;
        }

        default:
            return literal;
    }
}


/**
 * Folds a definition's condition keys into a serializable derivative tree.
 *
 * Everything that can fail does so here, at module load: malformed keys, conditions targeting an
 * undeclared field, literals outside a discriminant's options, duplicate field ids. That is what
 * lets Blueprint.derive stay a plain tree walk with no validation in it.
 */
export function compileDerivatives(
    blueprintId: string,
    definition:  Record<string, unknown>,
    baseFields:  readonly Field[],
): CompiledDerivatives {

    const discriminantIds = new Set<string>();
    // Global across the tree — makes two matched branches contributing the same field id impossible.
    const declaredFieldIds = new Set<string>(baseFields.map(field => String(field.id)));
    const fieldsById       = new Map<string, Field>(baseFields.map(field => [String(field.id), field]));

    // Registers a body's own fields as we descend into it. The root's fields are already seeded,
    // which is why this runs on the child, not on the body being compiled.
    const declare = (fields: readonly Field[], where: string) => {
        for (const field of fields) {
            const fieldId = String(field.id);
            if (declaredFieldIds.has(fieldId))
                throw new Error(
                    `defineBlueprint(${blueprintId}): duplicate field id "${fieldId}" at "${where}". `
                    + `Field ids must be unique across the whole derivative tree.`,
                );

            declaredFieldIds.add(fieldId);
            fieldsById.set(fieldId, field);
        }
    };

    const compile = (
        body:  Record<string, unknown>,
        scope: ReadonlySet<string>,
        path:  string,
    ): Derivative[] => {

        const keys = Object.keys(body).filter(key => !STRUCTURAL_KEYS.has(key));

        return keys.map(key => {
            const where  = `defineBlueprint(${blueprintId}) at "${path}${key}"`;
            const parsed = Blueprint.Derivative.parseKey(key);

            if (!parsed)
                throw new Error(
                    `${where}: not a valid condition. Expected "field==value" or "field!=value".`,
                );

            if (!scope.has(parsed.fieldId))
                throw new Error(
                    `${where}: references field "${parsed.fieldId}", which is not declared at or above this level.`,
                );

            const field = fieldsById.get(parsed.fieldId)!;
            discriminantIds.add(parsed.fieldId);

            const child = body[key] as DerivativeBody;
            if (typeof child !== "object" || child === null)
                throw new Error(`${where}: must contain a derivative body object.`);

            const childFields = (child.fields ?? []) as readonly Field[];
            declare(childFields, `${path}${key}`);

            // A branch's own fields join the scope its nested conditions may target.
            const childScope = new Set([...scope, ...childFields.map(f => String(f.id))]);

            return {
                condition: {
                    fieldId:  parsed.fieldId as Field.Id,
                    operator: parsed.operator,
                    value:    coerce(field, parsed.value, where),
                },
                fields:       child.fields      as readonly Field[] | undefined,
                inputs:       child.inputs      as Derivative["inputs"],
                outputs:      child.outputs     as Derivative["outputs"],
                credentials:  child.credentials as unknown as Derivative["credentials"],
                ui:           child.ui,
                _derivatives: compile(child as Record<string, unknown>, childScope, `${path}${key}/`),
            } satisfies Derivative;
        });
    };

    const derivatives = compile(definition, new Set(declaredFieldIds), "");

    // Post-pass: a discriminant can be declared inside a branch and branched on deeper still
    // (listAPI), so the full id set only exists once the whole tree is compiled.
    return { derivatives: stampTree(derivatives, discriminantIds), discriminantIds };
}


function stampTree(
    derivatives:     readonly Derivative[],
    discriminantIds: ReadonlySet<string>,
): readonly Derivative[] {
    if (discriminantIds.size === 0)
        return derivatives;

    return derivatives.map(derivative => ({
        ...derivative,
        fields:       derivative.fields && stampDiscriminants(derivative.fields, discriminantIds),
        _derivatives: derivative._derivatives && stampTree(derivative._derivatives, discriminantIds),
    }));
}


// A field a condition targets drives re-derivation, so the editor needs it flagged. Derived from
// the condition keys — nothing is declared by hand.
export function stampDiscriminants(
    fields:          readonly Field[],
    discriminantIds: ReadonlySet<string>,
): readonly Field[] {
    if (discriminantIds.size === 0)
        return fields;

    return fields.map(field =>
        discriminantIds.has(String(field.id))
            ? { ...field, reconcile: true }
            : field,
    );
}
