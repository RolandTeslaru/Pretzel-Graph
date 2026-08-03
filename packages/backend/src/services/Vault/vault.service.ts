import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { Vault } from '@pretzel-graph/shared/domain';
import { Token } from '@/domain/Token';
import { VaultDatabase } from './vault.database';
import { encryptCredentialBlob, decryptCredentialBlob } from './vault.encryption';

@Injectable()
export class VaultService {
    constructor(private readonly database: VaultDatabase) {}

    public readonly credentialInstance = {
        list: async (
            token: Token.UserSupabaseJWT,
        ): Promise<Vault.API.CredentialInstance.List.Response> => {
            const supabase = createAuthenticatedClient(token);
            const rows = await this.database.credentialInstance.list(supabase);
            const instances = Object.fromEntries(rows.map(i => [i.id, i])) as Vault.API.CredentialInstance.List.Response['instances'];
            return { instances };
        },

        create: async (
            token: Token.UserSupabaseJWT,
            req: Vault.API.CredentialInstance.Create.Request,
        ): Promise<Vault.API.CredentialInstance.Create.Response> => {
            const supabase = createAuthenticatedClient(token);
            const blob     = encryptCredentialBlob(req.fieldValues);
            const instance = await this.database.credentialInstance.create(supabase, {
                name:       req.name,
                templateId: req.templateId,
                blob,
            });
            return { instance };
        },

        remove: async (
            token: Token.UserSupabaseJWT,
            req: Vault.API.CredentialInstance.Remove.Request,
        ): Promise<Vault.API.CredentialInstance.Remove.Response> => {
            const supabase = createAuthenticatedClient(token);
            await this.database.credentialInstance.remove(supabase, req.id);
            return { ok: true };
        },

        reveal: async (
            token: Token.UserSupabaseJWT,
            id: Vault.Credential.Instance.Id,
        ): Promise<Vault.API.CredentialInstance.Reveal.Response> => {
            const supabase  = createAuthenticatedClient(token);
            const blob      = await this.database.credentialInstance.fetchBlob(supabase, id);
            const fieldValues = decryptCredentialBlob(blob);
            return { fieldValues };
        },

        updateName: async (
            token: Token.UserSupabaseJWT,
            req: Vault.API.CredentialInstance.UpdateName.Request,
        ): Promise<Vault.API.CredentialInstance.UpdateName.Response> => {
            const supabase = createAuthenticatedClient(token);
            const instance = await this.database.credentialInstance.updateName(supabase, req);
            return { instance };
        },

        update: async (
            token: Token.UserSupabaseJWT,
            req: Vault.API.CredentialInstance.Update.Request,
        ): Promise<Vault.API.CredentialInstance.Update.Response> => {
            const supabase = createAuthenticatedClient(token);
            const blob      = encryptCredentialBlob(req.fieldValues);
            const instance  = await this.database.credentialInstance.update(supabase, req.id, req.name, blob);
            return { instance };
        },
    };
}
