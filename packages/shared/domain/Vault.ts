import { z } from "zod"
import type { AxiosInstance } from "axios"
import { Auth as AuthDomain } from "./Auth";
import { Workspace } from "./Workspace";
import { Field } from "./Foundations/Field";

export namespace Vault {

    // A credential obtained through a browser consent step rather than typed in.
    export namespace OAuth {

        export const Provider = z.object({
            authUrl:         z.url(),
            tokenUrl:        z.url(),
            revokeUrl:       z.url().optional(),
            // Identity probe after the exchange; seeds the instance name.
            userInfoUrl:     z.url().optional(),
            scopes:          z.array(z.string()).readonly(),
            // Appended to the authorize URL as-is.
            extraAuthParams: z.record(z.string(), z.string()).optional(),
            scopeSeparator:  z.string().default(" "),
        })
        export type Provider = z.infer<typeof Provider>

        // What a credential template carries under `auth`.
        export const Auth = z.object({
            kind:     z.literal("oauth2"),
            provider: Provider,
        })
        export type Auth = z.infer<typeof Auth>

        // The form fields: the app registration at the provider.
        export const Client = z.object({
            clientId:     z.string(),
            clientSecret: z.string(),
        })
        export type Client = z.infer<typeof Client>

        // What a token endpoint yields, normalised.
        export const TokenSet = z.object({
            accessToken:  z.string(),
            refreshToken: z.string().optional(),
            // Epoch ms.
            expiresAt:    z.number(),
            scope:        z.string().optional(),
        })
        export type TokenSet = z.infer<typeof TokenSet>

        // The encrypted blob of a connected instance: the client plus what the callback added.
        export const Values = Client.extend({
            accessToken:  z.string(),
            refreshToken: z.string(),
            expiresAt:    z.number(),
            // What the provider actually granted.
            scope:        z.string(),
            accountLabel: z.string().optional(),
        })
        export type Values = z.infer<typeof Values>
    }

    export namespace Database {
        export namespace Insert {
            export namespace CredentialInstance {
                export const Schema = z.object({
                    name:       z.string(),
                    templateId: z.string().brand("CredentialTemplateId"),
                    blob:       z.string().brand("EncryptedBlob"),
                })
            }
            export type CredentialInstance = z.infer<typeof CredentialInstance.Schema>
        }
    }

    export namespace Credential {

        export namespace Template {
            export const Id = z.string().brand("CredentialTemplateId");
            export type Id = z.infer<typeof Id>

            export const Schema = z.object({
                id:          Id,
                displayName: z.string(),
                fields:      z.array(Field.Schema).readonly(),
                icon:        z.string().optional(),
                // Nothing attached is a valid state — validation won't flag it as missing.
                optional:    z.boolean().optional(),
                // Present when the fields are only the first step and a consent flow completes the credential.
                auth:        OAuth.Auth.optional(),
            })
        }
        export type Template = z.infer<typeof Template.Schema>

        export namespace Instance {
            export const Id = z.uuid().brand("CredentialInstanceId");
            export type Id = z.infer<typeof Id>

            export const Schema = z.object({
                id:          Id,
                template_id: Template.Id,
                name:        z.string(),
                created_at:  z.string(),
                updated_at:  z.string(),
                blob:        z.string().brand("EncryptedBlob"),
            })

            export const EncryptedBlob = z.string().brand("EncryptedBlob")
            type EncryptedBlobBase = z.infer<typeof EncryptedBlob>
            // Phantom-typed: T carries the credential template ref so consumers
            // can infer the decrypted field shape from the blob alone.
            export type EncryptedBlob<T = unknown> = EncryptedBlobBase & { readonly __template?: T }

