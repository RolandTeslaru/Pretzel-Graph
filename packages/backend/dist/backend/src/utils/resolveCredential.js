"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCredential = resolveCredential;
async function resolveCredential(supabase, credentialId) {
    const { data, error } = await supabase
        .rpc('reveal_credential_value', {
        p_credential_id: credentialId
    });
    console.log("RPC result for credentialId", credentialId, "data", data, "error", error);
    if (error)
        throw error;
    return data.value;
}
