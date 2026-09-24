import { z } from "zod"
import { Port } from "../Port"
import { Field } from "../Field"
import { Derivable } from "../Derivable"
import type { Blueprint } from "./index"


// A conditional contribution to a blueprint. Authored as an object key ("action==list") and
// serialized as a parsed record, so no consumer ever re-parses the syntax.
export interface Derivative extends Omit<Derivable.Branch, "replaces" | "_derivatives"> {
    readonly inputs?:       readonly Port.Input[]
    readonly outputs?:      readonly Port.Output[]
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

    export const Id = Derivable.DerivativeId
    export type  Id = Derivable.DerivativeId

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

    export const OPERATORS = Derivable.OPERATORS
    export type  Operator  = Derivable.Operator

    export const SEPARATOR = Derivable.SEPARATOR

    // Accumulating members. `ui` is excluded — it always overrides, key by key.
    export const MEMBERS = ["fields", "inputs", "outputs", "credentials"] as const
    export type  Member  = typeof MEMBERS[number]

    export type Condition = Derivable.Condition

    export const Condition = {
        Schema: Derivable.Condition.Schema,
    }

    export const Schema: z.ZodType<Derivative> = z.lazy(() => Derivable.Branch.Base.extend({
        inputs:       z.array(Port.Input.Schema).readonly().optional(),
        outputs:      z.array(Port.Output.Schema).readonly().optional(),
        ui:           z.record(z.string(), z.string()).optional(),
        replaces:     z.array(z.enum(MEMBERS)).readonly().optional(),
        _derivatives: z.array(Schema).readonly().optional(),
    })) as unknown as z.ZodType<Derivative>


    export const parseKey    = Derivable.Condition.parseKey
    export const formatToken = Derivable.Condition.formatToken
    export const matches     = Derivable.Condition.matches
}


// ui overrides key by key, in walk order, deepest match winning.
const applyUi = (ui: Record<string, unknown>, derivative: Derivative) => {
    for (const [key, value] of Object.entries(derivative.ui ?? {}))
        if (value !== undefined)
            ui[key] = value
}

// Framework-owned fields outlive a `fields` replacement. Without this, a defineTool branch would
// delete `isConvertedToTool` along with everything else and the editor could never toggle back.
const FRAMEWORK_FIELD_IDS: ReadonlySet<string> = new Set([
    "isConvertedToTool", "signalDependency", "dataDependency", "onErrorStrategy",
])

const resolveFields = (blueprint: Blueprint, folded: Derivable.Fold) => {
    if (!folded.replaced.has("fields"))
        return folded.appended.fields

    const framework = blueprint.fields.filter(field => FRAMEWORK_FIELD_IDS.has(String(field.id)))

    return [...folded.replacing.fields, ...framework]
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

const generate = (folded: Derivable.Fold, field: Field.Variadic, count: number) => {
    const start = field.startIndex ?? 1

    for (let i = 0; i < count; i++) {
        const n = start + i

        for (const port of field.template.inputs ?? [])
            Derivable.resolve(folded, "inputs").push(stamp(port, n, field.id))

        for (const port of field.template.outputs ?? [])
            Derivable.resolve(folded, "outputs").push(stamp(port, n, field.id))
    }
}

const variadicFields = (blueprint: Blueprint, folded: Derivable.Fold): Field.Variadic[] =>
    (resolveFields(blueprint, folded) as Field[]).filter((f): f is Field.Variadic => f.variant === "Variadic")

const assemble = (blueprint: Blueprint, folded: Derivable.Fold, ui: Record<string, unknown>): Blueprint => {
    const { _derivatives, ...rest } = blueprint as Blueprint & { _derivatives?: unknown }

    return {
        ...rest,
        fields:      resolveFields(blueprint, folded),
        inputs:      Derivable.resolve(folded, "inputs"),
        outputs:     Derivable.resolve(folded, "outputs"),
        credentials: Derivable.resolve(folded, "credentials"),
        ui,
    } as unknown as Blueprint
}

// Assembled variants, memoized per base blueprint object and keyed by the sorted matched-token
// set, so derive and deriveByPath share entries and identical derivations return the same object.
// WeakMap keying gives a re-fetched blueprint a fresh slot and lets stale entries be collected.
const variantCache = new WeakMap<Blueprint, Map<string, Blueprint>>()

const memoizedAssemble = (
    blueprint: Blueprint,
    tokens:    readonly string[],
    folded:    Derivable.Fold,
    ui:        Record<string, unknown>,
): Blueprint => {
    const key = [...tokens].sort().join(Derivative.SEPARATOR)

    let variants = variantCache.get(blueprint)
    if (!variants) {
        variants = new Map()
        variantCache.set(blueprint, variants)
    }

    let variant = variants.get(key)
    if (!variant) {
        variant = assemble(blueprint, folded, ui)
        variants.set(key, variant)
    }

    return variant
}


/**
 * Folds a blueprint's derivative tree against a node's field values: the shared walk, plus ports,
 * ui overrides and Variadic slot counts.
 *
 * Pure — never mutates `blueprint`, and strips `_derivatives` from the result so a derived
 * blueprint can't be derived again.
 */
export function derive(
    blueprint:   Blueprint,
    fieldValues: Partial<Record<Field.Id, Field.Value>>,
): { blueprint: Blueprint; derivativeId: Derivative.Id | null } {

    const ui     = { ...blueprint.ui } as Record<string, unknown>
    const folded = Derivable.fold(blueprint as unknown as Derivable, fieldValues, Derivative.MEMBERS, branch => applyUi(ui, branch as Derivative))

    // Slot counts fold after the branches, over whatever Variadic fields those left in place.
    for (const field of variadicFields(blueprint, folded)) {
        const count = slotCount(field, fieldValues[field.id])

        generate(folded, field, count)
        folded.path.push(`${field.id}==${count}`)
    }

    return {
        blueprint:    memoizedAssemble(blueprint, folded.path, folded, ui),
        derivativeId: folded.path.length ? folded.path.join(Derivative.SEPARATOR) as Derivative.Id : null,
    }
}


/**
 * Replays a known derivativeId without needing the field values that produced it — for
 * reconstructing the exact variant an execution ran against. Tokens no branch claims may be
 * Variadic slot counts.
 */
export function deriveByPath(blueprint: Blueprint, derivativeId: Derivative.Id | string): Blueprint {
    const ui = { ...blueprint.ui } as Record<string, unknown>

    const { fold: folded, unclaimed } = Derivable.foldByPath(
        blueprint as unknown as Derivable, derivativeId, Derivative.MEMBERS, branch => applyUi(ui, branch as Derivative),
    )

    const seen   = new Set(folded.path)
    const fields = variadicFields(blueprint, folded)

    for (const token of unclaimed) {
        const match = VARIADIC_TOKEN.exec(token)
        const field = match && fields.find(f => f.id === match[1])

        if (!field)
            continue

        seen.add(token)
        generate(folded, field, slotCount(field, Number(match![2])))
    }

    const missing = unclaimed.filter(token => !seen.has(token))
    if (missing.length)
        throw new Derivative.PathNotFoundError(blueprint.id, missing)

    return memoizedAssemble(blueprint, [...seen], folded, ui)
}
