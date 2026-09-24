import { z, type ZodType } from 'zod';
import { Vault } from './Vault';
import type { AxiosInstance } from 'axios';
import { Consultation as ConsultationModule } from './Consultation';
import { ExecutionId } from './Execution/ids';
import { ConnectionDefinitionId, ConnectionId, NodeId, WorkflowId } from './ids';
import { Field } from './Foundations/Field';
// Type-only: a runtime import would close a cycle back through Workflow.
import type { Chat } from './Chat';
// Type-only: the igniter hook contributes a few of its properties.
import type { Execution as ExecutionMod } from './Execution';
import { Realtime } from './Realtime';
import { Derivable } from './Foundations/Derivable';
// Imported directly: the Library index would close an import cycle back through Blueprint.
import { Folder as FolderD } from './Library/folder';

export namespace Gateway {
    // Declared in code by defineConnection, paired with a GatewaySocket.
    export namespace Definition {
        export const Id = ConnectionDefinitionId;
        export type Id = ConnectionDefinitionId;

        // Fields, credentials and branches come from Derivable; field values pick the credential.
        export const Schema = Derivable.Schema.extend({
            id:          Id,
            // The service behind the socket, e.g. "discord". Named once here rather than on every event.
            provider:    z.string(),
            displayName: z.string(),
            description: z.string().optional(),
            icon:        z.string(),
        });

        export const derive = Derivable.derive

        // The credential template the given field values call for, or null when they call for none.
        export const getCredentialTemplate = (
            definition:  Gateway.Definition,
            fieldValues: Record<Field.Id, Field.Value>,
        ): Vault.Credential.Template | null => {
            const { derived } = Derivable.derive(definition, fieldValues);
            const templates   = derived.credentials ?? [];

            if (templates.length > 1)
                throw new Error(`${definition.id} derives ${templates.length} credentials; a connection takes at most one`);

            return templates[0] ?? null;
        };
    }
    export type Definition = z.infer<typeof Definition.Schema>;




    // What a user creates in the library; one row, one socket.
    export namespace Connection {
        export const Id = ConnectionId;
        export type Id = ConnectionId;

        // pending until its socket reports; active once connected; inactive when turned off.
        export const Status = z.enum(['pending', 'active', 'inactive', 'failed']);
        export type Status = z.infer<typeof Status>;

        export const Schema = z.object({
            id:           Id,
            folderId:     FolderD.Id,
            definitionId: Definition.Id,
            name:         z.string(),
            // Hydrated from credential_id; the row stores only the reference. Null when the definition takes none.
            credential:   Vault.Credential.Instance.Schema.nullable(),
            fieldValues:  z.record(Field.Id, Field.Value),
            status:       Status,
            // Why it failed; null unless status is failed.
            error:        z.string().nullable(),
            createdAt:    z.string(),
            updatedAt:    z.string(),
        });
    }
    export type Connection = z.infer<typeof Connection.Schema>;

    export namespace API {
        export namespace Definition {
            export namespace List {
                export type Response = Gateway.Definition[];
            }

            export async function list(api: AxiosInstance): Promise<List.Response> {
                const { data } = await api.get<List.Response>('/api/gateway/definitions');
                return data;
            }
        }

        export namespace Connection {
            export namespace Create {
                export const Request = z.object({
                    folder_id:     FolderD.Id,
                    definition_id: Gateway.Definition.Id,
                    name:          z.string().min(1).max(128),
                    credential_id: Vault.Credential.Instance.Id.optional(),
                    field_values:  z.record(Field.Id, Field.Value).optional(),
                });
                export type Request  = z.infer<typeof Request>;
                export type Response = Gateway.Connection;
            }

            export namespace List {
                export type Response = Gateway.Connection[];
            }

