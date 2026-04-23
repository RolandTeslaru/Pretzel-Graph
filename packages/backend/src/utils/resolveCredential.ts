import { type SupabaseClient } from "@supabase/supabase-js";
import { Vault } from "@pretzel-graph/shared/domain";

export async function resolveCredential(supabase: SupabaseClient, credentialId: Vault.Credential.Id) {
    const { data, error } = await supabase
        .rpc('reveal_credential_value', {
            p_credential_id: credentialId
        })

    if (error)
        throw error;
    return data.value as Vault.Credential;
}