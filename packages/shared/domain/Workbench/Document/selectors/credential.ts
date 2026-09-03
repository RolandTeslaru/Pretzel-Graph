import type { Validation } from "../../../Validation";
import type { Vault } from "../../../Vault";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface CredentialSelectors {
    getTemplates: (state: Document, nodeId: Workflow.Node.Id) => readonly Vault.Credential.Template[]
    getTemplate:  (state: Document, nodeId: Workflow.Node.Id, templateId: Vault.Credential.Template.Id) => Vault.Credential.Template | undefined
    getInstance:  (state: Document, nodeId: Workflow.Node.Id, templateId: Vault.Credential.Template.Id) => Vault.Credential.Instance.Id | null
    getIssue:     (state: Document, nodeId: Workflow.Node.Id, templateId: Vault.Credential.Template.Id) => Validation.Issue.Credential | null
}

export const credentialSelectors: CredentialSelectors = {
    getTemplates: (s, nodeId) => s.cache.resolvedShape[nodeId]?.credentials ?? [],
    getTemplate:  (s, nodeId, templateId) => s.cache.resolvedShape[nodeId]?.credentials.find(c => c.id === templateId),
    getInstance:  (s, nodeId, templateId) => s.data.credentialInstanceIds[nodeId]?.[templateId] ?? null,
    getIssue:     (s, nodeId, templateId) => s.issues.nodes[nodeId]?.credentials[templateId] ?? null,
}