            export namespace Update {
                export const Request = z.object({
                    id:            Gateway.Connection.Id,
                    folder_id:     FolderD.Id.optional(),
                    name:          z.string().min(1).max(128).optional(),
                    // Null detaches the credential.
                    credential_id: Vault.Credential.Instance.Id.nullable().optional(),
                    field_values:  z.record(Field.Id, Field.Value).optional(),
                });
                export type Request  = z.infer<typeof Request>;
                export type Response = Gateway.Connection;
            }

            export namespace Remove {
                export type Response = { ok: true };
            }

            export namespace Connect {
                export type Response = Gateway.Connection;
            }

            export namespace Disconnect {
                export type Response = Gateway.Connection;
            }

            export namespace Reconnect {
                export type Response = Gateway.Connection;
            }

            export async function list(api: AxiosInstance): Promise<List.Response> {
                const { data } = await api.get<List.Response>('/api/gateway/connections');
                return data;
            }

            export async function create(api: AxiosInstance, req: Create.Request): Promise<Create.Response> {
                const { data } = await api.post<Create.Response>('/api/gateway/connections', req);
                return data;
            }

            export async function update(api: AxiosInstance, req: Update.Request): Promise<Update.Response> {
                const { id, ...body } = req;
                const { data } = await api.patch<Update.Response>(`/api/gateway/connections/${id}`, body);
                return data;
            }

            export async function remove(api: AxiosInstance, id: Gateway.Connection.Id): Promise<Remove.Response> {
                const { data } = await api.delete<Remove.Response>(`/api/gateway/connections/${id}`);
                return data;
            }

            export async function connect(api: AxiosInstance, id: Gateway.Connection.Id): Promise<Connect.Response> {
                const { data } = await api.post<Connect.Response>(`/api/gateway/connections/${id}/connect`);
                return data;
            }

            export async function disconnect(api: AxiosInstance, id: Gateway.Connection.Id): Promise<Disconnect.Response> {
                const { data } = await api.post<Disconnect.Response>(`/api/gateway/connections/${id}/disconnect`);
                return data;
            }

            export async function reconnect(api: AxiosInstance, id: Gateway.Connection.Id): Promise<Reconnect.Response> {
                const { data } = await api.post<Reconnect.Response>(`/api/gateway/connections/${id}/reconnect`);
                return data;
            }
        }
    }

    // A blueprint's declaration that one of its fields points at a connection it listens to.
    export namespace Listener {
        export const Schema = z.object({
            refFieldId: Field.Id,
        });

        // On the connection, not the socket, so it survives a reconnect.
        export type Fn = (event: Socket.Event) => void
    }
    export type Listener = z.infer<typeof Listener.Schema>;

    // What a socket delivers to the workflows listening on it.
    export namespace Socket {
        // Names the ongoing thing an event belongs to, the same way every time.
        export const ScopeFingerprint = z.string().brand('Gateway.Socket.ScopeFingerprint');
        export type ScopeFingerprint = z.infer<typeof ScopeFingerprint>;

        export const createScope = (provider: string, connectionId: Connection.Id, ...parts: string[]) =>
            [provider, connectionId, ...parts].join(':') as ScopeFingerprint;

        /**
         * What an event does when a run for the same fingerprint is already going.
         *
         * Recording is never gated, so a dropped event is still in the conversation when the next
         * run reads it.
         */
        export const IgnitionPolicy = z.enum(['every_event', 'drop_while_running']);
        export type IgnitionPolicy = z.infer<typeof IgnitionPolicy>;

        /**
         * What a node does with its connection's events, with the blueprint erased.
         *
         * The node-sdk states the same shape with this blueprint's field values in place of the
         * record, so a node author writes typed hooks and the backend calls untyped ones.
         */
        export interface Hooks {
            schema:    ZodType
            scope?:    (event: unknown, context: Context) => ScopeFingerprint | null
            filter:    (event: unknown, scope: ScopeFingerprint, context: Context) => boolean
            recorder?: (event: unknown, scope: ScopeFingerprint, context: Context) => Promise<void>
            igniter?:  (
                event:   unknown,
                scope:   ScopeFingerprint,
                context: Context,
            ) => Promise<Pick<ExecutionMod.Igniter, 'record' | 'debug' | 'chat_id' | 'inputs'>>
        }

