import type { Vault } from "@pretzel-graph/shared/domain"

import type { AccessTokenGetter } from "./client"

type CredentialsAPI = {
    getAccessToken(instanceId: Vault.Credential.Instance.Id): Promise<string>
}

// Fails on the run, not the compile: every node is instantiated before anything executes.
export function googleToken(
    credentialsAPI: CredentialsAPI,
    instance: Vault.Credential.Instance | undefined,
    nodeName: string,
): AccessTokenGetter {
    if (!instance)
        throw new Error(`${nodeName}: connect a Google account in the node's credential picker.`)

    return () => credentialsAPI.getAccessToken(instance.id)
}

// Empty strings arrive from blank fields; the APIs read them as literal filters.
export const optional = (value: string | undefined): string | undefined =>
    value?.trim() ? value.trim() : undefined

export const loaderValue = (field: { value: string } | undefined): string | undefined =>
    optional(field?.value)
