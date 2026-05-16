import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Req, HttpCode } from '@nestjs/common';
import { VaultService } from './vault.service';
import { Vault } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';

@Controller('vault')
@UseGuards(SupabaseAuthGuard)
export class VaultController {
    constructor(private readonly vaultService: VaultService) {}

    @Get('credential-instances')
    async list(@Req() req: AuthenticatedRequest): Promise<Vault.API.CredentialInstance.List.Response> {
        return this.vaultService.credentialInstance.list(req.token);
    }

    @Post('credential-instances')
    @HttpCode(200)
    async create(
        @Req() req: AuthenticatedRequest,
        @Body() body: Vault.API.CredentialInstance.Create.Request,
    ): Promise<Vault.API.CredentialInstance.Create.Response> {
        return this.vaultService.credentialInstance.create(req.token, body);
    }

    @Delete('credential-instances/:id')
    async remove(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: Vault.Credential.Instance.Id,
    ): Promise<Vault.API.CredentialInstance.Remove.Response> {
        return this.vaultService.credentialInstance.remove(req.token, { id });
    }

    @Post('credential-instances/:id/reveal')
    @HttpCode(200)
    async reveal(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: Vault.Credential.Instance.Id,
    ): Promise<Vault.API.CredentialInstance.Reveal.Response> {
        return this.vaultService.credentialInstance.reveal(req.token, id);
    }

    @Patch('credential-instances/:id/name')
    async updateName(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: Vault.Credential.Instance.Id,
        @Body('name') name: string,
    ): Promise<Vault.API.CredentialInstance.UpdateName.Response> {
        return this.vaultService.credentialInstance.updateName(req.token, { id, name });
    }
}
