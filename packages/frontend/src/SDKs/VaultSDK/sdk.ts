import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Vault } from "@vx-agent-editor/shared/types";
import { VaultAPI } from "./api";

@SDK("Vault")
export class VaultSDKImpl extends BaseSDK<VaultSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<VaultSDK.State> = create(
        immer<VaultSDK.State>(() => ({
            credentials: [],
        }))
    )

    public readonly reducers: VaultSDK.Reducers = {}

    public readonly actions: VaultSDK.Actions = {
        create: async (config) => {
            await VaultAPI.Credential.Create.execute(config);
        },
        delete: async (id) => {
            await VaultAPI.Credential.Delete.execute({ id });
        },
        reveal: async (id) => {
            const { value } = await VaultAPI.Credential.Reveal.fetch({ id });
            return value;
        },
        refreshAll: async () => {
            const credentials = await VaultAPI.Credential.GetAll.fetch();
            this.setState(s => {
                s.credentials = credentials;
            })
        },
        getAll: async () => {
            const credentials = await VaultAPI.Credential.GetAll.fetch();
            this.setState(s => {
                s.credentials = credentials;
            })
        },
        update: {
            secret: async (config) => {
                await VaultAPI.Credential.Update.Secret.execute(config);
            },
            meta: async (config) => {
                await VaultAPI.Credential.Update.Meta.execute(config);
            }
        }
    }

    public readonly selectors: VaultSDK.Selectors = {

    }

}

export const VaultSDK = SDK.get<VaultSDKImpl>("Vault")

export namespace VaultSDK {

    export type State = {
        credentials: Vault.Credential[]
    }

    export type Reducers = {
    }
    export type Actions = {
        create: (config: { name: string, provider: string, value: string }) => Promise<void>,
        delete: (id: Vault.Credential.Id) => Promise<void>,
        reveal: (id: Vault.Credential.Id) => Promise<Vault.Secret>,
        refreshAll: () => Promise<void>,
        getAll: () => Promise<void>,
        update: {
            secret: (config: { id: Vault.Credential.Id, newValue: string }) => Promise<void>,
            meta: (config: { id: Vault.Credential.Id, name?: string, provider?: string }) => Promise<void>
        }
    }
    export type Selectors = {}
}