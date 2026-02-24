import { SupabaseClient } from "@supabase/supabase-js";
import { Vault, Workflow } from "@vx-agent-editor/shared/domain";


export class SecretsResolver {
    public static async resolveWorkflow(supabase: SupabaseClient, workflow: Workflow) {
        const resolvedSecrets: Record<Vault.Credential.Id, Vault.Secret> = {};

        for (const [_, node] of Object.entries(workflow.data.nodes)) {
            
            const staticValues = workflow.data.staticValues[node.id];

            for (const [_, field] of Object.entries(node.fields)) {
                if(field.variant !== "Secret")
                    continue;

                const credentialId = staticValues[field.id] as Vault.Credential.Id;

                if(!credentialId)
                    throw new Error(`Field '${field.id}' on node '${node.id}' does not have a credential assigned to it.`);

                if (credentialId in resolvedSecrets) {
                    staticValues[field.id] = resolvedSecrets[credentialId];
                    continue;
                }

                const { value: secret } = await Vault.API.Credential.reveal(supabase, { id: credentialId })

                if (!secret)
                    throw new Error(`Failed to resolve secret for credentialId ${credentialId}`)

                resolvedSecrets[credentialId] = secret;
                staticValues[field.id] = secret;
            }
        }
    }
}