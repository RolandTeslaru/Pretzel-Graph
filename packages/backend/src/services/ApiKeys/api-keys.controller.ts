import { Controller, Post, Get, UseGuards, HttpCode } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { CurrentUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('api-keys')
@UseGuards(SupabaseAuthGuard)
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) {}

    @Post('create')
    @HttpCode(200)
    async create(
        @CurrentUser() principal: Principal.User,
        @ZodBody(ApiKey.API.Create.Request) body: ApiKey.API.Create.Request,
    ) {
        return this.apiKeysService.create(principal, body);
    }

    @Get('list')
    async list(@CurrentUser() principal: Principal.User) {
        return this.apiKeysService.list(principal);
    }

    @Post('revoke')
    @HttpCode(200)
    async revoke(
        @CurrentUser() principal: Principal.User,
        @ZodBody(ApiKey.API.Revoke.Request) body: ApiKey.API.Revoke.Request,
    ) {
        return this.apiKeysService.revoke(principal, body);
    }
}
