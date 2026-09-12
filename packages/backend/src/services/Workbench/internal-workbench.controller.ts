import { Controller, Get, Post, Param, UseGuards, HttpCode } from '@nestjs/common';
import { Workbench, Workflow } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { DelegateAuthGuard } from '@/auth/delegate-auth.guard';
import { AuthenticatedDelegate } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { WorkbenchSessionService } from './session.service';

import Session = Workbench.API.Session;

// A running execution reads and edits a workflow as itself; the execution token is the whole
// authorization, and the session is keyed on the execution behind it. Reads never hold the
// workflow; a hold spans begin to commit and the edited graph comes back whole.
@Controller('internal/workbench')
@UseGuards(DelegateAuthGuard)
export class InternalWorkbenchController {
    constructor(private readonly sessions: WorkbenchSessionService) {}

    @Get('workflows/:id/meta')
    getMeta(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
    ): Promise<Session.Meta.Response> {
        return this.sessions.readMeta(delegate, id);
    }

    @Post('workflows/:id/session')
    @HttpCode(200)
    beginTransaction(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
    ): Promise<Session.Begin.Response> {
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
        @ZodBody(Workbench.API.Session.Commit.Request) body: Session.Commit.Request,
    ): Promise<Session.Commit.Response> {
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
