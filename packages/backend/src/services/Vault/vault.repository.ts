import { Injectable } from '@nestjs/common';
import { Vault } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '../../decorators/database';

class CredentialInstanceMethods extends Repository {

    @Transactional('user')
    @ZodReturn(Vault.Credential.Instance.Schema.array())
    public async list(principal: Principal.User): Promise<Vault.Credential.Instance[]> {
        const rows = await this.trx
            .selectFrom('credential_instance')
            .selectAll()
            .orderBy('created_at', 'desc')
            .execute();

        return rows.map(DB.CredentialInstance.toDomain);
    }

    @Transactional('user')
    @ZodReturn(Vault.Credential.Instance.Schema)
    public async create(
        principal: Principal.User,
        insert: Vault.Database.Insert.CredentialInstance,
    ): Promise<Vault.Credential.Instance> {
        const row = await this.trx
            .insertInto('credential_instance')
            .values({
                created_by: principal.userId,
                name: insert.name,
                template_id: insert.templateId,
                blob: insert.blob,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.CredentialInstance.toDomain(row);
    }

    @Transactional('user')
    public async remove(
        principal: Principal.User,
        id: Vault.Credential.Instance.Id,
    ): Promise<void> {
        await this.trx
            .deleteFrom('credential_instance')
            .where('id', '=', id)
            .execute();
    }

    @Transactional('user')
    public async fetchBlob(
        principal: Principal.User,
        id: Vault.Credential.Instance.Id,
    ): Promise<Vault.Credential.Instance.EncryptedBlob> {
        const row = await this.trx
            .selectFrom('credential_instance')
            .select('blob')
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        return row.blob;
    }

    @Transactional('user', 'delegate')
    @ZodReturn(Vault.Credential.Instance.Schema)
    public async getById(
        principal: Principal.User | Principal.Delegate,
        id: Vault.Credential.Instance.Id,
    ): Promise<Vault.Credential.Instance> {
        const row = await this.trx
            .selectFrom('credential_instance')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        return DB.CredentialInstance.toDomain(row);
    }

    @Transactional('user', 'service')
    @ZodReturn(Vault.Credential.Instance.Schema.array())
    public async listByIds(
        principal: Principal.User | Principal.Service,
        ids: Vault.Credential.Instance.Id[],
    ): Promise<Vault.Credential.Instance[]> {
        if (!ids.length)
            return [];

        const rows = await this.trx
            .selectFrom('credential_instance')
            .selectAll()
            .where('id', 'in', ids)
            .execute();

        return rows.map(DB.CredentialInstance.toDomain);
    }

    @Transactional('user')
    @ZodReturn(Vault.Credential.Instance.Schema)
    public async updateName(
        principal: Principal.User,
        req: Vault.API.CredentialInstance.UpdateName.Request,
    ): Promise<Vault.Credential.Instance> {
        const row = await this.trx
            .updateTable('credential_instance')
            .set({ name: req.name })
            .where('id', '=', req.id)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.CredentialInstance.toDomain(row);
    }

    // A running execution writes refreshed tokens back; the name stays as it is.
    @Transactional('user', 'delegate')
    public async updateBlob(
        principal: Principal.User | Principal.Delegate,
        id: Vault.Credential.Instance.Id,
        blob: Vault.Credential.Instance.EncryptedBlob,
    ): Promise<void> {
        await this.trx
            .updateTable('credential_instance')
            .set({ blob })
            .where('id', '=', id)
            .execute();
    }

    @Transactional('user')
    @ZodReturn(Vault.Credential.Instance.Schema)
    public async update(
        principal: Principal.User,
        id: Vault.Credential.Instance.Id,
        name: string,
        blob: Vault.Credential.Instance.EncryptedBlob,
    ): Promise<Vault.Credential.Instance> {
        const row = await this.trx
            .updateTable('credential_instance')
            .set({ name, blob })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.CredentialInstance.toDomain(row);
    }
}

@Injectable()
export class VaultRepository {
    public readonly credentialInstance = new CredentialInstanceMethods();
}
