import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { RealtimeService } from '../Realtime/realtime.service';
import { VersionControlRepository } from './version-control.repository';
import { DeploymentService } from '../Deployment/deployment.service';

@Injectable()
export class VersionControlService {
    constructor(
        private readonly realtime:    RealtimeService,
        private readonly repository:  VersionControlRepository,
        private readonly deployments: DeploymentService,
    ) {}

    async publish(
        principal:  Principal.User,
        workflowId: Workflow.Id,
        payload:    VersionControl.API.Publish.Request,
    ): Promise<VersionControl.API.Publish.Response> {

        const publication = await this.repository.publish(principal, workflowId, payload);

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
        const publications = await this.repository.list(principal, workflowId);

        return { publications };
    }

    async get(
        principal: Principal.User,
        publicationId: VersionControl.Publication.Id,
    ): Promise<VersionControl.API.Get.Response> {
        const publication = await this.repository.get(principal, publicationId);
        return { publication };
    }

    async remove(
        principal: Principal.User,
        publicationId: VersionControl.Publication.Id,
    ): Promise<VersionControl.API.Remove.Response> {
        const { workflowId, wasDeployed } = await this.repository.remove(principal, publicationId);
        if (wasDeployed)
            await this.deployments.announceUndeployed(workflowId, publicationId);
        this.realtime.emitSignal<VersionControl.Signal.Removed>({
            channel: VersionControl.Signal.getChannel(workflowId, 'removed'),
            type: 'removed',
            workflowId,
            publicationId,
        });
        return { success: true, workflowId };
    }
}
