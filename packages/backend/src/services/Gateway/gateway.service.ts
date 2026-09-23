import {
    BadRequestException,
    Injectable,
    NotFoundException,
    OnApplicationBootstrap,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { GatewaySocket, SocketContext } from '@pretzel-graph/node-sdk';
import { Gateway, Vault } from '@pretzel-graph/shared/domain';
import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import { Encryption } from '@pretzel-graph/shared/server/vault/encryption';
import { System } from '@pretzel-graph/shared/system';
import { Principal } from '@/domain/Principal';
import { GatewayRepository } from './gateway.repository';
import { RealtimeService } from '../Realtime/realtime.service';
import { VaultRepository } from '../Vault/vault.repository';

const NODES_ROOT = process.env.NODES_ROOT ?? path.resolve(__dirname, '../../../../nodes/src');

type SocketConstructor = new (ctx: SocketContext) => GatewaySocket<Gateway.Definition>;

// Read once and held for the process; definitions change only with a backend restart.
let definitions: Record<Gateway.Definition.Id, Gateway.Definition> | null = null;

function getDefinitions(): Record<Gateway.Definition.Id, Gateway.Definition> {
    definitions ??= JSON.parse(
        fs.readFileSync(path.join(__dirname, '../../../assets/gateway_definitions_index.json'), 'utf-8'),
    ).definitions ?? {};

    return definitions!;
}

@Injectable()
export class GatewayService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {

    private readonly log = System.log.withContext("Gateway");

    // Socket constructors by definition, loaded once at boot so instantiating stays synchronous.
    private readonly socketConstructors = new Map<Gateway.Definition.Id, SocketConstructor>();

    // The live socket per connection; built on connect, dropped on disconnect.
    private readonly sockets = new Map<Gateway.Connection.Id, GatewaySocket<Gateway.Definition>>();

    // Listeners per connection; they outlive any one socket.
    private readonly listeners = new Map<Gateway.Connection.Id, Set<Gateway.Listener.Fn>>();

    constructor(
        private readonly repository: GatewayRepository,
        private readonly realtime:   RealtimeService,
        private readonly vault:      VaultRepository,
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
        create: async (
            principal: Principal.User,
            req: Gateway.API.Connection.Create.Request,
        ): Promise<Gateway.API.Connection.Create.Response> => {
            const definition = this.definition.get(req.definition_id);
            const template   = Gateway.Definition.getCredentialTemplate(definition, req.field_values ?? {});

            await this.checkCredential(principal, definition, template, req.credential_id ?? null);

            if (!this.socketConstructors.has(req.definition_id))
                throw new BadRequestException(`No socket is loaded for ${req.definition_id}`);

            const connection = await this.repository.create(principal, req);

            this.emitUpserted(connection);

            void this.open(connection);

            return connection;
        },

        list: (
            principal: Principal.User,
        ): Promise<Gateway.API.Connection.List.Response> =>
            this.repository.list(principal),

        update: async (
            principal: Principal.User,
            req: Gateway.API.Connection.Update.Request,
        ): Promise<Gateway.API.Connection.Update.Response> => {
            const existing = await this.repository.getById(principal, req.id);

            const hasChanges = req.folder_id !== undefined
                || req.name !== undefined
                || req.credential_id !== undefined
                || req.field_values !== undefined;

            if (!hasChanges)
                return existing;

            const definition = this.definition.get(existing.definitionId);
            const template   = Gateway.Definition.getCredentialTemplate(definition, req.field_values ?? existing.fieldValues);

            let credentialId = req.credential_id;

            if (credentialId !== undefined)
                await this.checkCredential(principal, definition, template, credentialId);

            // The field values now call for a different credential, or none; the old one is detached.
            else if (existing.credential && existing.credential.template_id !== template?.id)
                credentialId = null;

            const connection = await this.repository.update(principal, { ...req, credential_id: credentialId });

            const credentialChanged = existing.credential?.id !== connection.credential?.id;
            const fieldsChanged     = Field.getChangedIds(existing.fieldValues, connection.fieldValues).length > 0;

            this.emitUpserted(connection);

            if ((credentialChanged || fieldsChanged) && connection.status !== 'inactive')
                return this.socket.reconnect(principal, connection.id);

            return connection;
        },

        // Closes the socket, forgets its listeners, then deletes the row.
        delete: async (
            principal: Principal.User,
            id: Gateway.Connection.Id,
        ): Promise<Gateway.API.Connection.Remove.Response> => {
            const socket = this.sockets.get(id);
            const name   = socket?.connection.name ?? id;

            this.sockets.delete(id);
            this.listeners.delete(id);

            await socket?.disconnect();

            await this.repository.delete(principal, id);

            this.log.info(`Deleted ${name} (${id})`);

            this.realtime.emitEvent<Gateway.Event.ConnectionRemoved>({
                channel:      Gateway.Event.getChannel(),
                type:         'gateway:connection:removed',
                connectionId: id,
            });

            return { ok: true };
        },

        // Hears every event the connection's socket delivers, across reconnects; returns its own removal.
        // The provider behind an open socket, for callers with no principal to read the row with.
        getProvider: (id: Gateway.Connection.Id): string | null => {
            const connection = this.sockets.get(id)?.connection;

            return connection ? this.definition.get(connection.definitionId).provider : null;
        },

        subscribe: (id: Gateway.Connection.Id, listener: Gateway.Listener.Fn): () => void => {
            if (!this.listeners.has(id))
                this.listeners.set(id, new Set());

            this.listeners.get(id)!.add(listener);

            return () => {
                const listeners = this.listeners.get(id);

                if (!listeners)
                    return;

                listeners.delete(listener);

                if (listeners.size === 0)
                    this.listeners.delete(id);
            };
        },
    };

    public readonly socket = {
        // Turns the connection on: marks it pending and opens its socket; already on is a no-op.
        connect: async (
            principal: Principal.User | Principal.Service,
            id: Gateway.Connection.Id,
        ): Promise<Gateway.Connection> => {
            const connection = await this.repository.getById(principal, id);

            if (connection.status === 'pending' || connection.status === 'active')
                return connection;

            const pending = await this.writeStatus(principal, id, 'pending', null);

            this.log.info(`Connecting ${pending.name} (${id})`);

            void this.open(pending);

            return pending;
        },

        disconnect: async (
            principal: Principal.User | Principal.Service,
            id: Gateway.Connection.Id,
        ): Promise<Gateway.Connection> => {
            const socket = this.sockets.get(id);

            this.sockets.delete(id);

            await socket?.disconnect();

            const connection = await this.writeStatus(principal, id, 'inactive', null);

            this.log.info(`Disconnected ${connection.name} (${id})`);

            return connection;
        },

        // Replaces the socket with one built from the current row; a turned-off connection is refused.
        reconnect: async (
            principal: Principal.User | Principal.Service,
            id: Gateway.Connection.Id,
        ): Promise<Gateway.Connection> => {
            const connection = await this.repository.getById(principal, id);

            if (connection.status === 'inactive')
                throw new BadRequestException('The connection is turned off; connect it instead');

            const socket = this.sockets.get(id);

            this.sockets.delete(id);

            await socket?.disconnect();

            this.log.info(`Reconnecting ${connection.name} (${id})`);

            const pending = await this.writeStatus(principal, id, 'pending', null);

            void this.open(pending);

            return pending;
        },
    };




    // Builds a socket from the row, connects it and records how it went; never rejects, so callers can void it.
    private async open(connection: Gateway.Connection): Promise<void> {
        let socket: GatewaySocket<Gateway.Definition> | undefined;

        try {
            const template = Gateway.Definition.getCredentialTemplate(this.definition.get(connection.definitionId), connection.fieldValues);

            if (template && !connection.credential)
                throw new Error(`Needs a ${template.displayName} credential`);

            socket = this.instantiate(connection);

            await socket.connect();

            // Replaced or disconnected while connecting; the newer state owns the status.
            if (this.sockets.get(connection.id) !== socket)
                return;

            this.log.info(`Connected ${connection.name} (${connection.id})`);

            await this.writeStatus(Principal.SELF, connection.id, 'active', null);
        }
        catch (error) {
            if (socket && this.sockets.get(connection.id) !== socket)
                return;

            // A socket that never connected is not live; drop it so the map only holds live ones.
            if (socket) {
                this.sockets.delete(connection.id);

                socket.disconnect().catch(disconnectError =>
                    this.log.error(`Connection ${connection.id} failed to disconnect: ${(disconnectError as Error).message}`),
                );
            }

            const message = (error as Error).message;

            this.log.error(`Connection ${connection.id} failed to connect: ${message}`);

            await this.writeStatus(Principal.SELF, connection.id, 'failed', message).catch(writeError =>
                this.log.error(`Failed to record status for connection ${connection.id}: ${(writeError as Error).message}`),
            );
        }
    }




    // Rejects a credential that does not match what the field values call for.
    private async checkCredential(
        principal:    Principal.User,
        definition:   Gateway.Definition,
        template:     Vault.Credential.Template | null,
        credentialId: Vault.Credential.Instance.Id | null,
    ): Promise<void> {
        if (!template) {
            if (credentialId)
                throw new BadRequestException(`${definition.displayName} takes no credential here`);

            return;
        }

        if (!credentialId)
            throw new BadRequestException(`${definition.displayName} needs a ${template.displayName} credential`);

        const instance = await this.vault.credentialInstance.getById(principal, credentialId).catch(() => null);

        if (!instance)
            throw new NotFoundException('Credential not found');

        if (instance.template_id !== template.id)
            throw new BadRequestException(`${definition.displayName} needs a ${template.displayName} credential`);
    }




    // Constructs the socket for a connection and holds it; does not connect.
    private instantiate(connection: Gateway.Connection): GatewaySocket<Gateway.Definition> {
        const Socket = this.socketConstructors.get(connection.definitionId);

        if (!Socket)
            throw new Error(`No socket is loaded for ${connection.definitionId}`);

        let socket: GatewaySocket<Gateway.Definition>;

        const ctx: SocketContext = {
            connection,
            log: System.log.withContext(`Gateway:Socket:${connection.definitionId}`),
            dispatch: (event) => this.dispatch(connection.id, event),
            fail:     (error) => this.fail(connection.id, socket, error),
            credentialsAPI: {
                getInstance:       (id) => connection.credential && id === connection.credential.id ? connection.credential : undefined,
                getDecryptedValue: (blob) => Encryption.decryptBlob(blob) as any,
                getAccessToken:    () => Promise.reject(new Error('OAuth credentials are not supported on connections')),
            },
        };

        socket = new Socket(ctx);

        this.sockets.set(connection.id, socket);

        return socket;
    }




    // A socket that gave up is dropped and its connection recorded as failed, unless it was already replaced.
    private fail(id: Gateway.Connection.Id, socket: GatewaySocket<Gateway.Definition>, error: Error): void {
        if (this.sockets.get(id) !== socket)
            return;

        this.sockets.delete(id);

        this.log.error(`Connection ${id} failed: ${error.message}`);

        socket.disconnect().catch(disconnectError =>
            this.log.error(`Connection ${id} failed to disconnect: ${(disconnectError as Error).message}`),
        );

        this.writeStatus(Principal.SELF, id, 'failed', error.message).catch(writeError =>
            this.log.error(`Failed to record status for connection ${id}: ${(writeError as Error).message}`),
        );
    }




    private dispatch(id: Gateway.Connection.Id, event: Gateway.Socket.Event): void {
        const listeners = this.listeners.get(id);

        this.log.info('socket event', { connectionId: id, type: event.type, listeners: listeners?.size ?? 0 });

        for (const listener of listeners ?? []) {
            try {
                listener(event);
            }
            catch (error) {
                this.log.error(`Listener on connection ${id} failed: ${(error as Error).message}`);
            }
        }
    }




    private async writeStatus(
        principal: Principal.User | Principal.Service,
        id: Gateway.Connection.Id,
        status: Gateway.Connection.Status,
        error: string | null,
    ): Promise<Gateway.Connection> {
        const connection = await this.repository.setStatus(principal, id, status, error);

        this.emitUpserted(connection);

        return connection;
    }




    private emitUpserted(connection: Gateway.Connection): void {
        this.realtime.emitEvent<Gateway.Event.ConnectionUpserted>({
            channel: Gateway.Event.getChannel(),
            type:    'gateway:connection:upserted',
            connection,
        });
    }




    private async loadSocketConstructors(): Promise<void> {
        for (const id of Object.keys(getDefinitions()) as Gateway.Definition.Id[]) {
            const modulePath = `${NODES_ROOT}/${id.replace(/\./g, '/')}/socket`;

            try {
                const module = await import(modulePath);

                if (!module.Socket)
                    throw new Error(`${modulePath} does not export a 'Socket' class`);

                this.socketConstructors.set(id, module.Socket as SocketConstructor);
            }
            catch (error) {
                this.log.error(`Failed to load socket for ${id}: ${(error as Error).message}`);
            }
        }
    }




    // Opens every connection that was not turned off, without waiting on any of them.
    private async connectEnabled(): Promise<void> {
        const connections = await this.repository.listAllEnabled(Principal.SELF);

        for (const connection of connections)
            void this.open(connection);

        this.log.info(`Connecting ${connections.length} connections`);
    }




    private async handleSignal(signal: Vault.Credential.Signal): Promise<void> {
        switch (signal.type) {
            case 'blob-changed': {
                const connection = await this.repository.findByCredentialId(Principal.SELF, signal.credentialId);

                if (!connection)
                    break;

                this.emitUpserted(connection);

                if (connection.status !== 'inactive')
                    await this.socket.reconnect(Principal.SELF, connection.id);

                break;
            }

            default:
                signal.type satisfies never;
        }
    }




    public async onModuleInit(): Promise<void> {
        this.realtime.psubscribe(
            Vault.Credential.Signal.PATTERN_CHANNEL, 
            Vault.Credential.Signal.Schema, 
            signal =>
                this.handleSignal(signal).catch(error =>
                    this.log.error(`Failed to handle signal for credential ${signal.credentialId}: ${(error as Error).message}`),
                ),
        );

        await this.loadSocketConstructors();
    }

    public async onApplicationBootstrap(): Promise<void> {
        await this.connectEnabled().catch(error =>
            this.log.error(`Failed to connect connections on boot: ${(error as Error).message}`),
        );
    }

    public async onModuleDestroy(): Promise<void> {
        // Closes without writing inactive, so the next boot reconnects them.
        await Promise.allSettled([...this.sockets.values()].map(socket => socket.disconnect()));
    }
}
