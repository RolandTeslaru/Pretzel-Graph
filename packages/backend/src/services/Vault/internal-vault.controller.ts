import { Controller, Post, Param, UseGuards, HttpCode } from '@nestjs/common';
import { Vault } from '@pretzel-graph/shared/domain';
import { DelegateAuthGuard } from '@/auth/delegate-auth.guard';
import { AuthenticatedDelegate } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { OAuthService } from './OAuth/oauth.service';

// A running execution asks for tokens as itself; the execution token is the whole authorization.
@Controller('internal/vault')
@UseGuards(DelegateAuthGuard)
export class InternalVaultController {
    constructor(private readonly oauth: OAuthService) {}

    @Post('oauth/:id/access-token')
    @HttpCode(200)
    accessToken(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Vault.Credential.Instance.Id,
    ): Promise<Vault.API.OAuth.AccessToken.Response> {
        return this.oauth.getAccessToken(delegate, id);
    }
}
