import { Injectable } from '@nestjs/common';
import { Gateway, Vault } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '@/decorators/database';

@Injectable()
export class GatewayRepository extends Repository {

    @Transactional('user')
    @ZodReturn(Gateway.Connection.Schema)
    public async create(
        principal: Principal.User,
        payload: Gateway.API.Connection.Create.Request,
    ): Promise<Gateway.Connection> {
        const row = await this.trx
            .insertInto('connections')
            .values({
                folder_id:     payload.folder_id,
                definition_id: payload.definition_id,
                name:          payload.name,
                credential_id: payload.credential_id,
                field_values:  payload.field_values ?? {},
                created_by:    principal.userId,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        const [connection] = await this.withCredentials([row]);

        return connection;
    }

    @Transactional('user')
    @ZodReturn(Gateway.Connection.Schema.array())
    public async list(
        principal: Principal.User,
    ): Promise<Gateway.Connection[]> {
        const rows = await this.trx
            .selectFrom('connections')
            .selectAll()
            .orderBy('created_at')
            .execute();

        return this.withCredentials(rows);
    }

    @Transactional('service')
    @ZodReturn(Gateway.Connection.Schema.array())
    public async listAllEnabled(
        principal: Principal.Service,
    ): Promise<Gateway.Connection[]> {
        const rows = await this.trx
            .selectFrom('connections')
            .selectAll()
            .where('status', '!=', 'inactive')
            .execute();

        return this.withCredentials(rows);
    }

    @Transactional('user', 'service')
    @ZodReturn(Gateway.Connection.Schema)
    public async getById(
        principal: Principal.User | Principal.Service,
        id: Gateway.Connection.Id,
    ): Promise<Gateway.Connection> {
        const row = await this.trx
            .selectFrom('connections')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        const [connection] = await this.withCredentials([row]);

        return connection;
    }

    @Transactional('service')
    @ZodReturn(Gateway.Connection.Schema.nullable())
    public async findByCredentialId(
        principal: Principal.Service,
        credentialId: Vault.Credential.Instance.Id,
    ): Promise<Gateway.Connection | null> {
        const row = await this.trx
            .selectFrom('connections')
            .selectAll()
            .where('credential_id', '=', credentialId)
            .executeTakeFirst();

        if (!row)
            return null;

        const [connection] = await this.withCredentials([row]);

        return connection;
    }

    @Transactional('user')
    @ZodReturn(Gateway.Connection.Schema)
    public async update(
        principal: Principal.User,
        payload: Gateway.API.Connection.Update.Request,
    ): Promise<Gateway.Connection> {
        const row = await this.trx
            .updateTable('connections')
            .set({
                folder_id:     payload.folder_id,
                name:          payload.name,
                credential_id: payload.credential_id,
                field_values:  payload.field_values,
            })
            .where('id', '=', payload.id)
            .returningAll()
            .executeTakeFirstOrThrow();

        const [connection] = await this.withCredentials([row]);

        return connection;
    }

    @Transactional('user', 'service')
    @ZodReturn(Gateway.Connection.Schema)
    public async setStatus(
        principal: Principal.User | Principal.Service,
        id: Gateway.Connection.Id,
        status: Gateway.Connection.Status,
        error: string | null,
    ): Promise<Gateway.Connection> {
        const row = await this.trx
            .updateTable('connections')
            .set({ status, error })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirstOrThrow();

        const [connection] = await this.withCredentials([row]);

        return connection;
    }

    // One credential query for any number of rows, rather than one per connection.
    private async withCredentials(rows: DB.Connection.Row[]): Promise<Gateway.Connection[]> {
        const credentialIds = rows.flatMap(row => row.credential_id ? [row.credential_id] : []);

        const credentials = credentialIds.length
            ? await this.trx
                .selectFrom('credential_instance')
                .selectAll()
                .where('id', 'in', credentialIds)
                .execute()
            : [];

        const byId = new Map(credentials.map(row => [row.id, DB.CredentialInstance.toDomain(row)]));

        return rows.map(row => {
            if (!row.credential_id)
                return DB.Connection.toDomain(row, null);

            const credential = byId.get(row.credential_id);

            if (!credential)
                throw new Error(`Connection ${row.id} references a missing credential`);

            return DB.Connection.toDomain(row, credential);
        });
    }
}
