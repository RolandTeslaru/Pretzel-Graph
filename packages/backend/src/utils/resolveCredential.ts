import { type SupabaseClient } from "@supabase/supabase-js";
import { Vault } from "@pretzel-graph/shared/domain";

export async function resolveCredential(
    supabase: SupabaseClient,
    instanceId: Vault.Credential.Instance.Id,
): Promise<Vault.Credential.Instance> {
    const { data, error } = await supabase
        .from('credential_instance')
        .select('id, name, template_id, created_at, updated_at, blob')
        .eq('id', instanceId)
        .single();

    if (error) throw error;
    return Vault.Credential.Instance.Schema.parse(data);
}
