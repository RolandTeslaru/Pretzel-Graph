import { Vault } from '@pretzel-graph/shared/domain'

// Mirrors NetworkProxy.TEMPLATE_ID in node-sdk — the frontend doesn't depend on that package.
// Auto-appended to every proxyCompatible blueprint by defineBlueprint, so it's hidden from the
// Credentials section and attached from the node's options dropdown instead.
export const PROXY_TEMPLATE_ID = "networkProxy" as Vault.Credential.Template.Id
