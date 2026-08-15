import { Controller, ForbiddenException, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { DelegateAuthGuard } from '@/auth/delegate-auth.guard';
import { AuthenticatedDelegate } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { PermissionService } from '@/services/Permission/permission.service';
import { Webhook } from '@pretzel-graph/shared/domain/Webhook';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { IgniterTestService } from '../WebhookIgnition/IgniterTest/igniter-test.service';

// Named outside the `webhook` and `webhook-test` namespaces: those are served at the
// root, and this is an internal API route.
@Controller('test-webhooks')
@UseGuards(DelegateAuthGuard)
export class WebhookTestController {

    constructor(
        private readonly ownership: PermissionService,
        private readonly testWebhooks: IgniterTestService,
    ) {}

    @Post(':workflowId/register')
    @HttpCode(200)
    async register(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('workflowId') workflowIdRaw: string,
        @ZodBody(Webhook.Test.API.Register.Body) body: Webhook.Test.API.Register.Body,
    ) {
        const workflowId = Webhook.WorkflowId.parse(workflowIdRaw);

        // The guard proves the caller holds a valid execution token; it says nothing
        // about the workflow in the path. Without this, any running execution could
        // register a test route against someone else's workflow.
        await this.ownership.assertDelegateWorkflow(delegate, workflowId);

        // The body names the execution the answer will be delivered to. Left unchecked, a
        // running execution could register a route that fires a payload into someone else's
        // parked node — so it may only ever name itself.
        if (body.executionId !== delegate.executionId)
            throw new ForbiddenException('Registration may only target the calling execution');

        this.testWebhooks.register(
            body.path, body.method, workflowId, body.timeoutMs, body.executionId, body.consultationId,
        );

        return { ok: true };
    }
}
