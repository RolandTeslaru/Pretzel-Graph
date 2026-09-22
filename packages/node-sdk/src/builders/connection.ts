import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field"
import type { Derivable } from "@pretzel-graph/shared/domain/Foundations/Derivable"
import type { Gateway } from "@pretzel-graph/shared/domain"
import type { CredentialTemplate } from "./credential"
import type { ConditionKey } from "./blueprint/types"
import { compileDerivatives, stampDiscriminants } from "./blueprint/derivatives"

// SystemIcons key, resolved by IconRenderer.
const DEFAULT_ICON = "GatewayConnection"

// What a condition key contributes on a connection: fields and at most one credential.
export type ConnectionBody = {
    fields?:      readonly Field[]
    credentials?: readonly CredentialTemplate[]
} & {
    [K in ConditionKey]?: ConnectionBody
}

// Every credential template named inside the condition keys, at any depth.
type BranchCredentials<T> = {
    [K in keyof T & ConditionKey]:
        | (NonNullable<T[K]> extends { credentials?: readonly (infer C)[] } ? C : never)
        | BranchCredentials<NonNullable<T[K]>>
}[keyof T & ConditionKey]

// The code half of a connection, paired with a GatewaySocket. A user creates connections from
// it in the library; a node references one by id.
export type ConnectionDefinition<
    TId extends string = string,
    TFields extends readonly Field[] = readonly Field[],
    TBaseCredential = unknown,
    TBranchCredential = unknown
> = {
    readonly id: TId & Gateway.Definition.Id
    readonly __literalId?: TId
    readonly displayName: string
    readonly description?: string
    readonly icon: string
    readonly fields: TFields
    // Secrets live on the credential, when the socket needs any; everything else lives in `fields`.
    readonly credentials: readonly CredentialTemplate[]
    readonly _derivatives?: readonly Derivable.Branch[]
    // Phantoms for InferCredential: the base's template, and any a branch can add.
    readonly __baseCredential?: TBaseCredential
    readonly __branchCredential?: TBranchCredential
}

export function defineConnection<
    const TId extends string,
    const TFields extends readonly Field[],
    const TCredentials extends readonly CredentialTemplate[] = readonly [],
    // Captures the authored object verbatim, condition keys included, so branch credentials type the socket.
    const TDefinition extends Record<string, unknown> = Record<string, never>,
>(definition: TDefinition & {
    id: TId
    displayName: string
    description?: string
    icon?: string
    fields: TFields
    credentials?: TCredentials
} & {
    [K in ConditionKey]?: ConnectionBody
}): ConnectionDefinition<TId, TFields, TCredentials[number], BranchCredentials<TDefinition>> {

    const where = `defineConnection(${definition.id})`

    const { derivatives, discriminantIds } = compileDerivatives(
        definition.id,
        definition as unknown as Record<string, unknown>,
        definition.fields,
    )

    const baseCredentials = definition.credentials ?? []

    if (baseCredentials.length > 1)
        throw new Error(`${where}: declares ${baseCredentials.length} credentials; a connection takes at most one.`)

    // A connection has fields and a credential, never ports or ui, and ends up with at most one credential.
    const check = (branches: readonly Derivable.Branch[], path: string) => {
        for (const branch of branches) {
            const token = `${path}${branch.condition.fieldId}${branch.condition.operator}${String(branch.condition.value)}`
            const extra = branch as Derivable.Branch & { inputs?: unknown; outputs?: unknown; ui?: unknown }

            if (extra.inputs || extra.outputs || extra.ui || branch.replaces)
                throw new Error(`${where} at "${token}": a connection branch may only add fields and credentials.`)

            const count = branch.credentials?.length ?? 0

            if (count > 1)
                throw new Error(`${where} at "${token}": adds ${count} credentials; a connection takes at most one.`)

            if (count > 0 && baseCredentials.length > 0)
                throw new Error(`${where} at "${token}": adds a credential, but the definition already declares one.`)

            check(branch._derivatives ?? [], `${token}/`)
        }
    }

    check(derivatives, "")

    return {
        id: definition.id as TId & Gateway.Definition.Id,
        displayName: definition.displayName,
        description: definition.description,
        icon: definition.icon ?? DEFAULT_ICON,
        fields: stampDiscriminants(definition.fields, discriminantIds) as unknown as TFields,
        credentials: baseCredentials,
        ...(derivatives.length ? { _derivatives: derivatives as readonly Derivable.Branch[] } : {}),
    }
}
