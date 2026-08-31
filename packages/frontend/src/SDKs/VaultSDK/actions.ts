import { toast } from "sonner"
import { Vault } from "@pretzel-graph/shared/domain"
import { api } from "@/SDKs/ApiInterceptorSDK"
import type { VaultSDKImpl } from "./sdk"

export type _VaultSDKActions = {
    template: {
        load:      (id: Vault.Credential.Template.Id) => Promise<Vault.Credential.Template>
        loadBatch: (ids: Vault.Credential.Template.Id[]) => Promise<Record<Vault.Credential.Template.Id, Vault.Credential.Template>>
    }
    instance: {
        refreshAll: () => Promise<void>
        create:     (req: Vault.API.CredentialInstance.Create.Request) => Promise<Vault.Credential.Instance>
        remove:     (id: Vault.Credential.Instance.Id) => Promise<void>
        reveal:     (id: Vault.Credential.Instance.Id) => Promise<Vault.Credential.Instance.DecryptedValues>
        update: {
            name:   (id: Vault.Credential.Instance.Id, name: string) => Promise<void>
            values: (req: Vault.API.CredentialInstance.Update.Request) => Promise<void>
        }
    }
    oauth: {
        redirectUri: () => Promise<string>
        start:       (req: Vault.API.OAuth.Start.Request) => Promise<string>
        reconnect:   (id: Vault.Credential.Instance.Id) => Promise<string>
    }
}

export function _createVaultActions_(sdk: VaultSDKImpl): _VaultSDKActions {
    const setState = sdk.useStore.setState

    return {
        template: {
            load: async (id) => {
                try {
                    const { template } = await Vault.API.CredentialTemplate.get(api, id)
                    setState(s => { s.credentialTemplates[id] = template })
                    return template
                } catch (err) {
                    console.error('VaultSDK.template.load failed', err)
                    toast.error('Failed to load credential template')
                    throw err
                }
            },

            loadBatch: async (ids) => {
                try {
                    const { templates } = await Vault.API.CredentialTemplate.getBatch(api, { ids })
                    setState(s => { Object.assign(s.credentialTemplates, templates) })
                    return templates
                } catch (err) {
                    console.error('VaultSDK.template.loadBatch failed', err)
                    toast.error('Failed to load credential templates')
                    throw err
                }
            },
        },

        instance: {
            refreshAll: async () => {
                try {
                    const { instances } = await Vault.API.CredentialInstance.list(api)
                    setState(s => { s.credentialInstances = instances })
                } catch (err) {
                    console.error('VaultSDK.instance.refreshAll failed', err)
                    toast.error('Failed to load credentials')
                }
            },

            create: async (req) => {
                try {
                    const { instance } = await Vault.API.CredentialInstance.create(api, req)
                    setState(s => { s.credentialInstances[instance.id] = instance })
                    return instance
                } catch (err) {
                    console.error('VaultSDK.instance.create failed', err)
                    toast.error('Failed to create credential')
                    throw err
                }
            },

            remove: async (id) => {
                try {
                    await Vault.API.CredentialInstance.remove(api, { id })
                    setState(s => { delete s.credentialInstances[id] })
                } catch (err) {
                    console.error('VaultSDK.instance.remove failed', err)
                    toast.error('Failed to delete credential')
                    throw err
                }
            },

            reveal: async (id) => {
                try {
                    const { fieldValues } = await Vault.API.CredentialInstance.reveal(api, id)
                    return fieldValues
                } catch (err) {
                    console.error('VaultSDK.instance.reveal failed', err)
                    toast.error('Failed to load credential values')
                    throw err
                }
            },

            update: {
                name: async (id, name) => {
                    try {
                        const { instance } = await Vault.API.CredentialInstance.updateName(api, { id, name })
                        setState(s => { if (s.credentialInstances[id]) s.credentialInstances[id] = instance })
                    } catch (err) {
                        console.error('VaultSDK.instance.update.name failed', err)
                        toast.error('Failed to rename credential')
                        throw err
                    }
                },

                values: async (req) => {
                    try {
                        const { instance } = await Vault.API.CredentialInstance.update(api, req)
                        setState(s => { if (s.credentialInstances[req.id]) s.credentialInstances[req.id] = instance })
                    } catch (err) {
                        console.error('VaultSDK.instance.update.values failed', err)
                        toast.error('Failed to update credential')
                        throw err
                    }
                },
            },
        },

        oauth: {
            redirectUri: async () => {
                const { redirectUri } = await Vault.API.OAuth.redirectUri(api)
                return redirectUri
            },

            start: async (req) => {
                try {
                    const { authorizeUrl } = await Vault.API.OAuth.start(api, req)
                    return authorizeUrl
                } catch (err) {
                    console.error('VaultSDK.oauth.start failed', err)
                    toast.error('Failed to start the connection')
                    throw err
                }
            },

            reconnect: async (id) => {
                try {
                    const { authorizeUrl } = await Vault.API.OAuth.reconnect(api, id)
                    return authorizeUrl
                } catch (err) {
                    console.error('VaultSDK.oauth.reconnect failed', err)
                    toast.error('Failed to start the connection')
                    throw err
                }
            },
        },
    }
}