        // What a node's hooks are handed for one event.
        export interface Context {
            readonly fieldValues: Record<Field.Id, Field.Value>
            readonly connection:  Connection
            readonly definition:  Definition
            readonly chatAPI: {
                // Opens the chat on the first write.
                append(externalKey: Chat.ExternalKey, messages: Chat.Message[]): Promise<Chat.Id>
                findIdByExternalKey(externalKey: Chat.ExternalKey): Promise<Chat.Id | null>
            }
            readonly log: (message: string) => void
        }

        // Each connection extends this with its own events; a node's filters validate them.
        export const Event = z.looseObject({
            type: z.string(),
        });
        export type Event = z.infer<typeof Event>;
    }

    // Emitted by the backend whenever a connection changes.
    export namespace Event {
        export const Channel = Realtime.Channel.brand('Gateway.Event.Channel');
        export type Channel = z.infer<typeof Channel>;

        export const getChannel = () => 'gateway' as Channel;

        export const Base = Realtime.Event.Base.extend({
            channel: Channel,
        });
        export type Base = z.infer<typeof Base>;

        export namespace ConnectionUpserted {
            export const Schema = Base.extend({
                type:       z.literal('gateway:connection:upserted'),
                connection: Connection.Schema,
            });
        }
        export type ConnectionUpserted = z.infer<typeof ConnectionUpserted.Schema>;

        // A deleted connection has no row left to carry, only its id.
        export namespace ConnectionRemoved {
            export const Schema = Base.extend({
                type:         z.literal('gateway:connection:removed'),
                connectionId: Connection.Id,
            });
        }
        export type ConnectionRemoved = z.infer<typeof ConnectionRemoved.Schema>;

        export const Schema = z.discriminatedUnion('type', [
            ConnectionUpserted.Schema,
            ConnectionRemoved.Schema,
        ]);
    }
    export type Event = z.infer<typeof Event.Schema>;

    export namespace Test {
        export namespace Consultation {

            // Namespaced: ConsultationModule.Variant is an open registry shared with every
            // other consulting node, so a bare tag would be free to collide.
            export const Variant = ConsultationModule.variant('gateway:event');

            // Node → backend: park this run until the connection delivers a matching event.
            export const Request = ConsultationModule.Request.extend({
                variant:      z.literal(Variant),
                connectionId: Connection.Id,
            });
            export type Request = z.infer<typeof Request>;

            // Backend → node: the first event that passed the node's filter.
            export const Answer = ConsultationModule.Answer.extend({
                variant: z.literal(Variant),
                event:   Socket.Event,
            });
            export type Answer = z.infer<typeof Answer>;
        }

        export namespace API {
            export namespace Register {
                export const Body = z.object({
                    nodeId:         NodeId,
                    blueprintId:    z.string(),
                    // The node's own values, so the backend runs the same filter a published run would.
                    fieldValues:    z.record(Field.Id, Field.Value),
                    connectionId:   Connection.Id,
                    timeoutMs:      z.number(),
                    executionId:    ExecutionId,
                    consultationId: ConsultationModule.Id,
                });
                export type Body = z.infer<typeof Body>;

                export const Request = Body.extend({
                    workflowId: WorkflowId,
                });
                export type Request = z.infer<typeof Request>;

                export const Response = z.object({ ok: z.literal(true) });
                export type Response = z.infer<typeof Response>;
            }

            export async function register(
                api: AxiosInstance,
                req: Register.Request,
            ): Promise<Register.Response> {
                const { workflowId, ...body } = req;
                const { data } = await api.post<Register.Response>(
                    `/api/gateway-test/${workflowId}/register`,
                    body,
                );
                return data;
            }
        }
    }
}
