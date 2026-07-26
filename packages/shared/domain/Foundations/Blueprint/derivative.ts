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
    readonly _derivatives?: readonly Derivative[]
}


export namespace Derivative {

    export const Id = z.string().brand("DerivativeId")
    export type  Id = z.infer<typeof Id>

    // Equality only. Relational operators make the matched set non-exhaustive, which the
    // path-based identity and any future exhaustiveness check both depend on.
    export const OPERATORS = ["==", "!="] as const
    export type  Operator  = typeof OPERATORS[number]

    // Segments of a derivativeId: "action==list/listAPI==data"
    export const SEPARATOR = "/"

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


type Accumulator = {
    fields:      Field[]
    inputs:      Port.Input[]
    outputs:     Port.Output[]
    credentials: Vault.Credential.Template[]
    ui:          Record<string, unknown>
}

const seed = (blueprint: Blueprint): Accumulator => ({
    fields:      [...blueprint.fields],
    inputs:      [...blueprint.inputs],
    outputs:     [...blueprint.outputs],
    credentials: [...(blueprint.credentials ?? [])],
    ui:          { ...blueprint.ui },
})

// fields/ports/credentials accumulate; ui overrides key by key, deepest match winning.
const contribute = (accumulator: Accumulator, derivative: Derivative) => {
    accumulator.fields     .push(...(derivative.fields      ?? []))
    accumulator.inputs     .push(...(derivative.inputs      ?? []))
    accumulator.outputs    .push(...(derivative.outputs     ?? []))
    accumulator.credentials.push(...(derivative.credentials ?? []))

    for (const [key, value] of Object.entries(derivative.ui ?? {}))
        if (value !== undefined)
            accumulator.ui[key] = value
}

const assemble = (blueprint: Blueprint, accumulator: Accumulator): Blueprint => {
    const { _derivatives, ...rest } = blueprint as Blueprint & { _derivatives?: unknown }

    return {
        ...rest,
        fields:      accumulator.fields,
        inputs:      accumulator.inputs,
        outputs:     accumulator.outputs,
        credentials: accumulator.credentials,
        ui:          accumulator.ui,
    } as unknown as Blueprint
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
        for (const derivative of derivatives ?? []) {
            const { fieldId } = derivative.condition

            // defineBlueprint guarantees the discriminant is declared at or above this level,
            // and parents contribute before we recurse — so this lookup cannot miss.
            const declared = accumulator.fields.find(field => field.id === fieldId)
            const current  = fieldValues[fieldId] ?? declared?.initialValue

            if (!Derivative.matches(derivative.condition, current))
                continue

            contribute(accumulator, derivative)
            path.push(Derivative.formatToken(derivative.condition))

            walk(derivative._derivatives)
        }
    }

    walk((blueprint as Blueprint & { _derivatives?: readonly Derivative[] })._derivatives)

    return {
        blueprint:    assemble(blueprint, accumulator),
        derivativeId: path.length ? path.join(Derivative.SEPARATOR) as Derivative.Id : null,
    }
}


/**
 * Replays a known derivativeId without needing the field values that produced it — for
 * reconstructing the exact variant an execution ran against.
 */
export function deriveByPath(blueprint: Blueprint, derivativeId: Derivative.Id | string): Blueprint {
    const accumulator = seed(blueprint)
    const tokens      = String(derivativeId).split(Derivative.SEPARATOR).filter(Boolean)

    let derivatives = (blueprint as Blueprint & { _derivatives?: readonly Derivative[] })._derivatives

    for (const token of tokens) {
        const derivative = (derivatives ?? []).find(d => Derivative.formatToken(d.condition) === token)
        if (!derivative)
            throw new Error(`Blueprint.deriveByPath(${blueprint.id}): no derivative matching "${token}"`)

        contribute(accumulator, derivative)
        derivatives = derivative._derivatives
    }

    return assemble(blueprint, accumulator)
}
