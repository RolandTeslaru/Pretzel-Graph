import { Controller, Get, Post, Delete, Patch, Param, UseGuards, HttpCode } from '@nestjs/common';
import { VaultService } from './vault.service';
import { Vault } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { CurrentUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { ZodBody, ZodStringBody } from '../../pipes/zod.pipe';

@Controller('vault')
@UseGuards(SupabaseAuthGuard)
export class VaultController {
    constructor(private readonly vaultService: VaultService) {}

    @Get('credential-templates/:id')
    getCredentialTemplate(
        @Param('id') id: Vault.Credential.Template.Id,
    ): Vault.API.CredentialTemplate.Get.Response {
        return this.vaultService.credentialTemplate.get(id);
    }

    @Post('credential-templates/getBatch')
    @HttpCode(200)
    getBatchCredentialTemplates(
        @ZodBody(Vault.API.CredentialTemplate.GetBatch.Request) body: Vault.API.CredentialTemplate.GetBatch.Request,
    ): Vault.API.CredentialTemplate.GetBatch.Response {
        return this.vaultService.credentialTemplate.getBatch(body);
    }

    @Get('credential-instances')
    async list(@CurrentUser() principal: Principal.User): Promise<Vault.API.CredentialInstance.List.Response> {
        return this.vaultService.credentialInstance.list(principal);
    }

    @Post('credential-instances')
    @HttpCode(200)
    async create(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Vault.API.CredentialInstance.Create.Request) body: Vault.API.CredentialInstance.Create.Request,
    ): Promise<Vault.API.CredentialInstance.Create.Response> {
        return this.vaultService.credentialInstance.create(principal, body);
    }

    @Delete('credential-instances/:id')
    async remove(
        @CurrentUser() principal: Principal.User,
        @Param('id') id: Vault.Credential.Instance.Id,
    ): Promise<Vault.API.CredentialInstance.Remove.Response> {
        return this.vaultService.credentialInstance.remove(principal, { id });
    }

    @Post('credential-instances/:id/reveal')
    @HttpCode(200)
    async reveal(
        @CurrentUser() principal: Principal.User,
        @Param('id') id: Vault.Credential.Instance.Id,
    ): Promise<Vault.API.CredentialInstance.Reveal.Response> {
        return this.vaultService.credentialInstance.reveal(principal, id);
    }

    @Patch('credential-instances/:id/name')
    async updateName(
        @CurrentUser() principal: Principal.User,
        @Param('id') id: Vault.Credential.Instance.Id,
        @ZodStringBody('name') name: string,
    ): Promise<Vault.API.CredentialInstance.UpdateName.Response> {
        return this.vaultService.credentialInstance.updateName(principal, { id, name });
    }

    @Patch('credential-instances/:id')
    async update(
        @CurrentUser() principal: Principal.User,
        @Param('id') id: Vault.Credential.Instance.Id,
        @ZodBody(Vault.API.CredentialInstance.Update.Request.omit({ id: true })) body: Omit<Vault.API.CredentialInstance.Update.Request, 'id'>,
    ): Promise<Vault.API.CredentialInstance.Update.Response> {
        return this.vaultService.credentialInstance.update(principal, { id, ...body });
    }
}
