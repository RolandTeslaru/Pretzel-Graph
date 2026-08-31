import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { SystemError, Vault } from '@pretzel-graph/shared/domain';

type Provider = Vault.OAuth.Provider;
type Client   = Vault.OAuth.Client;
type TokenSet = Vault.OAuth.TokenSet;

// What the token endpoint hands back, for either grant.
const TokenResponse = z.object({
    access_token:  z.string(),
    expires_in:    z.number(),
    refresh_token: z.string().optional(),
    scope:         z.string().optional(),
});

// The wire protocol with any OAuth2 provider. Knows nothing about the vault.
@Injectable()
export class OAuthProvider {

    private readonly logger = new Logger(OAuthProvider.name);


    public authorizeUrl(provider: Provider, clientId: string, redirectUri: string, state: string): string {
        const url = new URL(provider.authUrl);

        url.searchParams.set('client_id',     clientId);
        url.searchParams.set('redirect_uri',  redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('scope',         provider.scopes.join(provider.scopeSeparator));
        url.searchParams.set('state',         state);

        for (const [key, value] of Object.entries(provider.extraAuthParams ?? {}))
            url.searchParams.set(key, value);

        return url.toString();
    }


    public exchangeCode(provider: Provider, client: Client, code: string, redirectUri: string): Promise<TokenSet> {
        return this.token(provider, {
            grant_type:    'authorization_code',
            code,
            client_id:     client.clientId,
            client_secret: client.clientSecret,
            redirect_uri:  redirectUri,
        });
    }


    public refresh(
        provider: Provider,
        client: Client,
        refreshToken: string,
        instanceId: Vault.Credential.Instance.Id,
    ): Promise<TokenSet> {
        return this.token(provider, {
            grant_type:    'refresh_token',
            refresh_token: refreshToken,
            client_id:     client.clientId,
            client_secret: client.clientSecret,
        }, instanceId);
    }


    /** Something to name the connection by — an email, a display name, a login. */
    public async accountLabel(provider: Provider, accessToken: string): Promise<string | undefined> {
        if (!provider.userInfoUrl)
            return undefined;

        try {
            const response = await fetch(provider.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });

            if (!response.ok)
                return undefined;

            const info = await response.json() as { email?: string, name?: string, login?: string };

            return info.email ?? info.name ?? info.login;
        }
        catch {
            return undefined;
        }
    }


    /** Best effort — the caller is deleting either way. */
    public async revoke(provider: Provider, refreshToken: string): Promise<void> {
        if (!provider.revokeUrl)
            return;

        try {
            await fetch(provider.revokeUrl, {
                method:  'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body:    new URLSearchParams({ token: refreshToken }),
            });
        }
        catch (error) {
            this.logger.warn(`Revoke skipped: ${(error as Error).message}`);
        }
    }



    private async token(
        provider: Provider,
        params: Record<string, string>,
        instanceId?: Vault.Credential.Instance.Id,
    ): Promise<TokenSet> {
        const response = await fetch(provider.tokenUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body:    new URLSearchParams(params),
        });

        const body = await response.json().catch(() => ({})) as { error?: string, error_description?: string };

        if (response.status === 400 && body.error === 'invalid_grant')
            throw new SystemError(
                SystemError.Code.CONFLICT,
                'Access was revoked by the provider; reconnect the credential',
                { data: { reason: 'credential_revoked', instanceId } },
            );

        if (!response.ok)
            throw new SystemError(
                SystemError.Code.BAD_REQUEST,
                `Token request failed: ${body.error_description ?? body.error ?? response.status}`,
            );

        const token = TokenResponse.parse(body);

        return {
            accessToken:  token.access_token,
            refreshToken: token.refresh_token,
            expiresAt:    Date.now() + token.expires_in * 1000,
            scope:        token.scope,
        };
    }
}
