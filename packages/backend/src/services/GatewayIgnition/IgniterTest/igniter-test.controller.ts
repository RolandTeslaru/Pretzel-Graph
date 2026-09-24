import { Controller, ForbiddenException, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { DelegateAuthGuard } from '@/auth/delegate-auth.guard';
import { AuthenticatedDelegate } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { PermissionService } from '@/services/Permission/permission.service';
import { Gateway, Workflow } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { GatewayIgniterTestService } from './igniter-test.service';

// Internal: the caller is a node in a running draft, not a browser.
@Controller('gateway-test')
@UseGuards(DelegateAuthGuard)
export class GatewayIgniterTestController {

    constructor(
        private readonly ownership:     PermissionService,
        private readonly testListeners: GatewayIgniterTestService,
    ) {}

    @Post(':workflowId/register')
    @HttpCode(200)
    async register(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('workflowId') workflowIdRaw: string,
        @ZodBody(Gateway.Test.API.Register.Body) body: Gateway.Test.API.Register.Body,
    ): Promise<Gateway.Test.API.Register.Response> {
        const workflowId = Workflow.Id.parse(workflowIdRaw);

        // The guard proves the caller holds a valid execution token; it says nothing about the
        // workflow in the path.
        await this.ownership.assertDelegateWorkflow(delegate, workflowId);

        // Left unchecked, a running execution could park an event into someone else's node.
        if (body.executionId !== delegate.executionId)
            throw new ForbiddenException('Registration may only target the calling execution');

        await this.testListeners.register(workflowId, body);

        return { ok: true };
    }
}
