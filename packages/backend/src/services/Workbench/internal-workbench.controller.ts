import { Controller, Get, Post, Param, UseGuards, HttpCode } from '@nestjs/common';
import { Foundations, Workbench, Workflow } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { DelegateAuthGuard } from '@/auth/delegate-auth.guard';
import { AuthenticatedDelegate } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { WorkbenchSessionService } from './session.service';

import Session = Workbench.API.Session;

// A running execution reads and edits a workflow as itself; the execution token is the whole
// authorization, and the session is keyed on the execution behind it. Reads never hold the
// workflow; every write is one operation on the session's document.
@Controller('internal/workbench')
@UseGuards(DelegateAuthGuard)
export class InternalWorkbenchController {
    constructor(private readonly sessions: WorkbenchSessionService) {}

    @Get('workflows/:id')
    async getWorkflow(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
    ): Promise<Session.Workflow.Get.Response> {
        return Workbench.Operations.workflow.get(await this.sessions.read(delegate, id));
    }

    @Get('workflows/:id/nodes/:nodeId')
    async getNode(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
        @Param('nodeId') nodeId: Workflow.Node.Id,
    ): Promise<Session.Node.Get.Response> {
        return Workbench.Operations.node.get(await this.sessions.read(delegate, id), nodeId);
    }

    @Get('workflows/:id/nodes/:nodeId/fields/:fieldId')
    async getField(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
        @Param('nodeId') nodeId: Workflow.Node.Id,
        @Param('fieldId') fieldId: Foundations.Field.Id,
    ): Promise<Session.Field.Get.Response> {
        return Workbench.Operations.field.get(await this.sessions.read(delegate, id), nodeId, fieldId);
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
    ): Promise<Session.Commit.Response> {
        await this.sessions.commitTransaction(delegate, id);
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

    @Post('workflows/:id/session/node/create')
    @HttpCode(200)
    createNode(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
        @ZodBody(Workbench.API.Session.Node.Create.Request) body: Session.Node.Create.Request,
    ): Promise<unknown> {
        return this.sessions.apply(delegate, id, { op: 'node.create', ...body });
    }

    @Post('workflows/:id/session/node/delete')
    @HttpCode(200)
    deleteNode(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
        @ZodBody(Workbench.API.Session.Node.Delete.Request) body: Session.Node.Delete.Request,
    ): Promise<unknown> {
        return this.sessions.apply(delegate, id, { op: 'node.delete', ...body });
    }

    @Post('workflows/:id/session/edge/create')
    @HttpCode(200)
    createEdge(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
        @ZodBody(Workbench.API.Session.Edge.Create.Request) body: Session.Edge.Create.Request,
    ): Promise<unknown> {
        return this.sessions.apply(delegate, id, { op: 'edge.create', ...body });
    }

    @Post('workflows/:id/session/edge/delete')
    @HttpCode(200)
    deleteEdge(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
        @ZodBody(Workbench.API.Session.Edge.Delete.Request) body: Session.Edge.Delete.Request,
    ): Promise<unknown> {
        return this.sessions.apply(delegate, id, { op: 'edge.delete', ...body });
    }

    @Post('workflows/:id/session/field/set')
    @HttpCode(200)
    setField(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
        @ZodBody(Workbench.API.Session.Field.Set.Request) body: Session.Field.Set.Request,
    ): Promise<unknown> {
        return this.sessions.apply(delegate, id, { op: 'field.set', ...body });
    }

    @Post('workflows/:id/session/batch')
    @HttpCode(200)
    batch(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @Param('id') id: Workflow.Id,
        @ZodBody(Workbench.API.Session.Batch.Request) body: Session.Batch.Request,
    ): Promise<Session.Batch.Response> {
        return this.sessions.applyBatch(delegate, id, body.operations);
    }
}
