import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Gateway, Vault } from '@pretzel-graph/shared/domain';
import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import { System } from '@pretzel-graph/shared/system';
import { Principal } from '@/domain/Principal';
import { GatewayRepository } from './gateway.repository';
import { RealtimeService } from '../Realtime/realtime.service';

// Read once and held for the process; definitions change only with a backend restart.
let definitions: Record<Gateway.Definition.Id, Gateway.Definition> | null = null;

function getDefinitions(): Record<Gateway.Definition.Id, Gateway.Definition> {
    definitions ??= JSON.parse(
        fs.readFileSync(path.join(__dirname, '../../../assets/gateway_definitions_index.json'), 'utf-8'),
    ).definitions ?? {};

    return definitions!;
}

@Injectable()
export class GatewayService implements OnModuleInit {

    private readonly log = System.log.withContext("Gateway");

    constructor(
        private readonly repository: GatewayRepository,
        private readonly realtime:   RealtimeService,
    ) {}

    public readonly definition = {
        list: (): Gateway.API.Definition.List.Response =>
            Object.values(getDefinitions()),

        get: (id: Gateway.Definition.Id): Gateway.Definition => {
            const definition = getDefinitions()[id];

            if (!definition)
                throw new NotFoundException(`Gateway definition not found: ${id}`);

            return definition;
        },
    };

    public readonly connection = {
        create: (
            principal: Principal.User,
            req: Gateway.API.Connection.Create.Request,
        ): Promise<Gateway.API.Connection.Create.Response> =>
            this.repository.create(principal, req),

        list: (
            principal: Principal.User,
        ): Promise<Gateway.API.Connection.List.Response> =>
            this.repository.list(principal),

        update: async (
            principal: Principal.User,
            req: Gateway.API.Connection.Update.Request,
        ): Promise<Gateway.API.Connection.Update.Response> => {
            const existing   = await this.repository.getById(principal, req.id);
            const connection = await this.repository.update(principal, req);

            const credentialChanged = existing.credential.id !== connection.credential.id;
            const fieldsChanged     = Field.getChangedIds(existing.fieldValues, connection.fieldValues).length > 0;

            if (credentialChanged || fieldsChanged)
                return this.connection.invalidate(principal, connection);

            return connection;
        },

        // Marks the connection for a reconnect with its current settings; an inactive one stays off.
        invalidate: async (
            principal: Principal.User | Principal.Service,
            connection: Gateway.Connection,
        ): Promise<Gateway.Connection> => {
            if (connection.status === 'inactive')
                return connection;

            return this.repository.setStatus(principal, connection.id, 'pending', null);
        },
    };









    private async handleSignal(signal: Vault.Credential.Signal): Promise<void> {
        switch (signal.type) {
            case 'blob-changed': {
                const connection = await this.repository.findByCredentialId(Principal.SELF, signal.credentialId);

                if (connection)
                    await this.connection.invalidate(Principal.SELF, connection);

                break;
            }

            default:
                signal.type satisfies never;
        }
    }




    public onModuleInit(): void {
        this.realtime.psubscribe(
            Vault.Credential.Signal.PATTERN_CHANNEL, 
            Vault.Credential.Signal.Schema, 
            signal =>
                this.handleSignal(signal).catch(error =>
                    this.log.error(`Failed to handle signal for credential ${signal.credentialId}: ${(error as Error).message}`),
                ),
        );
    }
}
