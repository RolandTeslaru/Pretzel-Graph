import * as fs from 'fs';
import * as path from 'path';
import { Vault } from '@pretzel-graph/shared/domain';
import { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint';

// Templates live on the blueprints, so the catalogue is the source of truth.
export function loadCredentialTemplates(): Record<Vault.Credential.Template.Id, Vault.Credential.Template> {
    const raw = fs.readFileSync(path.join(__dirname, '../../../assets/blueprint_index.json'), 'utf-8');
    const { blueprints } = JSON.parse(raw) as { blueprints: Record<string, Blueprint> };

    const templates: Record<Vault.Credential.Template.Id, Vault.Credential.Template> = {};

    for (const blueprint of Object.values(blueprints))
        for (const template of blueprint.credentials ?? [])
            templates[template.id] = template;

    return templates;
}

export function getCredentialTemplate(id: Vault.Credential.Template.Id): Vault.Credential.Template {
    const template = loadCredentialTemplates()[id];

    if (!template)
        throw new Error(`Credential template not found: ${id}`);

    return template;
}
