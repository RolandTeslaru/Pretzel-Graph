import { SupabaseClient } from "@supabase/supabase-js";
import { Vault, Workflow } from "@pretzel-graph/shared/domain";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";


export class SecretsResolver {
    public static async resolveWorkflow(supabase: SupabaseClient, workflowData: Workflow.Data) {
        const resolvedSecrets: Record<Vault.Credential.Id, Vault.Secret> = {};

        for (const [_, node] of Object.entries(workflowData.nodes)) {

            const staticValues = workflowData.staticValues[node.id];

            for (const [_, field] of Object.entries(node.fields)) {
                if (field.variant !== "Secret")
                    continue;

                const credentialId = staticValues[field.id] as Vault.Credential.Id;

                if (!credentialId)
                    throw new SystemError(
                        SystemError.Code.CONFIG_MISSING_CREDENTIAL,
                        `Node "${node.blueprintId}" is missing a credential for field "${field.id}"`,
                        { data: { nodeId: node.id, fieldId: field.id, blueprintId: node.blueprintId } }
                    );

                if (credentialId in resolvedSecrets) {
                    staticValues[field.id] = resolvedSecrets[credentialId];
                    continue;
                }

                const { value: secret } = await Vault.API.Credential.reveal(supabase, { id: credentialId })

                if (!secret)
                    throw new SystemError(
                        SystemError.Code.CONFIG_MISSING_CREDENTIAL,
                        `Failed to resolve secret for credential "${credentialId}"`,
                        { data: { nodeId: node.id, credentialId } }
                    );

                resolvedSecrets[credentialId] = secret;
                staticValues[field.id] = secret;
            }
        }
    }
}
