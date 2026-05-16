import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field"
import type { Vault } from "@pretzel-graph/shared/domain"

export type CredentialTemplate<
    TId extends string = string,
    TFields extends readonly Field[] = readonly Field[]
> = {
    readonly id: TId & Vault.Credential.Template.Id
    readonly displayName: string
    readonly fields: TFields
    readonly icon?: string
}

export function defineCredential<
    const TId extends string,
    const TFields extends readonly Field[]
>(config: {
    id: TId
    displayName: string
    fields: TFields
    icon?: string
}): CredentialTemplate<TId, TFields> {
    return {
        id: config.id as TId & Vault.Credential.Template.Id,
        displayName: config.displayName,
        fields: config.fields,
        icon: config.icon,
    }
}
