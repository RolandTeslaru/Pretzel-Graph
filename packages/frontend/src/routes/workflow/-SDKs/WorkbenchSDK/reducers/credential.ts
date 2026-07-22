import { Validation, Vault, type Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";

export const credentialReducers = {
    setInstance: (s, nodeId, templateId, instanceId) => {
        s.isDirty = true;
        if (!s.data.credentialInstanceIds[nodeId])
            s.data.credentialInstanceIds[nodeId] = {};
        if (instanceId === null) {
            delete s.data.credentialInstanceIds[nodeId][templateId];
        } else {
            s.data.credentialInstanceIds[nodeId][templateId] = instanceId;
        }

        s.reducers.credential.validate(s, nodeId, templateId);
    },
    validate: (s, nodeId, templateId) => {
        const template = s.selectors.credential.getTemplate(s, nodeId, templateId);
        if (!template) return false;

        const issue = Validation.Issue.Credential.check(template.id, nodeId, s.data);
        if (issue) {
            s.issues.nodes[nodeId] ??= { fields: {}, inputs: {}, credentials: {} };
            s.issues.nodes[nodeId].credentials[templateId] = issue;
            return true;
        }

        delete s.issues.nodes[nodeId]?.credentials?.[templateId];
        return false;
    },
} satisfies CredentialReducers

type CredentialReducers = {
    setInstance: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        templateId: Vault.Credential.Template.Id,
        instanceId: Vault.Credential.Instance.Id | null
    ) => void
    validate: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        templateId: Vault.Credential.Template.Id
    ) => boolean
}
