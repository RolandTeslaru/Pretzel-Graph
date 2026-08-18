import { immer } from "zustand/middleware/immer";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { BaseSDK } from "@pretzel-graph/standard-ui/SDKs/Base";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import { Vault } from "@pretzel-graph/shared/domain";
import { _createVaultActions_, type _VaultSDKActions } from "./actions";
import { _vaultSelectors_, type _VaultSDKSelectors } from "./selectors";

@SDK("Vault")
export class VaultSDKImpl extends BaseSDK<VaultSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<VaultSDK.State> = createWithEqualityFn(
        immer<VaultSDK.State>(() => ({
            credentialInstances: {},
            credentialTemplates: {},
            selectors: _vaultSelectors_,
        })),
        shallow
    )

    public readonly reducers: VaultSDK.Reducers = {}
    public readonly selectors: VaultSDK.Selectors = _vaultSelectors_
    public readonly actions:   VaultSDK.Actions   = _createVaultActions_(this)
}

export const VaultSDK = SDK.get<VaultSDKImpl>("Vault")

export namespace VaultSDK {

    export type State = {
        credentialInstances: Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>
        credentialTemplates: Record<Vault.Credential.Template.Id, Vault.Credential.Template>
        selectors:           VaultSDK.Selectors
    }

    export type Reducers = {}
    export type Selectors = _VaultSDKSelectors
    export type Actions   = _VaultSDKActions
}
