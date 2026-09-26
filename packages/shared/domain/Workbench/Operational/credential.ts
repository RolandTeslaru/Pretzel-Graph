import type { Vault } from "../../Vault"
import type { Workflow } from "../../Workflow"
import type { Summary } from "./summary"
import type { OperationalClient } from "."

export class CredentialOperations {

    constructor(private readonly client: OperationalClient) {}

    public async setInstance(
        nodeId:     Workflow.Node.Id,
        templateId: Vault.Credential.Template.Id,
        instanceId: Vault.Credential.Instance.Id | null,
    ): Promise<{ nodeId: Workflow.Node.Id, templateId: Vault.Credential.Template.Id, instanceId: Vault.Credential.Instance.Id | null, issues: Summary.NodeIssues }> {
        const d = this.client.getDocument()

        if (!d.data.nodes[nodeId])
            throw new Error(`Node ${nodeId} not found`)

        const slots = d.selectors.credential.getTemplates(d, nodeId)

        if (!slots.some(t => t.id === templateId))
            throw new Error(`Node ${nodeId} takes no ${templateId} credential template; it takes ${slots.map(t => t.id).join(", ") || "none"}`)

        if (instanceId) {
            const instance = await this.client.resolveCredential(instanceId)

            if (!instance)
                throw new Error(`Credential instance ${instanceId} not found`)

            if (instance.template_id !== templateId)
                throw new Error(`Credential instance ${instanceId} is of template ${instance.template_id}, not ${templateId}`)
        }

        d.reducers.credential.setInstance(d, nodeId, templateId, instanceId)
        this.client.report({ type: "credential:instanceSet", nodeId, templateId, instanceId })

        return { nodeId, templateId, instanceId, issues: d.issues.nodes[nodeId] ?? null }
    }
}
