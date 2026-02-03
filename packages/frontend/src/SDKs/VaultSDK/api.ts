import z from "zod"
import { supabase } from "@/libs/supabase";
import { Vault } from "@vx-agent-editor/shared/types";

export namespace VaultAPI {
    export namespace Credential {
        export namespace GetAll {
            export const Query = z.object({})
            export const Response = z.array(Vault.Credential.Schema)

            export type Query = z.infer<typeof Query>
            export type Response = z.infer<typeof Response>

            export async function fetch(): Promise<Response> {
                const { data } = await supabase
                    .from('user_credentials')
                    .select('id, name, provider, created_at')
                    // ❌ DO NOT select vault_secret_id or any decrypted value
                    .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
                return data as unknown as Response;
            }
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

            export async function execute(query: Query): Promise<Response> {
                const { data, error } = await supabase.rpc('create_user_credential', {
                    p_name: query.name,
                    p_provider: query.provider,
                    p_value: query.value
                });
                if (error) throw error;
                return {};
            }
        }

        export namespace Update {
            export namespace Meta {
                export const Query = z.object({
                    id: Vault.Credential.Id,
                    name: z.string().optional(),
                    provider: z.string().optional()
                });
                export type Query = z.infer<typeof Query>

                export async function execute(q: Query) {
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
            }

            export namespace Secret {
                export const Query = z.object({
                    id: Vault.Credential.Id,
                    newValue: z.string()
                });
                export type Query = z.infer<typeof Query>
                export async function execute(q: Query) {
                    const { error } = await supabase.rpc('update_user_credential_value', {
                        p_credential_id: q.id,
                        p_new_value: q.newValue
                    })
                    if (error) throw error;
                }
            }
        }

        export namespace Delete {
            export const Query = z.object({
                id: Vault.Credential.Id
            })
            export const Response = z.object({})

            export type Query = z.infer<typeof Query>
            export type Response = z.infer<typeof Response>

            export async function execute(query: Query): Promise<Response> {
                const { data, status } = await supabase
                    .from('user_credentials')
                    .delete()
                    .eq('id', query.id)
                return {}
            }
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

            export async function fetch(query: Query): Promise<Response> {
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