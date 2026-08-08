import { Injectable } from '@nestjs/common';
import { Auth, Vault } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { ZodReturn } from '../../decorators/database';
import { AllowedDatabaseRoles, DatabaseClass } from '../../decorators/database-roles';

@DatabaseClass
class CredentialInstanceMethods {

    @AllowedDatabaseRoles("user")
    @ZodReturn(Vault.Credential.Instance.Schema.array())
    async list(trx: DB.UserTransaction): Promise<Vault.Credential.Instance[]> {
        const rows = await trx
            .selectFrom('credential_instance')
            .selectAll()
            .orderBy('created_at', 'desc')
            .execute();

        return rows.map(DB.CredentialInstance.toDomain);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Vault.Credential.Instance.Schema)
    async create(
        trx: DB.UserTransaction,
        userId: Auth.User.Id,
        insert: Vault.Database.Insert.CredentialInstance,
    ): Promise<Vault.Credential.Instance> {
        const row = await trx
            .insertInto('credential_instance')
            .values({
                user_id: userId,
                name: insert.name,
                template_id: insert.templateId,
                blob: insert.blob,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.CredentialInstance.toDomain(row);
    }

    @AllowedDatabaseRoles("user")
    async remove(
        trx: DB.UserTransaction,
        id: Vault.Credential.Instance.Id,
    ): Promise<void> {
        await trx
            .deleteFrom('credential_instance')
            .where('id', '=', id)
            .execute();
    }

    @AllowedDatabaseRoles("user")
    async fetchBlob(
        trx: DB.UserTransaction,
        id: Vault.Credential.Instance.Id,
    ): Promise<Vault.Credential.Instance.EncryptedBlob> {
        const row = await trx
            .selectFrom('credential_instance')
            .select('blob')
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        return row.blob;
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Vault.Credential.Instance.Schema.array())
    async listByIds(
        trx: DB.UserTransaction,
        ids: Vault.Credential.Instance.Id[],
    ): Promise<Vault.Credential.Instance[]> {
        if (!ids.length)
            return [];

        const rows = await trx
            .selectFrom('credential_instance')
            .selectAll()
            .where('id', 'in', ids)
            .execute();

        return rows.map(DB.CredentialInstance.toDomain);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Vault.Credential.Instance.Schema)
    async updateName(
        trx: DB.UserTransaction,
        req: Vault.API.CredentialInstance.UpdateName.Request,
    ): Promise<Vault.Credential.Instance> {
        const row = await trx
            .updateTable('credential_instance')
            .set({ name: req.name })
            .where('id', '=', req.id)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.CredentialInstance.toDomain(row);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Vault.Credential.Instance.Schema)
    async update(
        trx: DB.UserTransaction,
        id: Vault.Credential.Instance.Id,
        name: string,
        blob: Vault.Credential.Instance.EncryptedBlob,
    ): Promise<Vault.Credential.Instance> {
        const row = await trx
            .updateTable('credential_instance')
            .set({ name, blob })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.CredentialInstance.toDomain(row);
    }
}

@Injectable()
@DatabaseClass
export class VaultDatabase {
    public readonly credentialInstance = new CredentialInstanceMethods();
}
