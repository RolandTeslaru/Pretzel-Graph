import { tool } from "@langchain/core/tools";
import { ToolBudget, type HTTP } from "@pretzel-graph/node-sdk";
import { Vault } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";


export function buildTools(api: HTTP.Client) {

    const listCredentials = tool(
        async ({ templateIds }) => {
            const { instances } = await Vault.API.Internal.query(api.raw, { templateIds: templateIds as Vault.Credential.Template.Id[] | undefined });

            return ToolBudget.list("instances", instances.map(instance => ({
                instanceId:   instance.id,
                name:         instance.name,
                templateId:   instance.template_id,
                templateName: instance.template_name,
                updatedAt:    instance.updated_at,
            })));
        },
        {
            name:        "vault_list_credential_instances",
            description: "List the credential instances saved in this workspace: each one's instanceId, name, templateId, templateName and when it last changed. A credential template is a type of credential a node can take, e.g. tavilyApi; a credential instance is one saved in the vault, made from one template. Secret values are never returned. Attach an instance to a node with workbench_set_credential_instance; workbench_get_node shows which templates a node takes. Read-only.",
            schema: z.object({
                templateIds: z.array(z.string()).optional().describe("Only instances of these credential templates, e.g. postgres. Omit to list every instance."),
            }),
        },
    );


    return [listCredentials];
}
