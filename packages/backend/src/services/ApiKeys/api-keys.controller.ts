import { Controller, Post, Get, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('api-keys')
@UseGuards(SupabaseAuthGuard)
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) {}

    @Post('create')
    @HttpCode(200)
    async create(
        @Req() req: AuthenticatedRequest,
        @ZodBody(ApiKey.API.Create.Request) body: ApiKey.API.Create.Request,
    ) {
        return this.apiKeysService.create(req.token, req.user.id, body);
    }

    @Get('list')
    async list(@Req() req: AuthenticatedRequest) {
        return this.apiKeysService.list(req.token);
    }

    @Post('revoke')
    @HttpCode(200)
    async revoke(
        @Req() req: AuthenticatedRequest,
        @ZodBody(ApiKey.API.Revoke.Request) body: ApiKey.API.Revoke.Request,
    ) {
        return this.apiKeysService.revoke(req.token, body);
    }
}
