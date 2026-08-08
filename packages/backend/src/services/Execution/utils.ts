import { Vault, Workflow } from "@pretzel-graph/shared/domain";
import { resolveCredential } from "@/utils/resolveCredential";
import { DB } from '@/db';

export class SecretsResolver {
    public static async resolveWorkflow(
        trx: DB.Transaction<'user' | 'service'>,
        workflowData: Workflow.Data,
        _workflowId?: Workflow.Id,
    ) {
        const cache: Record<string, Vault.Credential.Instance> = {};

        for (const nodeId of Object.keys(workflowData.nodes) as Workflow.Node.Id[]) {
            const instanceIds = workflowData.credentialInstanceIds[nodeId];
            if (!instanceIds) continue;

            for (const instanceId of Object.values(instanceIds) as Vault.Credential.Instance.Id[]) {
                if (!(instanceId in cache))
                    cache[instanceId] = await resolveCredential(trx, instanceId);
            }
        }
    }
}
