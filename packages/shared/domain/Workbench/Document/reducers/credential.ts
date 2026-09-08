import { Validation } from "../../../Validation";
import { Vault } from "../../../Vault";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export const credentialReducers: CredentialReducers = {
    setInstance: (d, nodeId, templateId, instanceId) => {
        d.isDirty = true;
        if (!d.data.credentialInstanceIds[nodeId])
            d.data.credentialInstanceIds[nodeId] = {};
        if (instanceId === null) {
            delete d.data.credentialInstanceIds[nodeId][templateId];
        } else {
            d.data.credentialInstanceIds[nodeId][templateId] = instanceId;
        }

        d.reducers.credential.validate(d, nodeId, templateId);
    },
    validate: (d, nodeId, templateId) => {
        const template = d.selectors.credential.getTemplate(d, nodeId, templateId);
        if (!template) return false;

        const issue = Validation.Issue.Credential.check(template, nodeId, d.data);
        if (issue) {
            d.issues.nodes[nodeId] ??= { fields: {}, inputs: {}, credentials: {} };
            d.issues.nodes[nodeId].credentials[templateId] = issue;
            return true;
        }

        delete d.issues.nodes[nodeId]?.credentials?.[templateId];
        return false;
    },
}

type CredentialReducers = {
    setInstance: (
        document: Document,
        nodeId: Workflow.Node.Id,
        templateId: Vault.Credential.Template.Id,
        instanceId: Vault.Credential.Instance.Id | null
    ) => void
    validate: (
        document: Document,
        nodeId: Workflow.Node.Id,
        templateId: Vault.Credential.Template.Id
    ) => boolean
}
