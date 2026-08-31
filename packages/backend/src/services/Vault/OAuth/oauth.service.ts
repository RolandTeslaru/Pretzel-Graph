import { Injectable } from '@nestjs/common';
import { SystemError, Vault } from '@pretzel-graph/shared/domain';
import { Encryption } from '@pretzel-graph/shared/server/vault/encryption';
import { Principal } from '@/domain/Principal';
import { VaultRepository } from '../vault.repository';
import { getCredentialTemplate } from '../templates';
import { OAuthProvider } from './oauth.provider';
import { OAuthState } from './oauth.state';

const REFRESH_MARGIN_MS = 60_000;


// DecryptedValues is keyed by branded field ids; these two are plain-string doors into it.
const asFieldValues = (values: Record<string, unknown>) => values as Vault.Credential.Instance.DecryptedValues;
const readField     = (values: Vault.Credential.Instance.DecryptedValues, key: string) => String((values as Record<string, unknown>)[key] ?? '');

export type AccessToken = Vault.API.OAuth.AccessToken.Response;

// Connects, refreshes and reveals OAuth2 credentials; the vault-facing half of the flow.
@Injectable()
export class OAuthService {

    // One refresh in flight per instance; concurrent callers share it.
    private readonly inflight = new Map<Vault.Credential.Instance.Id, Promise<AccessToken>>();

    constructor(
        private readonly vaultRepository: VaultRepository,
        private readonly provider:        OAuthProvider,
        private readonly state:           OAuthState,
    ) {}


