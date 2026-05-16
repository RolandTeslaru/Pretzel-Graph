import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';
import { Vault } from '@pretzel-graph/shared/domain';

@Injectable()
export class VaultDatabase {
    public readonly credentialInstance = {
        list: withSupabaseAssert('vault.credentialInstance.list', async (
            supabase: SupabaseClient,
        ) => {
            const { data } = await supabase
                .from('credential_instance')
                .select<string, Vault.Credential.Instance>('id, name, template_id, created_at, updated_at, blob')
                .order('created_at', { ascending: false })
                .throwOnError();

            return (data ?? []).map(row => Vault.Credential.Instance.Schema.parse(row));
        }),

        create: withSupabaseAssert('vault.credentialInstance.create', async (
            supabase: SupabaseClient,
            insert: Vault.Database.Insert.CredentialInstance,
        ) => {
            const { data } = await supabase
                .from('credential_instance')
                .insert({
                    name:        insert.name,
                    template_id: insert.templateId,
                    blob:        insert.blob,
                })
                .select<string, Vault.Credential.Instance>('id, name, template_id, created_at, updated_at, blob')
                .single()
                .throwOnError();

            return Vault.Credential.Instance.Schema.parse(data);
        }),

        remove: withSupabaseAssert('vault.credentialInstance.remove', async (
            supabase: SupabaseClient,
            id: Vault.Credential.Instance.Id,
        ) => {
            await supabase
                .from('credential_instance')
                .delete()
                .eq('id', id)
                .throwOnError();
        }),

        fetchBlob: withSupabaseAssert('vault.credentialInstance.fetchBlob', async (
            supabase: SupabaseClient,
            id: Vault.Credential.Instance.Id,
        ) => {
            const { data } = await supabase
                .from('credential_instance')
                .select<string, { blob: Vault.Credential.Instance.EncryptedBlob }>('blob')
                .eq('id', id)
                .single()
                .throwOnError();

            return data!.blob;
        }),

        updateName: withSupabaseAssert('vault.credentialInstance.updateName', async (
            supabase: SupabaseClient,
            req: Vault.API.CredentialInstance.UpdateName.Request,
        ) => {
            const { data } = await supabase
                .from('credential_instance')
                .update({ name: req.name })
                .eq('id', req.id)
                .select<string, Vault.Credential.Instance>('id, name, template_id, created_at, updated_at, blob')
                .single()
                .throwOnError();

            return Vault.Credential.Instance.Schema.parse(data);
        }),
    };
}
