import { SupabaseClient } from "@supabase/supabase-js";
import { Vault, Workflow } from "@pretzel-graph/shared/domain";
import { resolveCredential } from "@/utils/resolveCredential";

export class SecretsResolver {
    public static async resolveWorkflow(
        supabase: SupabaseClient,
        workflowData: Workflow.Data,
        _workflowId?: Workflow.Id,
    ) {
        const cache: Record<string, Vault.Credential.Instance> = {};

        for (const nodeId of Object.keys(workflowData.nodes) as Workflow.Node.Id[]) {
            const instanceIds = workflowData.credentialInstanceIds[nodeId];
            if (!instanceIds) continue;

            for (const instanceId of Object.values(instanceIds) as Vault.Credential.Instance.Id[]) {
                if (!(instanceId in cache))
                    cache[instanceId] = await resolveCredential(supabase, instanceId);
            }
        }
    }
}
