"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileDerivatives = compileDerivatives;
exports.stampDiscriminants = stampDiscriminants;
const Blueprint_1 = require("../../../../shared/domain/Foundations/Blueprint");
const types_1 = require("./types");
// Anything not structural is a condition key. A derivative body adds `ui` (a per-branch override)
// on top of the root's reserved keys; the union covers both, since neither set can collide.
const STRUCTURAL_KEYS = new Set([...types_1.RESERVED_DEFINITION_KEYS, "ui", "replaces", "__tool"]);
// Condition literals are authored as strings; compare against the field's real value type once
// here rather than coercing on every derive().
function coerce(field, literal, where) {
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
            const options = field.options ?? [];
            if (!options.some(option => option.value === literal))
                throw new Error(`${where}: "${literal}" is not one of ${field.id}'s options `
                    + `(${options.map(o => o.value).join(", ")})`);
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
function compileDerivatives(blueprintId, definition, baseFields) {
    const discriminantIds = new Set();
    // Global across the tree — makes two matched branches contributing the same field id impossible.
    const declaredFieldIds = new Set(baseFields.map(field => String(field.id)));
    const fieldsById = new Map(baseFields.map(field => [String(field.id), field]));
    // Registers a body's own fields as we descend into it. The root's fields are already seeded,
    // which is why this runs on the child, not on the body being compiled.
    const declare = (fields, where) => {
        for (const field of fields) {
            const fieldId = String(field.id);
            if (declaredFieldIds.has(fieldId))
                throw new Error(`defineBlueprint(${blueprintId}): duplicate field id "${fieldId}" at "${where}". `
                    + `Field ids must be unique across the whole derivative tree.`);
            declaredFieldIds.add(fieldId);
            fieldsById.set(fieldId, field);
        }
    };
    const compile = (body, scope, path) => {
        const keys = Object.keys(body).filter(key => !STRUCTURAL_KEYS.has(key));
        const derivatives = keys.map(key => {
            const where = `defineBlueprint(${blueprintId}) at "${path}${key}"`;
            const parsed = Blueprint_1.Blueprint.Derivative.parseKey(key);
            if (!parsed)
                throw new Error(`${where}: not a valid condition. Expected "field==value" or "field!=value".`);
            if (!scope.has(parsed.fieldId))
                throw new Error(`${where}: references field "${parsed.fieldId}", which is not declared at or above this level.`);
            const field = fieldsById.get(parsed.fieldId);
            discriminantIds.add(parsed.fieldId);
            const child = body[key];
            if (typeof child !== "object" || child === null)
                throw new Error(`${where}: must contain a derivative body object.`);
            // defineTool: a contribution, not a scope. It replaces the run-mode structure
            // wholesale and opens nothing, so no descent, no field registration (tool-mode ids
            // may legitimately reuse run-mode ones), and no nested conditions to validate.
            if (child.__tool === true)
                return {
                    condition: {
                        fieldId: parsed.fieldId,
                        operator: parsed.operator,
                        value: coerce(field, parsed.value, where),
                    },
                    fields: child.fields,
                    inputs: child.inputs,
                    outputs: child.outputs,
                    credentials: child.credentials,
                    ui: child.ui,
                    // Credentials are never per-call intent — an agent doesn't choose which
                    // account or proxy a node authenticates through. They survive tool mode, so
                    // any declared here append rather than replace.
                    replaces: ["fields", "inputs", "outputs"],
                    // Run-mode siblings don't apply in tool mode, so they're never walked — which
                    // is also what keeps their tokens out of the derivative id. `replaces` still
                    // handles the base, which exclusivity doesn't touch.
                    exclusive: true,
                    _derivatives: [],
                };
            // Replacing `fields` would delete the very discriminant this branch tests, leaving a
            // node that renders one variant and can never be switched back.
            if (child.replaces?.includes("fields"))
                throw new Error(`${where}: cannot replace "fields" — the discriminant lives there, so replacing it `
                    + `would make the node unswitchable. Replace "inputs"/"outputs" instead.`);
            const childFields = (child.fields ?? []);
            declare(childFields, `${path}${key}`);
            // A branch's own fields join the scope its nested conditions may target.
            const childScope = new Set([...scope, ...childFields.map(f => String(f.id))]);
            return {
                condition: {
                    fieldId: parsed.fieldId,
                    operator: parsed.operator,
                    value: coerce(field, parsed.value, where),
                },
                fields: child.fields,
                inputs: child.inputs,
                outputs: child.outputs,
                credentials: child.credentials,
                ui: child.ui,
                replaces: child.replaces,
                _derivatives: compile(child, childScope, `${path}${key}/`),
            };
        });
        // Two exclusive branches in one scope have no defined winner if both match — and unlike
        // ordinary siblings, they can't be resolved by overlaying.
        const exclusive = derivatives.filter(derivative => derivative.exclusive);
        if (exclusive.length > 1)
            throw new Error(`defineBlueprint(${blueprintId}) at "${path || "<root>"}": `
                + `${exclusive.length} exclusive branches in one scope `
                + `(${exclusive.map(d => `"${Blueprint_1.Blueprint.Derivative.formatToken(d.condition)}"`).join(", ")}). `
                + `At most one branch per scope may suppress its siblings.`);
        return derivatives;
    };
    const derivatives = compile(definition, new Set(declaredFieldIds), "");
    // Post-pass: a discriminant can be declared inside a branch and branched on deeper still
    // (listAPI), so the full id set only exists once the whole tree is compiled.
    return { derivatives: stampTree(derivatives, discriminantIds), discriminantIds };
}
function stampTree(derivatives, discriminantIds) {
    if (discriminantIds.size === 0)
        return derivatives;
    return derivatives.map(derivative => ({
        ...derivative,
        fields: derivative.fields && stampDiscriminants(derivative.fields, discriminantIds),
        _derivatives: derivative._derivatives && stampTree(derivative._derivatives, discriminantIds),
    }));
}
// A field a condition targets drives re-derivation, so the editor needs it flagged. Derived from
// the condition keys — nothing is declared by hand.
function stampDiscriminants(fields, discriminantIds) {
    if (discriminantIds.size === 0)
        return fields;
    return fields.map(field => discriminantIds.has(String(field.id))
        ? { ...field, reconcile: true }
        : field);
}
