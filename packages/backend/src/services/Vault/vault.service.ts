import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Vault } from '@pretzel-graph/shared/domain';
import { VaultRepository } from './vault.repository';
import { OAuthService } from './OAuth/oauth.service';
import { getCredentialTemplate, loadCredentialTemplates } from './templates';
import { Encryption } from '@pretzel-graph/shared/server/vault/encryption';

@Injectable()
export class VaultService {
    constructor(
        private readonly vaultRepository: VaultRepository,
        private readonly oauth:           OAuthService,
    ) {}

    public readonly credentialTemplate = {
        get: (id: Vault.Credential.Template.Id): Vault.API.CredentialTemplate.Get.Response => {
            return { template: getCredentialTemplate(id) };
        },

        getBatch: (req: Vault.API.CredentialTemplate.GetBatch.Request): Vault.API.CredentialTemplate.GetBatch.Response => {
            const all = loadCredentialTemplates();
            const templates: Record<Vault.Credential.Template.Id, Vault.Credential.Template> = {};
            for (const id of req.ids)
                if (all[id])
                    templates[id] = all[id];

            return { templates };
        },
    };

    public readonly credentialInstance = {
        list: async (
            principal: Principal.User,
        ): Promise<Vault.API.CredentialInstance.List.Response> => {
            const rows = await this.vaultRepository.credentialInstance.list(principal);
            const instances = Object.fromEntries(rows.map(i => [i.id, i])) as Vault.API.CredentialInstance.List.Response['instances'];
            return { instances };
        },

        create: async (
            principal: Principal.User,
            req: Vault.API.CredentialInstance.Create.Request,
        ): Promise<Vault.API.CredentialInstance.Create.Response> => {
            const blob     = Encryption.encryptValues(req.fieldValues);
            const instance = await this.vaultRepository.credentialInstance.create(principal, {
                name:       req.name,
                templateId: req.templateId,
                blob,
            });
            return { instance };
        },

        remove: async (
            principal: Principal.User,
            req: Vault.API.CredentialInstance.Remove.Request,
        ): Promise<Vault.API.CredentialInstance.Remove.Response> => {
            await this.oauth.revoke(principal, req.id);
            await this.vaultRepository.credentialInstance.remove(principal, req.id);
            return { ok: true };
        },

        reveal: async (
            principal: Principal.User,
            id: Vault.Credential.Instance.Id,
        ): Promise<Vault.API.CredentialInstance.Reveal.Response> => {
            const instance    = await this.vaultRepository.credentialInstance.getById(principal, id);
            const template    = getCredentialTemplate(instance.template_id);
            const fieldValues = this.oauth.revealable(template, Encryption.decryptBlob(instance.blob));

            return { fieldValues };
        },

        updateName: async (
            principal: Principal.User,
            req: Vault.API.CredentialInstance.UpdateName.Request,
        ): Promise<Vault.API.CredentialInstance.UpdateName.Response> => {
            const instance = await this.vaultRepository.credentialInstance.updateName(principal, req);
            return { instance };
        },

        update: async (
            principal: Principal.User,
            req: Vault.API.CredentialInstance.Update.Request,
        ): Promise<Vault.API.CredentialInstance.Update.Response> => {
            const blob     = Encryption.encryptValues(req.fieldValues);
            const instance = await this.vaultRepository.credentialInstance.update(principal, req.id, req.name, blob);
            return { instance };
        },
    };
}
