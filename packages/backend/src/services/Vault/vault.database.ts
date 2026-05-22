import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Vault } from '@pretzel-graph/shared/domain';
import { SupabaseAssert, ZodReturn } from '../../decorators/database';

class CredentialInstanceMethods {

    @SupabaseAssert('vault.credentialInstance.list')
    @ZodReturn(Vault.Credential.Instance.Schema.array())
    async list(supabase: SupabaseClient): Promise<Vault.Credential.Instance[]> {
        const { data } = await supabase
            .from('credential_instance')
            .select<string, Vault.Credential.Instance>('id, name, template_id, created_at, updated_at, blob')
            .order('created_at', { ascending: false })
            .throwOnError();

        return data ?? [];
    }

    @SupabaseAssert('vault.credentialInstance.create')
    @ZodReturn(Vault.Credential.Instance.Schema)
    async create(supabase: SupabaseClient, insert: Vault.Database.Insert.CredentialInstance): Promise<Vault.Credential.Instance> {
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

        return data;
    }

    @SupabaseAssert('vault.credentialInstance.remove')
    async remove(supabase: SupabaseClient, id: Vault.Credential.Instance.Id): Promise<void> {
        await supabase
            .from('credential_instance')
            .delete()
            .eq('id', id)
            .throwOnError();
    }

    @SupabaseAssert('vault.credentialInstance.fetchBlob')
    async fetchBlob(supabase: SupabaseClient, id: Vault.Credential.Instance.Id): Promise<Vault.Credential.Instance.EncryptedBlob> {
        const { data } = await supabase
            .from('credential_instance')
            .select<string, { blob: Vault.Credential.Instance.EncryptedBlob }>('blob')
            .eq('id', id)
            .single()
            .throwOnError();

        return data!.blob;
    }

    @SupabaseAssert('vault.credentialInstance.listByIds')
    @ZodReturn(Vault.Credential.Instance.Schema.array())
    async listByIds(supabase: SupabaseClient, ids: Vault.Credential.Instance.Id[]): Promise<Vault.Credential.Instance[]> {
        if (ids.length === 0) return [];

        const { data } = await supabase
            .from('credential_instance')
            .select<string, Vault.Credential.Instance>('id, name, template_id, created_at, updated_at, blob')
            .in('id', ids)
            .throwOnError();

        return data ?? [];
    }

    @SupabaseAssert('vault.credentialInstance.updateName')
    @ZodReturn(Vault.Credential.Instance.Schema)
    async updateName(supabase: SupabaseClient, req: Vault.API.CredentialInstance.UpdateName.Request): Promise<Vault.Credential.Instance> {
        const { data } = await supabase
            .from('credential_instance')
            .update({ name: req.name })
            .eq('id', req.id)
            .select<string, Vault.Credential.Instance>('id, name, template_id, created_at, updated_at, blob')
            .single()
            .throwOnError();

        return data;
    }
}

@Injectable()
export class VaultDatabase {
    public readonly credentialInstance = new CredentialInstanceMethods();
}
