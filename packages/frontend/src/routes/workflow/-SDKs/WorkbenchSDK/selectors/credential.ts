import type { Validation, Vault, Workflow } from '@pretzel-graph/shared/domain';
import type { WorkbenchSDK } from "../sdk";

export interface CredentialSelectors {
    getTemplates: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => readonly Vault.Credential.Template[]
    getTemplate:  (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, templateId: Vault.Credential.Template.Id) => Vault.Credential.Template | undefined
    getIssue:     (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, templateId: Vault.Credential.Template.Id) => Validation.Issue.Credential | null
}

export const credentialSelectors = {
    getTemplates: (s, nodeId) => s.cache.resolvedShape[nodeId]?.credentials ?? [],
    getTemplate:  (s, nodeId, templateId) => s.cache.resolvedShape[nodeId]?.credentials.find(c => c.id === templateId),
    getIssue:     (s, nodeId, templateId) => s.issues.nodes[nodeId]?.credentials[templateId] ?? null,
} satisfies CredentialSelectors