    public redirectUri(): string {
        const override = process.env.OAUTH_REDIRECT_URL;

        if (override)
            return override;

        const base = (process.env.PUBLIC_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

        return `${base}/oauth/callback`;
    }


    public async start(
        principal: Principal.User,
        req: Vault.API.OAuth.Start.Request,
    ): Promise<Vault.API.OAuth.Start.Response> {
        const template = this.oauthTemplate(req.templateId);

        return this.beginAuthorization(template, principal, {
            name: req.name,
            blob: Encryption.encryptValues(req.fieldValues),
        });
    }


    public async reconnect(
        principal: Principal.User,
        id: Vault.Credential.Instance.Id,
    ): Promise<Vault.API.OAuth.Reconnect.Response> {
        const instance = await this.instance(principal, id);
        const template = this.oauthTemplate(instance.template_id);
        const values   = this.values(instance);

        return this.beginAuthorization(template, principal, {
            name:       instance.name,
            blob:       Encryption.encryptValues(asFieldValues({ clientId: values.clientId, clientSecret: values.clientSecret })),
            instanceId: id,
        });
    }


    /** Returns the id of the instance written. */
    public async callback(query: { code?: string, state?: string, error?: string }): Promise<Vault.Credential.Instance.Id> {

        if (!query.state)
            throw new SystemError(SystemError.Code.BAD_REQUEST, 'Missing state');

        const state = await this.state.consume(query.state);

        if (query.error)
            throw new SystemError(SystemError.Code.BAD_REQUEST, `The provider refused: ${query.error}`);

        if (!query.code)
            throw new SystemError(SystemError.Code.BAD_REQUEST, 'Missing authorization code');

        const template = this.oauthTemplate(state.templateId);
        const provider = template.auth!.provider;
        const form     = Encryption.decryptBlob(state.blob);
        const client   = { clientId: readField(form, 'clientId'), clientSecret: readField(form, 'clientSecret') };

        const token = await this.provider.exchangeCode(provider, client, query.code, this.redirectUri());

        if (!token.refreshToken)
            throw new SystemError(SystemError.Code.BAD_REQUEST, 'The provider returned no refresh token; revoke access and connect again');

        const accountLabel = await this.provider.accountLabel(provider, token.accessToken);

        const values: Vault.OAuth.Values = {
            ...client,
            accessToken:  token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt:    token.expiresAt,
            scope:        token.scope ?? provider.scopes.join(provider.scopeSeparator),
            accountLabel,
        };

        const principal: Principal.User = { type: 'user', userId: state.userId, role: state.role };
        const blob = Encryption.encryptValues(asFieldValues(values));

        if (state.instanceId) {
            await this.vaultRepository.credentialInstance.updateBlob(principal, state.instanceId, blob);
            return state.instanceId;
        }

        const instance = await this.vaultRepository.credentialInstance.create(principal, {
            name:       state.name.trim() || accountLabel || template.displayName,
            templateId: template.id,
            blob,
        });

        return instance.id;
    }


    public getAccessToken(
        principal: Principal.User | Principal.Delegate,
        id: Vault.Credential.Instance.Id,
    ): Promise<AccessToken> {
        const pending = this.inflight.get(id);

        if (pending)
            return pending;

        const task = this.resolveAccessToken(principal, id).finally(() => this.inflight.delete(id));

        this.inflight.set(id, task);

        return task;
    }


    /** Strips everything a member has no business seeing. */
    public revealable(template: Vault.Credential.Template, values: Vault.Credential.Instance.DecryptedValues): Vault.Credential.Instance.DecryptedValues {
        if (template.auth?.kind !== 'oauth2')
            return values;

        const all   = values as Record<string, unknown>;
        const shown: Record<string, unknown> = {};

        if (all.clientId !== undefined)
            shown.clientId = all.clientId;

        if (all.accountLabel !== undefined)
            shown.accountLabel = all.accountLabel;

        return asFieldValues(shown);
    }


    /** Best effort — a failed revoke must not stop the delete. */
    public async revoke(principal: Principal.User, id: Vault.Credential.Instance.Id): Promise<void> {
        try {
            const instance = await this.instance(principal, id);
            const template = getCredentialTemplate(instance.template_id);

            if (template.auth?.kind !== 'oauth2')
                return;

            await this.provider.revoke(template.auth.provider, this.values(instance).refreshToken);
        }
        catch {
            // Nothing to revoke, or nothing reachable — the row goes either way.
        }
    }



    private async beginAuthorization(
        template: Vault.Credential.Template,
        principal: Principal.User,
        input: Pick<Vault.OAuth.State.Input, 'name' | 'blob' | 'instanceId'>,
    ): Promise<Vault.API.OAuth.Start.Response> {
        const state = await this.state.issue({
            ...input,
            templateId: template.id,
            userId:     principal.userId,
            role:       principal.role,
        });

        const clientId = readField(Encryption.decryptBlob(input.blob), 'clientId');

        return {
            authorizeUrl: this.provider.authorizeUrl(template.auth!.provider, clientId, this.redirectUri(), state),
        };
    }


    private async resolveAccessToken(
        principal: Principal.User | Principal.Delegate,
        id: Vault.Credential.Instance.Id,
    ): Promise<AccessToken> {
        const instance = await this.instance(principal, id);
        const template = this.oauthTemplate(instance.template_id);
        const values   = this.values(instance);

        if (values.expiresAt - REFRESH_MARGIN_MS > Date.now())
            return { accessToken: values.accessToken, expiresAt: values.expiresAt };

        const token = await this.provider.refresh(template.auth!.provider, values, values.refreshToken, id);

        const refreshed: Vault.OAuth.Values = {
            ...values,
            accessToken:  token.accessToken,
            expiresAt:    token.expiresAt,
            // Some providers rotate the refresh token; Google keeps it.
            refreshToken: token.refreshToken ?? values.refreshToken,
            scope:        token.scope ?? values.scope,
        };

        await this.vaultRepository.credentialInstance.updateBlob(principal, id, Encryption.encryptValues(asFieldValues(refreshed)));

        return { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt };
    }


    private oauthTemplate(id: Vault.Credential.Template.Id): Vault.Credential.Template {
        const template = getCredentialTemplate(id);

        if (template.auth?.kind !== 'oauth2')
            throw new SystemError(SystemError.Code.BAD_REQUEST, `${template.displayName} is not an OAuth credential`);

        return template;
    }


    private instance(
        principal: Principal.User | Principal.Delegate,
        id: Vault.Credential.Instance.Id,
    ): Promise<Vault.Credential.Instance> {
        return this.vaultRepository.credentialInstance.getById(principal, id);
    }


    private values(instance: Vault.Credential.Instance): Vault.OAuth.Values {
        const parsed = Vault.OAuth.Values.safeParse(Encryption.decryptBlob(instance.blob));

        if (!parsed.success)
            throw new SystemError(SystemError.Code.CONFLICT, 'This credential was never connected; reconnect it');

        return parsed.data;
    }
}