            // Type-preserving: a credential field's value keeps its real type through
            // the encrypted blob (Boolean → boolean, Integer → number), mirroring
            // Workflow.staticValues. The blob is JSON, so any JSON value round-trips.
            export const DecryptedValues = z.record(
                Field.Id,
                z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.json()])
            )
            export type DecryptedValues = z.infer<typeof DecryptedValues>
        }
        export type Instance = z.infer<typeof Instance.Schema>
    }

    // Declared after Credential because the payload names its ids.
    export namespace OAuth {

        // Travels through the provider and back: signed so it cannot be forged, single-use.
        export namespace State {
            export const Schema = z.object({
                templateId: Credential.Template.Id,
                name:       z.string(),
                // The form fields, already encrypted, so no row exists until consent lands.
                blob:       Credential.Instance.EncryptedBlob,
                userId:     AuthDomain.User.Id,
                role:       Workspace.Role,
                // Set when reconnecting an existing instance.
                instanceId: Credential.Instance.Id.optional(),
                nonce:      z.string(),
                exp:        z.number(),
            })

            export type Input = Omit<z.infer<typeof Schema>, "nonce" | "exp">
        }
        export type State = z.infer<typeof State.Schema>

        // The message the callback page posts to the window that opened it.
        export const PopupMessage = z.object({
            type:       z.literal("pretzel:oauth"),
            instanceId: Credential.Instance.Id.optional(),
            error:      z.string().optional(),
        })
        export type PopupMessage = z.infer<typeof PopupMessage>
    }



    export namespace API {
        export namespace CredentialTemplate {

            export namespace Get {
                export const Request = z.object({
                    id: Credential.Template.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    template: Credential.Template.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function get(api: AxiosInstance, id: Credential.Template.Id): Promise<Get.Response> {
                const { data } = await api.get<Get.Response>(`/api/vault/credential-templates/${id}`)
                return data
            }

            export namespace GetBatch {
                export const Request = z.object({
                    ids: z.array(Credential.Template.Id),
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    templates: z.record(Credential.Template.Id, Credential.Template.Schema),
                })
                export type Response = z.infer<typeof Response>
            }

            export async function getBatch(api: AxiosInstance, req: GetBatch.Request): Promise<GetBatch.Response> {
                const { data } = await api.post<GetBatch.Response>('/api/vault/credential-templates/getBatch', req)
                return data
            }
        }

        export namespace CredentialInstance {

            export namespace List {
                export const Response = z.object({
                    instances: z.record(Credential.Instance.Id, Credential.Instance.Schema),
                })
                export type Response = z.infer<typeof Response>
            }

            export async function list(api: AxiosInstance): Promise<List.Response> {
                const { data } = await api.get<List.Response>('/api/vault/credential-instances')
                return data
            }

            export namespace Create {
                export const Request = z.object({
                    name:        z.string().min(1),
                    templateId:  Credential.Template.Id,
                    fieldValues: Credential.Instance.DecryptedValues,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    instance: Credential.Instance.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function create(api: AxiosInstance, req: Create.Request): Promise<Create.Response> {
                const { data } = await api.post<Create.Response>('/api/vault/credential-instances', req)
                return data
            }

            export namespace Remove {
                export const Request = z.object({
                    id: Credential.Instance.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({ ok: z.literal(true) })
                export type Response = z.infer<typeof Response>
            }

            export async function remove(api: AxiosInstance, req: Remove.Request): Promise<Remove.Response> {
                const { data } = await api.delete<Remove.Response>(`/api/vault/credential-instances/${req.id}`)
                return data
            }

            export namespace UpdateName {
                export const Request = z.object({
                    id:   Credential.Instance.Id,
                    name: z.string().min(1),
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    instance: Credential.Instance.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function updateName(api: AxiosInstance, req: UpdateName.Request): Promise<UpdateName.Response> {
                const { id, ...payload } = req
                const { data } = await api.patch<UpdateName.Response>(`/api/vault/credential-instances/${id}/name`, payload)
                return data
            }

            export namespace Update {
                export const Request = z.object({
                    id:          Credential.Instance.Id,
                    name:        z.string().min(1),
                    fieldValues: Credential.Instance.DecryptedValues,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    instance: Credential.Instance.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function update(api: AxiosInstance, req: Update.Request): Promise<Update.Response> {
                const { id, ...payload } = req
                const { data } = await api.patch<Update.Response>(`/api/vault/credential-instances/${id}`, payload)
                return data
            }

            export namespace Reveal {
                export const Response = z.object({
                    fieldValues: Credential.Instance.DecryptedValues,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function reveal(api: AxiosInstance, id: Credential.Instance.Id): Promise<Reveal.Response> {
                const { data } = await api.post<Reveal.Response>(`/api/vault/credential-instances/${id}/reveal`)
                return data
            }
        }

        export namespace OAuth {

            export namespace RedirectUri {
                export const Response = z.object({
                    redirectUri: z.url(),
                })
                export type Response = z.infer<typeof Response>
            }

            export async function redirectUri(api: AxiosInstance): Promise<RedirectUri.Response> {
                const { data } = await api.get<RedirectUri.Response>('/api/vault/oauth/redirect-uri')
                return data
            }

            export namespace Start {
                export const Request = z.object({
                    templateId:  Credential.Template.Id,
                    name:        z.string(),
                    fieldValues: Credential.Instance.DecryptedValues,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    authorizeUrl: z.url(),
                })
                export type Response = z.infer<typeof Response>
            }

            export async function start(api: AxiosInstance, req: Start.Request): Promise<Start.Response> {
                const { data } = await api.post<Start.Response>('/api/vault/oauth/start', req)
                return data
            }

            export namespace Reconnect {
                export const Response = Start.Response
                export type Response = z.infer<typeof Response>
            }

            export async function reconnect(api: AxiosInstance, id: Credential.Instance.Id): Promise<Reconnect.Response> {
                const { data } = await api.post<Reconnect.Response>(`/api/vault/oauth/${id}/reconnect`)
                return data
            }

            export namespace AccessToken {
                export const Response = z.object({
                    accessToken: z.string(),
                    expiresAt:   z.number(),
                })
                export type Response = z.infer<typeof Response>
            }
        }
    }
}
