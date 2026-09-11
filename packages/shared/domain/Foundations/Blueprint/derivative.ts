import { z } from "zod"
import { Port } from "../Port"
import { Field } from "../Field"
import { Vault } from "../../Vault"
import type { Blueprint } from "./index"


// A conditional contribution to a blueprint. Authored as an object key ("action==list") and
// serialized as a parsed record, so no consumer ever re-parses the syntax.
export interface Derivative {
    readonly condition:     Derivative.Condition
    readonly fields?:       readonly Field[]
    readonly inputs?:       readonly Port.Input[]
    readonly outputs?:      readonly Port.Output[]
    readonly credentials?:  readonly Vault.Credential.Template[]
    readonly ui?:           Partial<Blueprint["ui"]>
    /**
     * Members this branch replaces instead of appending to — e.g. tool mode, which swaps every
     * data port for a single Tool port rather than adding one.
     *
     * Applied in a second pass, so the result doesn't depend on where the branch sits among its
     * siblings. When any matched branch replaces a member, only replacing branches contribute
     * to it; the base and every appending branch are discarded for that member.
     */
    readonly replaces?:     readonly Derivative.Member[]
    /**
     * Suppresses every sibling at this level when it matches — the branch isn't overlaid on the
     * others, they simply don't apply. Tool mode is the motivating case: a node is either
     * configured for one operation or exposing all of them, never both.
     *
     * Distinct from terminal-ness, which is about descendants. Two sibling branches on orthogonal
     * discriminants can both legitimately apply; exclusivity is what says they can't.
     *
     * Only siblings are suppressed — the base still seeds every member, so a branch that also
     * needs to discard the base declares `replaces` alongside this.
     */
    readonly exclusive?:    boolean
    readonly _derivatives?: readonly Derivative[]
}


export namespace Derivative {

    export const Id = z.string().brand("DerivativeId")
    export type  Id = z.infer<typeof Id>

    export class PathNotFoundError extends Error {
        public override readonly name = "BlueprintDerivativePathNotFoundError"

        constructor(
            public readonly blueprintId:   Blueprint["id"],
            public readonly missingTokens: readonly string[],
        ) {
            super(
                `Blueprint.deriveByPath(${blueprintId}): no derivative matching ${
                    missingTokens.map(token => `"${token}"`).join(", ")
                }`,
            )
        }
    }

    // Equality only. Relational operators make the matched set non-exhaustive, which the
    // path-based identity and any future exhaustiveness check both depend on.
    export const OPERATORS = ["==", "!="] as const
    export type  Operator  = typeof OPERATORS[number]

    // Segments of a derivativeId: "action==list/listAPI==data"
    export const SEPARATOR = "/"

    // Accumulating members. `ui` is excluded — it always overrides, key by key.
    export const MEMBERS = ["fields", "inputs", "outputs", "credentials"] as const
    export type  Member  = typeof MEMBERS[number]

    export type Condition = {
        readonly fieldId:  Field.Id
        readonly operator: Operator
        readonly value:    Field.Value
    }

    export const Condition = {
        Schema: z.object({
            fieldId:  Field.Id,
            operator: z.enum(OPERATORS),
            value:    z.any(),
        }),
    }

    export const Schema: z.ZodType<Derivative> = z.lazy(() => z.object({
        condition:    Condition.Schema,
        fields:       z.array(Field.Schema).readonly().optional(),
        inputs:       z.array(Port.Input.Schema).readonly().optional(),
        outputs:      z.array(Port.Output.Schema).readonly().optional(),
        credentials:  z.array(Vault.Credential.Template.Schema).readonly().optional(),
        ui:           z.record(z.string(), z.string()).optional(),
        replaces:     z.array(z.enum(MEMBERS)).readonly().optional(),
        exclusive:    z.boolean().optional(),
        _derivatives: z.array(Schema).readonly().optional(),
    }) as unknown as z.ZodType<Derivative>)


    // "  action == list " -> { fieldId: "action", operator: "==", value: "list" }
    const KEY_PATTERN = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=)\s*(.+?)\s*$/

    export const parseKey = (key: string): { fieldId: string; operator: Operator; value: string } | null => {
        const match = KEY_PATTERN.exec(key)
        if (!match)
            return null

        return {
            fieldId:  match[1],
            operator: match[2] as Operator,
            value:    match[3],
        }
    }

    export const formatToken = (condition: Condition): string =>
        `${condition.fieldId}${condition.operator}${String(condition.value)}`

    export const matches = (condition: Condition, current: Field.Value | undefined): boolean => {
        const equal = current === condition.value
        return condition.operator === "==" ? equal : !equal
    }
}


