import type { Validation } from "../../../Validation";
import type { Vault } from "../../../Vault";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface CredentialSelectors {
    getTemplates: (document: Document, nodeId: Workflow.Node.Id) => readonly Vault.Credential.Template[]
    getTemplate:  (document: Document, nodeId: Workflow.Node.Id, templateId: Vault.Credential.Template.Id) => Vault.Credential.Template | undefined
    getInstance:  (document: Document, nodeId: Workflow.Node.Id, templateId: Vault.Credential.Template.Id) => Vault.Credential.Instance.Id | null
    getIssue:     (document: Document, nodeId: Workflow.Node.Id, templateId: Vault.Credential.Template.Id) => Validation.Issue.Credential | null
}

export const credentialSelectors: CredentialSelectors = {
    getTemplates: (d, nodeId) => d.cache.resolvedShape[nodeId]?.credentials ?? [],
    getTemplate:  (d, nodeId, templateId) => d.cache.resolvedShape[nodeId]?.credentials.find(c => c.id === templateId),
    getInstance:  (d, nodeId, templateId) => d.data.credentialInstanceIds[nodeId]?.[templateId] ?? null,
    getIssue:     (d, nodeId, templateId) => d.issues.nodes[nodeId]?.credentials[templateId] ?? null,
}
