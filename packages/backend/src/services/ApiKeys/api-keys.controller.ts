import { Controller, Post, Get, UseGuards, HttpCode } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from '@pretzel-graph/shared/domain';
import { MemberAuthGuard } from '../../auth/member-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';

@Controller('api-keys')
@UseGuards(MemberAuthGuard)
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) {}

    @Post('create')
    @HttpCode(200)
    async create(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(ApiKey.API.Create.Request) body: ApiKey.API.Create.Request,
    ) {
        return this.apiKeysService.create(principal, body);
    }

    @Get('list')
    async list(@AuthenticatedUser() principal: Principal.User) {
        return this.apiKeysService.list(principal);
    }

    @Post('revoke')
    @HttpCode(200)
    async revoke(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(ApiKey.API.Revoke.Request) body: ApiKey.API.Revoke.Request,
    ) {
        return this.apiKeysService.revoke(principal, body);
    }
}
