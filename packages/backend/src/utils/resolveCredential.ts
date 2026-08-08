import { Vault } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';

export async function resolveCredential(
    trx: DB.Transaction<'user' | 'service'>,
    instanceId: Vault.Credential.Instance.Id,
): Promise<Vault.Credential.Instance> {
    const row = await trx
        .selectFrom('credential_instance')
        .selectAll()
        .where('id', '=', instanceId)
        .executeTakeFirstOrThrow();
    return DB.CredentialInstance.toDomain(row);
}
