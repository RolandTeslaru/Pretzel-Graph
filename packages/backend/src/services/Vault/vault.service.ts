import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Principal } from '@/domain/Principal';
import { Vault } from '@pretzel-graph/shared/domain';
import { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint';
import { VaultDatabase } from './vault.database';
import { encryptCredentialBlob, decryptCredentialBlob } from './vault.encryption';

function loadCredentialTemplates(): Record<Vault.Credential.Template.Id, Vault.Credential.Template> {
    const raw = fs.readFileSync(path.join(__dirname, '../Shelf/node_index.json'), 'utf-8');
    const { blueprints } = JSON.parse(raw) as { blueprints: Record<string, Blueprint> };

    const templates: Record<Vault.Credential.Template.Id, Vault.Credential.Template> = {};
    for (const blueprint of Object.values(blueprints))
        for (const template of blueprint.credentials ?? [])
            templates[template.id] = template;

    return templates;
}

@Injectable()
export class VaultService {
    constructor(private readonly database: VaultDatabase) {}

    public readonly credentialTemplate = {
        get: (id: Vault.Credential.Template.Id): Vault.API.CredentialTemplate.Get.Response => {
            const template = loadCredentialTemplates()[id];
            if (!template)
                throw new Error(`Credential template not found: ${id}`);

            return { template };
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
            const rows = await this.database.credentialInstance.list(principal.supabase);
            const instances = Object.fromEntries(rows.map(i => [i.id, i])) as Vault.API.CredentialInstance.List.Response['instances'];
            return { instances };
        },

        create: async (
            principal: Principal.User,
            req: Vault.API.CredentialInstance.Create.Request,
        ): Promise<Vault.API.CredentialInstance.Create.Response> => {
            const blob     = encryptCredentialBlob(req.fieldValues);
            const instance = await this.database.credentialInstance.create(principal.supabase, {
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
            await this.database.credentialInstance.remove(principal.supabase, req.id);
            return { ok: true };
        },

        reveal: async (
            principal: Principal.User,
            id: Vault.Credential.Instance.Id,
        ): Promise<Vault.API.CredentialInstance.Reveal.Response> => {
            const blob        = await this.database.credentialInstance.fetchBlob(principal.supabase, id);
            const fieldValues = decryptCredentialBlob(blob);
            return { fieldValues };
        },

        updateName: async (
            principal: Principal.User,
            req: Vault.API.CredentialInstance.UpdateName.Request,
        ): Promise<Vault.API.CredentialInstance.UpdateName.Response> => {
            const instance = await this.database.credentialInstance.updateName(principal.supabase, req);
            return { instance };
        },

        update: async (
            principal: Principal.User,
            req: Vault.API.CredentialInstance.Update.Request,
        ): Promise<Vault.API.CredentialInstance.Update.Response> => {
            const blob     = encryptCredentialBlob(req.fieldValues);
            const instance = await this.database.credentialInstance.update(principal.supabase, req.id, req.name, blob);
            return { instance };
        },
    };
}
