import { toast } from "sonner"
import { Vault } from "@pretzel-graph/shared/domain"
import { api } from "@/SDKs/ApiInterceptorSDK"
import type { VaultSDKImpl } from "./sdk"

export type _VaultSDKActions = {
    refreshAll: () => Promise<void>
    create:     (req: Vault.API.CredentialInstance.Create.Request) => Promise<Vault.Credential.Instance>
    remove:     (id: Vault.Credential.Instance.Id) => Promise<void>
    update: {
        name: (id: Vault.Credential.Instance.Id, name: string) => Promise<void>
    }
}

export function _createVaultActions_(sdk: VaultSDKImpl): _VaultSDKActions {
    const setState = sdk.useStore.setState

    return {
        refreshAll: async () => {
            try {
                const { instances } = await Vault.API.CredentialInstance.list(api)
                setState(s => { s.credentialInstances = instances })
            } catch (err) {
                console.error('VaultSDK.refreshAll failed', err)
                toast.error('Failed to load credentials')
            }
        },

        create: async (req) => {
            try {
                const { instance } = await Vault.API.CredentialInstance.create(api, req)
                setState(s => { s.credentialInstances[instance.id] = instance })
                return instance
            } catch (err) {
                console.error('VaultSDK.create failed', err)
                toast.error('Failed to create credential')
                throw err
            }
        },

        remove: async (id) => {
            try {
                await Vault.API.CredentialInstance.remove(api, { id })
                setState(s => { delete s.credentialInstances[id] })
            } catch (err) {
                console.error('VaultSDK.remove failed', err)
                toast.error('Failed to delete credential')
                throw err
            }
        },

        update: {
            name: async (id, name) => {
                try {
                    const { instance } = await Vault.API.CredentialInstance.updateName(api, { id, name })
                    setState(s => { if (s.credentialInstances[id]) s.credentialInstances[id] = instance })
                } catch (err) {
                    console.error('VaultSDK.update.name failed', err)
                    toast.error('Failed to rename credential')
                    throw err
                }
            },
        },
    }
}