type Bucket = Record<Derivative.Member, unknown[]>

type Accumulator = {
    // Base + every appending branch.
    appended:  Bucket
    // Contributions from branches that declared `replaces` for that member.
    replacing: Bucket
    replaced:  Set<Derivative.Member>
    ui:        Record<string, unknown>
}

const emptyBucket = (): Bucket => ({ fields: [], inputs: [], outputs: [], credentials: [] })

const seed = (blueprint: Blueprint): Accumulator => ({
    appended: {
        fields:      [...blueprint.fields],
        inputs:      [...blueprint.inputs],
        outputs:     [...blueprint.outputs],
        credentials: [...(blueprint.credentials ?? [])],
    },
    replacing: emptyBucket(),
    replaced:  new Set(),
    ui:        { ...blueprint.ui },
})

// fields/ports/credentials accumulate; ui overrides key by key, deepest match winning.
const contribute = (accumulator: Accumulator, derivative: Derivative) => {
    for (const member of Derivative.MEMBERS) {
        const items = derivative[member] ?? []

        if (derivative.replaces?.includes(member)) {
            // Recorded even when empty — "replace with nothing" is a legitimate instruction.
            accumulator.replaced.add(member)
            accumulator.replacing[member].push(...items)
            continue
        }

        accumulator.appended[member].push(...items)
    }

    for (const [key, value] of Object.entries(derivative.ui ?? {}))
        if (value !== undefined)
            accumulator.ui[key] = value
}

// Second pass: a replaced member takes only the replacing contributions, so the outcome doesn't
// depend on where the replacing branch sits among its siblings.
const resolveMember = (accumulator: Accumulator, member: Derivative.Member) =>
    accumulator.replaced.has(member)
        ? accumulator.replacing[member]
        : accumulator.appended[member]

// Framework-owned fields outlive a `fields` replacement. Without this, a defineTool branch would
// delete `isConvertedToTool` along with everything else and the editor could never toggle back.
const FRAMEWORK_FIELD_IDS: ReadonlySet<string> = new Set([
    "isConvertedToTool", "signalDependency", "dataDependency", "onErrorStrategy",
])

const resolveFields = (blueprint: Blueprint, accumulator: Accumulator) => {
    if (!accumulator.replaced.has("fields"))
        return accumulator.appended.fields

    const framework = blueprint.fields.filter(field => FRAMEWORK_FIELD_IDS.has(String(field.id)))

    return [...accumulator.replacing.fields, ...framework]
}

// A Variadic field is a slot count: its template ports are repeated once per slot, with `{n}`
// filled in and the field's id as the group, into whichever bucket the member resolves from.
const VARIADIC_TOKEN = /^([A-Za-z_][A-Za-z0-9_]*)==(\d+)$/

const fill = (text: string, n: number) => text.replace(/\{n\}/g, String(n))

const stamp = <P extends Port.Input | Port.Output>(port: P, n: number, groupId: string): P => ({
    ...port,
    id:                 fill(port.id, n),
    displayName:        port.displayName === undefined ? undefined : fill(port.displayName, n),
    polymorphicGroupId: port.polymorphicGroupId === undefined ? undefined : fill(port.polymorphicGroupId, n),
    groupId,
})

const slotCount = (field: Field.Variadic, value: unknown): number => {
    const asked = Number(value)
    const count = Number.isFinite(asked) ? Math.trunc(asked) : field.initialValue

    return Math.min(field.max ?? Infinity, Math.max(field.min ?? 0, count))
}

const generate = (accumulator: Accumulator, field: Field.Variadic, count: number) => {
    const start = field.startIndex ?? 1

    const bucketFor = (member: "inputs" | "outputs") =>
        accumulator.replaced.has(member) ? accumulator.replacing[member] : accumulator.appended[member]

    for (let i = 0; i < count; i++) {
        const n = start + i

        for (const port of field.template.inputs ?? [])
            bucketFor("inputs").push(stamp(port, n, field.id))

        for (const port of field.template.outputs ?? [])
            bucketFor("outputs").push(stamp(port, n, field.id))
    }
}

const variadicFields = (blueprint: Blueprint, accumulator: Accumulator): Field.Variadic[] =>
    (resolveFields(blueprint, accumulator) as Field[]).filter((f): f is Field.Variadic => f.variant === "Variadic")

const assemble = (blueprint: Blueprint, accumulator: Accumulator): Blueprint => {
    const { _derivatives, ...rest } = blueprint as Blueprint & { _derivatives?: unknown }

    return {
        ...rest,
        fields:      resolveFields(blueprint, accumulator),
        inputs:      resolveMember(accumulator, "inputs"),
        outputs:     resolveMember(accumulator, "outputs"),
        credentials: resolveMember(accumulator, "credentials"),
        ui:          accumulator.ui,
    } as unknown as Blueprint
}

