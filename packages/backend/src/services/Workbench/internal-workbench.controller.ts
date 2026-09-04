import { Controller, Get, Post, Param, UseGuards, HttpCode } from '@nestjs/common';
import { Workbench, Workflow } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { DelegateAuthGuard } from '@/auth/delegate-auth.guard';
import { AuthenticatedDelegate } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { WorkbenchSessionService } from './session.service';
import { WorkbenchService } from './workbench.service';

// A running execution holds and writes a workflow as itself; the execution token is the whole
// authorization, and the session is keyed on the execution behind it.
@Controller('internal/workbench')
@UseGuards(DelegateAuthGuard)
export class InternalWorkbenchController {
    constructor(
        private readonly sessions:  WorkbenchSessionService,
        private readonly workbench: WorkbenchService,
    ) {}

    @Get('workflows/:id')
    get(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
    ): Promise<Workbench.API.Session.Begin.Response> {
        return this.workbench.workflow.get(delegate, id);
    }

    @Post('workflows/:id/session')
    @HttpCode(200)
    beginTransaction(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
    ): Promise<Workbench.API.Session.Begin.Response> {
        return this.sessions.beginTransaction(delegate, id);
    }

    @Post('workflows/:id/session/heartbeat')
    @HttpCode(200)
    async heartbeat(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
    ): Promise<{}> {
        await this.sessions.heartbeat(delegate, id);
        return {};
    }

    @Post('workflows/:id/session/commit')
    @HttpCode(200)
    async commitTransaction(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
        @ZodBody(Workbench.API.Session.Commit.Request) body: Workbench.API.Session.Commit.Request,
    ): Promise<Workbench.API.Session.Commit.Response> {
        await this.sessions.commitTransaction(delegate, id, body.data);
        return {};
    }

    @Post('workflows/:id/session/abort')
    @HttpCode(200)
    async abortTransaction(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
    ): Promise<{}> {
        await this.sessions.abortTransaction(delegate, id);
        return {};
    }
}
