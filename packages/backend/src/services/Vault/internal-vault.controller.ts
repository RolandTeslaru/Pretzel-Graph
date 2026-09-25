import { Controller, Post, Param, UseGuards, HttpCode } from '@nestjs/common';
import { Vault } from '@pretzel-graph/shared/domain';
import { DelegateAuthGuard } from '@/auth/delegate-auth.guard';
import { AuthenticatedDelegate } from '@/decorators/principal';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { Principal } from '@/domain/Principal';
import { OAuthService } from './OAuth/oauth.service';
import { VaultService } from './vault.service';

// A running execution asks for tokens as itself; the execution token is the whole authorization.
@Controller('internal/vault')
@UseGuards(DelegateAuthGuard)
export class InternalVaultController {
    constructor(
        private readonly oauth: OAuthService,
        private readonly vault: VaultService,
    ) {}

    @Post('credential-instances/query')
    @HttpCode(200)
    query(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @ZodBody(Vault.API.Internal.Query.Request) body: Vault.API.Internal.Query.Request,
    ): Promise<Vault.API.Internal.Query.Response> {
        return this.vault.credentialInstance.query(delegate, body);
    }

    @Post('oauth/:id/access-token')
    @HttpCode(200)
    accessToken(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Vault.Credential.Instance.Id,
    ): Promise<Vault.API.OAuth.AccessToken.Response> {
        return this.oauth.getAccessToken(delegate, id);
    }
}
