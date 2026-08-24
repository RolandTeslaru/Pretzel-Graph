import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { DB } from '@/db';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { RealtimeService } from '../Realtime/realtime.service';
import { VersionControlDatabase } from './version-control.database';
import { ListingService } from '../Listing/listing.service';

@Injectable()
export class VersionControlService {
    constructor(
        private readonly realtime: RealtimeService,
        private readonly database: VersionControlDatabase,
        private readonly listings: ListingService,
    ) {}

    async publish(
        principal:  Principal.User,
        workflowId: Workflow.Id,
        payload:    VersionControl.API.Publish.Request,
    ): Promise<VersionControl.API.Publish.Response> {

        const publication = await DB.asUser(principal, 
            (trx) => this.database.publish(trx, principal.userId, workflowId, payload)
        );
        
        publication.is_active = true;
        await this.listings.syncActive(principal, workflowId);
        this.realtime.emitSignal<VersionControl.Signal.Published>({
            channel: VersionControl.Signal.getChannel(publication.workflow_id, 'published'),
            type: 'published',
            workflowId: publication.workflow_id,
            publicationId: publication.id,
        });
        return { publication };
    }

    async list(
        principal: Principal.User,
        workflowId: Workflow.Id,
    ): Promise<VersionControl.API.List.Response> {
        const publications = await DB.asUser(principal, 
            (trx) => this.database.list(trx, workflowId)
        );

        return { publications };
    }

    async listActiveWorkflows(
        principal: Principal.User,
    ): Promise<VersionControl.API.ListActiveWorkflows.Response> {
        const activeWorkflows = await DB.asUser(principal, 
            (trx) => this.database.listActiveWorkflows(trx)
        );
        
        return { activeWorkflows };
    }

    async getActiveByWorkflow(
        principal: Principal.User,
        workflowId: Workflow.Id,
    ): Promise<VersionControl.API.GetActiveByWorkflow.Response> {
        const publication = await DB.asUser(principal, (trx) => this.database.getActiveByWorkflow(trx, workflowId));
        return { publication };
    }

    async get(
        principal: Principal.User,
        publicationId: VersionControl.Publication.Id,
    ): Promise<VersionControl.API.Get.Response> {
        const publication = await DB.asUser(principal, (trx) => this.database.get(trx, publicationId));
        return { publication };
    }

    async activate(
        principal: Principal.User,
        publicationId: VersionControl.Publication.Id,
    ): Promise<VersionControl.API.Activate.Response> {
        const publication = await DB.asUser(principal, (trx) => this.database.activate(trx, publicationId));
        await this.listings.syncActive(principal, publication.workflow_id);
        this.realtime.emitSignal<VersionControl.Signal.Activated>({
            channel: VersionControl.Signal.getChannel(publication.workflow_id, 'activated'),
            type: 'activated',
            workflowId: publication.workflow_id,
            publicationId: publication.id,
        });
        return { publication };
    }

    async deactivate(
        principal: Principal.User,
        publicationId: VersionControl.Publication.Id,
    ): Promise<VersionControl.API.Deactivate.Response> {
        const publication = await DB.asUser(principal, (trx) => this.database.deactivate(trx, publicationId));
        await this.listings.syncActive(principal, publication.workflow_id);
        this.realtime.emitSignal<VersionControl.Signal.Deactivated>({
            channel: VersionControl.Signal.getChannel(publication.workflow_id, 'deactivated'),
            type: 'deactivated',
            workflowId: publication.workflow_id,
            publicationId: publication.id,
        });
        return { publication };
    }

    async remove(
        principal: Principal.User,
        publicationId: VersionControl.Publication.Id,
    ): Promise<VersionControl.API.Remove.Response> {
        const { workflowId, wasActive } = await DB.asUser(principal, (trx) => this.database.remove(trx, publicationId));
        if (wasActive)
            await this.listings.syncActive(principal, workflowId);
        this.realtime.emitSignal<VersionControl.Signal.Removed>({
            channel: VersionControl.Signal.getChannel(workflowId, 'removed'),
            type: 'removed',
            workflowId,
            publicationId,
        });
        return { success: true, workflowId };
    }
}