// Assembled variants, memoized per base blueprint object and keyed by the sorted matched-token
// set, so derive and deriveByPath share entries and identical derivations return the same object.
// WeakMap keying gives a re-fetched blueprint a fresh slot and lets stale entries be collected.
const variantCache = new WeakMap<Blueprint, Map<string, Blueprint>>()

const memoizedAssemble = (
    blueprint:   Blueprint,
    tokens:      readonly string[],
    accumulator: Accumulator,
): Blueprint => {
    const key = [...tokens].sort().join(Derivative.SEPARATOR)

    let variants = variantCache.get(blueprint)
    if (!variants) {
        variants = new Map()
        variantCache.set(blueprint, variants)
    }

    let variant = variants.get(key)
    if (!variant) {
        variant = assemble(blueprint, accumulator)
        variants.set(key, variant)
    }

    return variant
}


/**
 * Folds a blueprint's derivative tree against a node's field values.
 *
 * Pure — never mutates `blueprint`, and strips `_derivatives` from the result so a derived
 * blueprint can't be derived again. Conditions fall back to the discriminant's `initialValue`,
 * which is what makes `derive(base, {})` return the correct default variant rather than the
 * bare base.
 */
export function derive(
    blueprint:   Blueprint,
    fieldValues: Partial<Record<Field.Id, Field.Value>>,
): { blueprint: Blueprint; derivativeId: Derivative.Id | null } {

    const accumulator = seed(blueprint)
    const path: string[] = []

    const walk = (derivatives: readonly Derivative[] | undefined) => {

        // The whole level is matched before anything contributes, so an exclusive branch wins
        // wherever it sits among its siblings — the same order-independence `replaces` gets from
        // being settled in a second pass.
        const matched = (derivatives ?? []).filter(derivative => {
            const { fieldId } = derivative.condition

            // defineBlueprint guarantees the discriminant is declared at or above this level,
            // and parents contribute before we recurse — so this lookup cannot miss. Both buckets
            // are searched: replacement is settled in a second pass, after the walk.
            const declared = [...accumulator.appended.fields, ...accumulator.replacing.fields]
                .find(field => (field as Field).id === fieldId) as Field | undefined

            return Derivative.matches(derivative.condition, fieldValues[fieldId] ?? declared?.initialValue)
        })

        const exclusive = matched.find(derivative => derivative.exclusive)

        for (const derivative of exclusive ? [exclusive] : matched) {
            contribute(accumulator, derivative)
            path.push(Derivative.formatToken(derivative.condition))

            walk(derivative._derivatives)
        }
    }

    walk((blueprint as Blueprint & { _derivatives?: readonly Derivative[] })._derivatives)

    // Slot counts fold after the branches, over whatever Variadic fields those left in place.
    for (const field of variadicFields(blueprint, accumulator)) {
        const count = slotCount(field, fieldValues[field.id])

        generate(accumulator, field, count)
        path.push(`${field.id}==${count}`)
    }

    return {
        blueprint:    memoizedAssemble(blueprint, path, accumulator),
        derivativeId: path.length ? path.join(Derivative.SEPARATOR) as Derivative.Id : null,
    }
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
export function deriveByPath(blueprint: Blueprint, derivativeId: Derivative.Id | string): Blueprint {
    const accumulator = seed(blueprint)
    const wanted      = new Set(String(derivativeId).split(Derivative.SEPARATOR).filter(Boolean))
    const seen        = new Set<string>()

    const walk = (derivatives: readonly Derivative[] | undefined) => {
        for (const derivative of derivatives ?? []) {
            const token = Derivative.formatToken(derivative.condition)
            if (!wanted.has(token))
                continue

            seen.add(token)
            contribute(accumulator, derivative)
            walk(derivative._derivatives)
        }
    }

    walk((blueprint as Blueprint & { _derivatives?: readonly Derivative[] })._derivatives)

    // Whatever the branches did not claim may be a slot count on a Variadic field.
    const fields = variadicFields(blueprint, accumulator)

    for (const token of wanted) {
        if (seen.has(token))
            continue

        const match = VARIADIC_TOKEN.exec(token)
        const field = match && fields.find(f => f.id === match[1])

        if (!field)
            continue

        seen.add(token)
        generate(accumulator, field, slotCount(field, Number(match![2])))
    }

    const missing = [...wanted].filter(token => !seen.has(token))
    if (missing.length)
        throw new Derivative.PathNotFoundError(blueprint.id, missing)

    return memoizedAssemble(blueprint, [...seen], accumulator)
}
