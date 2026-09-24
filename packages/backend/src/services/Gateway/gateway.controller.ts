import { Controller, Get, Post, Patch, Delete, Param, UseGuards, HttpCode } from '@nestjs/common';
import { Gateway } from '@pretzel-graph/shared/domain';
import { MemberAuthGuard } from '../../auth/member-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { GatewayService } from './gateway.service';

@Controller('gateway')
@UseGuards(MemberAuthGuard)
export class GatewayController {
    constructor(private readonly gatewayService: GatewayService) {}

    @Get('definitions')
    listDefinitions(): Gateway.API.Definition.List.Response {
        return this.gatewayService.definition.list();
    }

    @Get('connections')
    async listConnections(
        @AuthenticatedUser() principal: Principal.User,
    ): Promise<Gateway.API.Connection.List.Response> {
        return this.gatewayService.connection.list(principal);
    }

    @Post('connections')
    @HttpCode(200)
    async createConnection(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Gateway.API.Connection.Create.Request) body: Gateway.API.Connection.Create.Request,
    ): Promise<Gateway.API.Connection.Create.Response> {
        return this.gatewayService.connection.create(principal, body);
    }

    @Patch('connections/:id')
    async updateConnection(
        @AuthenticatedUser() principal: Principal.User,
        @Param('id') id: Gateway.Connection.Id,
        @ZodBody(Gateway.API.Connection.Update.Request.omit({ id: true })) body: Omit<Gateway.API.Connection.Update.Request, 'id'>,
    ): Promise<Gateway.API.Connection.Update.Response> {
        return this.gatewayService.connection.update(principal, { id, ...body });
    }

    @Delete('connections/:id')
    async deleteConnection(
        @AuthenticatedUser() principal: Principal.User,
        @Param('id') id: Gateway.Connection.Id,
    ): Promise<Gateway.API.Connection.Remove.Response> {
        return this.gatewayService.connection.delete(principal, id);
    }

    @Post('connections/:id/connect')
    @HttpCode(200)
    async connectSocket(
        @AuthenticatedUser() principal: Principal.User,
        @Param('id') id: Gateway.Connection.Id,
    ): Promise<Gateway.API.Connection.Connect.Response> {
        return this.gatewayService.socket.connect(principal, id);
    }

    @Post('connections/:id/disconnect')
    @HttpCode(200)
    async disconnectSocket(
        @AuthenticatedUser() principal: Principal.User,
        @Param('id') id: Gateway.Connection.Id,
    ): Promise<Gateway.API.Connection.Disconnect.Response> {
        return this.gatewayService.socket.disconnect(principal, id);
    }

    @Post('connections/:id/reconnect')
    @HttpCode(200)
    async reconnectSocket(
        @AuthenticatedUser() principal: Principal.User,
        @Param('id') id: Gateway.Connection.Id,
    ): Promise<Gateway.API.Connection.Reconnect.Response> {
        return this.gatewayService.socket.reconnect(principal, id);
    }
}
