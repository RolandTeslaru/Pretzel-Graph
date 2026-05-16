import type { Vault } from "@pretzel-graph/shared/domain"
import type { VaultSDK } from "./sdk"

export const _vaultSelectors_ = {
    byTemplateId: (state: VaultSDK.State, templateId: string): Vault.Credential.Instance[] =>
        Object.values(state.credentialInstances).filter(c => c.template_id === templateId),
}

export type _VaultSDKSelectors = typeof _vaultSelectors_
