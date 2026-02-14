import { type SupabaseClient } from "@supabase/supabase-js";
import { Vault } from "@vx-agent-editor/shared/domain";

export async function resolveCredential(supabase: SupabaseClient, credentialId: Vault.Credential.Id) {
    const { data, error } = await supabase
        .rpc('reveal_credential_value', {
            p_credential_id: credentialId
        })

    console.log("RPC result for credentialId", credentialId, "data", data, "error", error)

    if (error)
        throw error;
    return data.value as Vault.Credential;
}