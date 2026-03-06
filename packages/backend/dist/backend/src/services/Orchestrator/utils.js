"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsResolver = void 0;
const domain_1 = require("@vx-agent-editor/shared/domain");
class SecretsResolver {
    static async resolveWorkflow(supabase, workflow) {
        const resolvedSecrets = {};
        for (const [_, node] of Object.entries(workflow.data.nodes)) {
            const staticValues = workflow.data.staticValues[node.id];
            for (const [_, field] of Object.entries(node.fields)) {
                if (field.variant !== "Secret")
                    continue;
                const credentialId = staticValues[field.id];
                if (!credentialId)
                    throw new Error(`Field '${field.id}' on node '${node.id}' does not have a credential assigned to it.`);
                if (credentialId in resolvedSecrets) {
                    staticValues[field.id] = resolvedSecrets[credentialId];
                    continue;
                }
                const { value: secret } = await domain_1.Vault.API.Credential.reveal(supabase, { id: credentialId });
                if (!secret)
                    throw new Error(`Failed to resolve secret for credentialId ${credentialId}`);
                resolvedSecrets[credentialId] = secret;
                staticValues[field.id] = secret;
            }
        }
    }
}
exports.SecretsResolver = SecretsResolver;
