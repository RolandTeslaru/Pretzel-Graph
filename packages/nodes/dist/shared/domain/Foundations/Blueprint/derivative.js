"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Derivative = void 0;
exports.derive = derive;
exports.deriveByPath = deriveByPath;
const zod_1 = require("zod");
const Port_1 = require("../Port");
const Field_1 = require("../Field");
const Vault_1 = require("../../Vault");
var Derivative;
(function (Derivative) {
    Derivative.Id = zod_1.z.string().brand("DerivativeId");
    class PathNotFoundError extends Error {
        blueprintId;
        missingTokens;
        name = "BlueprintDerivativePathNotFoundError";
        constructor(blueprintId, missingTokens) {
            super(`Blueprint.deriveByPath(${blueprintId}): no derivative matching ${missingTokens.map(token => `"${token}"`).join(", ")}`);
            this.blueprintId = blueprintId;
            this.missingTokens = missingTokens;
        }
    }
    Derivative.PathNotFoundError = PathNotFoundError;
    // Equality only. Relational operators make the matched set non-exhaustive, which the
    // path-based identity and any future exhaustiveness check both depend on.
    Derivative.OPERATORS = ["==", "!="];
    // Segments of a derivativeId: "action==list/listAPI==data"
    Derivative.SEPARATOR = "/";
    // Accumulating members. `ui` is excluded — it always overrides, key by key.
    Derivative.MEMBERS = ["fields", "inputs", "outputs", "credentials"];
    Derivative.Condition = {
        Schema: zod_1.z.object({
            fieldId: Field_1.Field.Id,
            operator: zod_1.z.enum(Derivative.OPERATORS),
            value: zod_1.z.any(),
        }),
    };
    Derivative.Schema = zod_1.z.lazy(() => zod_1.z.object({
        condition: Derivative.Condition.Schema,
        fields: zod_1.z.array(Field_1.Field.Schema).readonly().optional(),
        inputs: zod_1.z.array(Port_1.Port.Input.Schema).readonly().optional(),
        outputs: zod_1.z.array(Port_1.Port.Output.Schema).readonly().optional(),
        credentials: zod_1.z.array(Vault_1.Vault.Credential.Template.Schema).readonly().optional(),
        ui: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
        replaces: zod_1.z.array(zod_1.z.enum(Derivative.MEMBERS)).readonly().optional(),
        exclusive: zod_1.z.boolean().optional(),
        _derivatives: zod_1.z.array(Derivative.Schema).readonly().optional(),
    }));
    // "  action == list " -> { fieldId: "action", operator: "==", value: "list" }
    const KEY_PATTERN = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=)\s*(.+?)\s*$/;
    Derivative.parseKey = (key) => {
        const match = KEY_PATTERN.exec(key);
        if (!match)
            return null;
        return {
            fieldId: match[1],
            operator: match[2],
            value: match[3],
        };
    };
    Derivative.formatToken = (condition) => `${condition.fieldId}${condition.operator}${String(condition.value)}`;
    Derivative.matches = (condition, current) => {
        const equal = current === condition.value;
        return condition.operator === "==" ? equal : !equal;
    };
})(Derivative || (exports.Derivative = Derivative = {}));
const emptyBucket = () => ({ fields: [], inputs: [], outputs: [], credentials: [] });
const seed = (blueprint) => ({
    appended: {
        fields: [...blueprint.fields],
        inputs: [...blueprint.inputs],
        outputs: [...blueprint.outputs],
        credentials: [...(blueprint.credentials ?? [])],
    },
    replacing: emptyBucket(),
    replaced: new Set(),
    ui: { ...blueprint.ui },
});
// fields/ports/credentials accumulate; ui overrides key by key, deepest match winning.
const contribute = (accumulator, derivative) => {
    for (const member of Derivative.MEMBERS) {
        const items = derivative[member] ?? [];
        if (derivative.replaces?.includes(member)) {
            // Recorded even when empty — "replace with nothing" is a legitimate instruction.
            accumulator.replaced.add(member);
            accumulator.replacing[member].push(...items);
            continue;
        }
        accumulator.appended[member].push(...items);
    }
    for (const [key, value] of Object.entries(derivative.ui ?? {}))
        if (value !== undefined)
            accumulator.ui[key] = value;
};
// Second pass: a replaced member takes only the replacing contributions, so the outcome doesn't
// depend on where the replacing branch sits among its siblings.
const resolveMember = (accumulator, member) => accumulator.replaced.has(member)
    ? accumulator.replacing[member]
    : accumulator.appended[member];
