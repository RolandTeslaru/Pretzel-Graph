import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field"
import type { Gateway } from "@pretzel-graph/shared/domain"
import type { CredentialTemplate } from "./credential"

// SystemIcons key, resolved by IconRenderer.
const DEFAULT_ICON = "WebSocket"

// The code half of a connection, paired with a GatewaySocket. A user creates connections from
// it in the library; a node references one by id.
export type ConnectionDefinition<
    TId extends string = string,
    TFields extends readonly Field[] = readonly Field[],
    TCredential extends CredentialTemplate | undefined = CredentialTemplate | undefined
> = {
    readonly id: TId & Gateway.Definition.Id
    readonly __literalId?: TId
    readonly displayName: string
    readonly description?: string
    readonly icon: string
    // Secrets live on the credential, when the socket needs any; everything else lives in `fields`.
    readonly credential: TCredential
    readonly fields: TFields
}

export function defineConnection<
    const TId extends string,
    const TFields extends readonly Field[],
    const TCredential extends CredentialTemplate | undefined = undefined
>(config: {
    id: TId
    displayName: string
    description?: string
    icon?: string
    credential?: TCredential
    fields: TFields
}): ConnectionDefinition<TId, TFields, TCredential> {
    return {
        id: config.id as TId & Gateway.Definition.Id,
        displayName: config.displayName,
        description: config.description,
        icon: config.icon ?? DEFAULT_ICON,
        credential: config.credential as TCredential,
        fields: config.fields,
    }
}
