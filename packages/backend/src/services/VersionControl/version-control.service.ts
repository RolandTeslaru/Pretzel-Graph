import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { VersionControl } from '@pretzel-graph/shared/domain';
import { RealtimeService } from '../Realtime/realtime.service';
import { VersionControlDatabase } from './version-control.database';

@Injectable()
export class VersionControlService {
    constructor(
        private readonly realtime: RealtimeService,
        private readonly database: VersionControlDatabase,
    ) {}

    async publish(
        token: string,
        payload: VersionControl.API.Publish.Request,
    ): Promise<VersionControl.API.Publish.Response> {
        const supabase = createAuthenticatedClient(token);
        const publication = await this.database.publish(supabase, payload);
        publication.is_active = true;
        this.realtime.emitSignal<VersionControl.Signal.Published>({
            channel: VersionControl.Signal.getChannel(publication.workflow_id, 'published'),
            type: 'published',
            workflowId: publication.workflow_id,
            publicationId: publication.id,
            publication,
        });
        return { publication };
    }

    async list(
        token: string,
        payload: VersionControl.API.List.Request,
    ): Promise<VersionControl.API.List.Response> {
        const supabase = createAuthenticatedClient(token);
        const publications = await this.database.list(supabase, payload);
        return { publications };
    }

    async listActiveWorkflows(
        token: string,
    ): Promise<VersionControl.API.ListActiveWorkflows.Response> {
        const supabase = createAuthenticatedClient(token);
        const activeWorkflows = await this.database.listActiveWorkflows(supabase);
        return { activeWorkflows };
    }

    async getActiveByWorkflow(
        token: string,
        payload: VersionControl.API.GetActiveByWorkflow.Request,
    ): Promise<VersionControl.API.GetActiveByWorkflow.Response> {
        const supabase = createAuthenticatedClient(token);
        const publication = await this.database.getActiveByWorkflow(supabase, payload);
        return { publication };
    }

    async get(
        token: string,
        payload: VersionControl.API.Get.Request,
    ): Promise<VersionControl.API.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        const publication = await this.database.get(supabase, payload);
        return { publication };
    }

    async activate(
        token: string,
        payload: VersionControl.API.Activate.Request,
    ): Promise<VersionControl.API.Activate.Response> {
        const supabase = createAuthenticatedClient(token);
        const publication = await this.database.activate(supabase, payload);
        this.realtime.emitSignal<VersionControl.Signal.Activated>({
            channel: VersionControl.Signal.getChannel(publication.workflow_id, 'activated'),
            type: 'activated',
            workflowId: publication.workflow_id,
            publicationId: publication.id,
            publication,
        });
        return { publication };
    }

    async deactivate(
        token: string,
        payload: VersionControl.API.Deactivate.Request,
    ): Promise<VersionControl.API.Deactivate.Response> {
        const supabase = createAuthenticatedClient(token);
        const publication = await this.database.deactivate(supabase, payload);
        this.realtime.emitSignal<VersionControl.Signal.Deactivated>({
            channel: VersionControl.Signal.getChannel(publication.workflow_id, 'deactivated'),
            type: 'deactivated',
            workflowId: publication.workflow_id,
            publicationId: publication.id,
        });
        return { publication };
    }

    async remove(
        token: string,
        payload: VersionControl.API.Remove.Request,
    ): Promise<VersionControl.API.Remove.Response> {
        const supabase = createAuthenticatedClient(token);
        const { workflowId } = await this.database.remove(supabase, payload);
        this.realtime.emitSignal<VersionControl.Signal.Removed>({
            channel: VersionControl.Signal.getChannel(workflowId, 'removed'),
            type: 'removed',
            workflowId,
            publicationId: payload.publicationId,
        });
        return { success: true, workflowId };
    }
}
