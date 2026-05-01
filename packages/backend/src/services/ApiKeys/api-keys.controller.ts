import { Controller, Post, Get, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';

@Controller('api-keys')
@UseGuards(SupabaseAuthGuard)
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) {}

    @Post('create')
    @HttpCode(200)
    async create(@Req() req: AuthenticatedRequest, @Body() body: ApiKey.API.Create.Request) {
        const payload = ApiKey.API.Create.Request.parse(body);
        return this.apiKeysService.create(req.token, req.user.id, payload);
    }

    @Get('list')
    async list(@Req() req: AuthenticatedRequest) {
        return this.apiKeysService.list(req.token);
    }

    @Post('revoke')
    @HttpCode(200)
    async revoke(@Req() req: AuthenticatedRequest, @Body() body: ApiKey.API.Revoke.Request) {
        const payload = ApiKey.API.Revoke.Request.parse(body);
        return this.apiKeysService.revoke(req.token, payload);
    }
}