// Framework-owned fields outlive a `fields` replacement. Without this, a defineTool branch would
// delete `isConvertedToTool` along with everything else and the editor could never toggle back.
const FRAMEWORK_FIELD_IDS = new Set([
    "isConvertedToTool", "signalDependency", "dataDependency", "onErrorStrategy",
]);
const resolveFields = (blueprint, accumulator) => {
    if (!accumulator.replaced.has("fields"))
        return accumulator.appended.fields;
    const framework = blueprint.fields.filter(field => FRAMEWORK_FIELD_IDS.has(String(field.id)));
    return [...accumulator.replacing.fields, ...framework];
};
const assemble = (blueprint, accumulator) => {
    const { _derivatives, ...rest } = blueprint;
    return {
        ...rest,
        fields: resolveFields(blueprint, accumulator),
        inputs: resolveMember(accumulator, "inputs"),
        outputs: resolveMember(accumulator, "outputs"),
        credentials: resolveMember(accumulator, "credentials"),
        ui: accumulator.ui,
    };
};
/**
 * Folds a blueprint's derivative tree against a node's field values.
 *
 * Pure — never mutates `blueprint`, and strips `_derivatives` from the result so a derived
 * blueprint can't be derived again. Conditions fall back to the discriminant's `initialValue`,
 * which is what makes `derive(base, {})` return the correct default variant rather than the
 * bare base.
 */
function derive(blueprint, fieldValues) {
    const accumulator = seed(blueprint);
    const path = [];
    const walk = (derivatives) => {
        // The whole level is matched before anything contributes, so an exclusive branch wins
        // wherever it sits among its siblings — the same order-independence `replaces` gets from
        // being settled in a second pass.
        const matched = (derivatives ?? []).filter(derivative => {
            const { fieldId } = derivative.condition;
            // defineBlueprint guarantees the discriminant is declared at or above this level,
            // and parents contribute before we recurse — so this lookup cannot miss. Both buckets
            // are searched: replacement is settled in a second pass, after the walk.
            const declared = [...accumulator.appended.fields, ...accumulator.replacing.fields]
                .find(field => field.id === fieldId);
            return Derivative.matches(derivative.condition, fieldValues[fieldId] ?? declared?.initialValue);
        });
        const exclusive = matched.find(derivative => derivative.exclusive);
        for (const derivative of exclusive ? [exclusive] : matched) {
            contribute(accumulator, derivative);
            path.push(Derivative.formatToken(derivative.condition));
            walk(derivative._derivatives);
        }
    };
    walk(blueprint._derivatives);
    return {
        blueprint: assemble(blueprint, accumulator),
        derivativeId: path.length ? path.join(Derivative.SEPARATOR) : null,
    };
}
/**
 * Replays a known derivativeId without needing the field values that produced it — for
 * reconstructing the exact variant an execution ran against.
 *
 * The id is a *set* of matched condition tokens, not a linear descent: several sibling branches
 * can match at the same level (a shape branch and tool mode, say), and derive() flattens them
 * into the same `/`-joined string as nested ones. So this re-walks the tree and takes any
 * derivative whose token is in the set, recursing only into the ones it took.
 */
function deriveByPath(blueprint, derivativeId) {
    const accumulator = seed(blueprint);
    const wanted = new Set(String(derivativeId).split(Derivative.SEPARATOR).filter(Boolean));
    const seen = new Set();
    const walk = (derivatives) => {
        for (const derivative of derivatives ?? []) {
            const token = Derivative.formatToken(derivative.condition);
            if (!wanted.has(token))
                continue;
            seen.add(token);
            contribute(accumulator, derivative);
            walk(derivative._derivatives);
        }
    };
    walk(blueprint._derivatives);
    const missing = [...wanted].filter(token => !seen.has(token));
    if (missing.length)
        throw new Derivative.PathNotFoundError(blueprint.id, missing);
    return assemble(blueprint, accumulator);
}
