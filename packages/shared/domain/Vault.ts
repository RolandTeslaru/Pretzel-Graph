import { z } from "zod"
import type { AxiosInstance } from "axios"
import { Auth } from "./Auth";
import { Field } from "./Foundations/Field";

export namespace Vault {

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
    }
}
