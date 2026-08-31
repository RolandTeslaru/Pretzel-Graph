import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field"
import type { Vault } from "@pretzel-graph/shared/domain"

export type CredentialTemplate<
    TId extends string = string,
    TFields extends readonly Field[] = readonly Field[]
> = {
    readonly id: TId & Vault.Credential.Template.Id
    readonly __literalId?: TId
    readonly displayName: string
    readonly fields: TFields
    readonly icon?: string
    readonly optional?: boolean
    readonly auth?: Vault.OAuth.Auth
}

export type OAuth2CredentialTemplate<
    TId extends string = string,
    TFields extends readonly Field[] = readonly Field[]
> = CredentialTemplate<TId, TFields> & {
    readonly auth: Vault.OAuth.Auth
}

export function defineCredential<
    const TId extends string,
    const TFields extends readonly Field[]
>(config: {
    id: TId
    displayName: string
    fields: TFields
    icon?: string
    optional?: boolean
}): CredentialTemplate<TId, TFields> {
    return {
        id: config.id as TId & Vault.Credential.Template.Id,
        displayName: config.displayName,
        fields: config.fields,
        icon: config.icon,
        optional: config.optional,
    }
}

// `fields` are what the form collects before the redirect; the tokens arrive through the callback.
export function defineOAuth2Credential<
    const TId extends string,
    const TFields extends readonly Field[]
>(config: {
    id: TId
    displayName: string
    fields: TFields
    icon?: string
    provider: Vault.OAuth.Provider
}): OAuth2CredentialTemplate<TId, TFields> {
    return {
        id: config.id as TId & Vault.Credential.Template.Id,
        displayName: config.displayName,
        fields: config.fields,
        icon: config.icon,
        auth: {
            kind: "oauth2",
            provider: config.provider,
        },
    }
}
