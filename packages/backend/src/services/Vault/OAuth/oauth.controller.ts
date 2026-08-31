import { Controller, Get, Post, Param, UseGuards, HttpCode } from '@nestjs/common';
import { Vault } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { MemberAuthGuard } from '@/auth/member-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { OAuthService } from './oauth.service';

@Controller('vault/oauth')
@UseGuards(MemberAuthGuard)
export class OAuthController {
    constructor(private readonly oauth: OAuthService) {}

    @Get('redirect-uri')
    redirectUri(): Vault.API.OAuth.RedirectUri.Response {
        return { redirectUri: this.oauth.redirectUri() };
    }

    @Post('start')
    @HttpCode(200)
    start(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Vault.API.OAuth.Start.Request) body: Vault.API.OAuth.Start.Request,
    ): Promise<Vault.API.OAuth.Start.Response> {
        return this.oauth.start(principal, body);
    }

    @Post(':id/reconnect')
    @HttpCode(200)
    reconnect(
        @AuthenticatedUser() principal: Principal.User,
        @Param('id') id: Vault.Credential.Instance.Id,
    ): Promise<Vault.API.OAuth.Reconnect.Response> {
        return this.oauth.reconnect(principal, id);
    }
}
