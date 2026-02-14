import { z } from "zod"
import { type SupabaseClient } from "@supabase/supabase-js";

export namespace Vault {
    export namespace Credential {
        export const Id = z.string().brand("credentialId");
        export type Id = z.infer<typeof Id>

        export const Schema = z.object({
            id: z.string().brand("credentialId"),
            name: z.string(),
            provider: z.string(),
            created_at: z.string(),
        })
    }
    export type Credential = z.infer<typeof Credential.Schema>

    export const Secret = z.string().brand("SECRET_CREDENTIAL_DO_NOT_STORE")

    export type Secret = z.infer<typeof Secret>


    export namespace API {
        export namespace Credential {
            export namespace GetAll {
                export const Query = z.object({})
                export const Response = z.array(Vault.Credential.Schema)

                export type Query = z.infer<typeof Query>
                export type Response = z.infer<typeof Response>

            }
            export async function getAll(supabase: SupabaseClient): Promise<GetAll.Response> {
                const { data } = await supabase
                    .from('user_credentials')
                    .select('id, name, provider, created_at')
                    // ❌ DO NOT select vault_secret_id or any decrypted value
                    .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
                return data as unknown as GetAll.Response;
            }

            
            export namespace Create {
                export const Query = z.object({
                    name: z.string(),
                    provider: z.string(),
                    value: z.string()
                })
                export const Response = z.object({})

                export type Query = z.infer<typeof Query>
                export type Response = z.infer<typeof Response>

            }
            export async function create(supabase: SupabaseClient, query: Create.Query): Promise<Create.Response> {
                const { data, error } = await supabase.rpc('create_user_credential', {
                    p_name: query.name,
                    p_provider: query.provider,
                    p_value: query.value
                });
                if (error) throw error;
                return {};
            }


            export namespace UpdateMeta {
                export const Query = z.object({
                    id: Vault.Credential.Id,
                    name: z.string().optional(),
                    provider: z.string().optional()
                });
                export type Query = z.infer<typeof Query>
            }
            export async function updateMeta(supabase: SupabaseClient, q: UpdateMeta.Query) {
                const updates: any = {};
                if (q.name !== undefined) updates.name = q.name;
                if (q.provider !== undefined) updates.provider = q.provider;

                if (Object.keys(updates).length === 0) return;

                const { error } = await supabase
                    .from('user_credentials')
                    .update(updates)
                    .eq('id', q.id)

                if (error) throw error;
            }


            export namespace UpdateSecret {
                export const Query = z.object({
                    id: Vault.Credential.Id,
                    newValue: z.string()
                });
                export type Query = z.infer<typeof Query>
            }
            export async function updateSecret(supabase: SupabaseClient, q: UpdateSecret.Query) {
                const { error } = await supabase.rpc('update_user_credential_value', {
                    p_credential_id: q.id,
                    p_new_value: q.newValue
                })
                if (error) throw error;
            }
    

            export namespace Remove {
                export const Query = z.object({
                    id: Vault.Credential.Id
                })
                export const Response = z.object({})

                export type Query = z.infer<typeof Query>
                export type Response = z.infer<typeof Response>

            }
            export async function remove(supabase: SupabaseClient, query: Remove.Query): Promise<Remove.Response> {
                await supabase
                    .from('user_credentials')
                    .delete()
                    .eq('id', query.id)
                return {}
            }

            export namespace Reveal {
                export const Query = z.object({
                    id: Vault.Credential.Id
                })
                export const Response = z.object({
                    value: Vault.Secret
                })

                export type Query = z.infer<typeof Query>
                export type Response = z.infer<typeof Response>

            }
            export async function reveal(supabase: SupabaseClient, query: Reveal.Query): Promise<Reveal.Response> {
                const { data, error } = await supabase.rpc('reveal_credential_value', {
                    p_credential_id: query.id
                });
                if (error)
                    throw error;
                return { value: data };
            }
        }
    }
}