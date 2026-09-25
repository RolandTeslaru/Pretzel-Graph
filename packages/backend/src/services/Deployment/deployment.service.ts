import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Deployment, VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { Principal } from '@/domain/Principal';
import { System } from '@pretzel-graph/shared/system';
import { DeploymentRepository } from './deployment.repository';
import { ListingService } from '../Listing/listing.service';
import { RealtimeService } from '../Realtime/realtime.service';

export type DeploymentChange =
    | { type: 'upserted'; deployment: VersionControl.Publication }
    | { type: 'removed'; workflowId: Workflow.Id };

export type DeploymentListener = (
    change: DeploymentChange,
) => Promise<void> | void;

@Injectable()
export class DeploymentService implements OnModuleInit, OnModuleDestroy {

    private readonly log          = System.log.withContext("Deployment");
    private unsubscribeFromSignals: (() => void) | null = null;

    private readonly deploymentsMap = new Map<Workflow.Id, VersionControl.Publication>();
    private readonly listeners      = new Set<DeploymentListener>();

    constructor(
        private readonly repository: DeploymentRepository,
        private readonly listings:   ListingService,
        private readonly realtime:   RealtimeService,
    ) {}

    public async list(principal: Principal.User): Promise<Deployment.API.List.Response> {
        const deployments = await this.repository.listMeta(principal);

        return { deployments };
    }

    public async get(principal: Principal.User, workflowId: Workflow.Id): Promise<Deployment.API.Get.Response> {
        const publication = await this.repository.getMeta(principal, workflowId);

        return { publication };
    }

    public async deployWorkflow(
        principal:  Principal.User,
        workflowId: Workflow.Id,
    ): Promise<Deployment.API.DeployWorkflow.Response> {
        const publication = await this.repository.deployLatest(principal, workflowId);

        await this.announceDeployed(publication);

        return { publication };
    }

    public async deployPublication(
        principal:     Principal.User,
        workflowId:    Workflow.Id,
        publicationId: VersionControl.Publication.Id,
    ): Promise<Deployment.API.DeployPublication.Response> {
        const publication = await this.repository.deploy(principal, workflowId, publicationId);

        await this.announceDeployed(publication);

        return { publication };
    }

    public async undeploy(
        principal:  Principal.User,
        workflowId: Workflow.Id,
    ): Promise<Deployment.API.Undeploy.Response> {
        const publication = await this.repository.undeploy(principal, workflowId);

        await this.announceUndeployed(publication.workflow_id, publication.id);

        return { publication };
    }

    // Also called once a deployed publication has been deleted.
    public async announceUndeployed(workflowId: Workflow.Id, publicationId: VersionControl.Publication.Id): Promise<void> {
        await this.listings.unshareWorkflow(workflowId);

        this.realtime.emitSignal<Deployment.Signal.Undeployed>({
            channel: Deployment.Signal.getChannel(workflowId, 'undeployed'),
            type: 'undeployed',
            workflowId,
            publicationId,
        });
    }

    private async announceDeployed(publication: VersionControl.Publication): Promise<void> {
        await this.listings.syncDeployed(publication);

        this.realtime.emitSignal<Deployment.Signal.Deployed>({
            channel: Deployment.Signal.getChannel(publication.workflow_id, 'deployed'),
            type: 'deployed',
            workflowId: publication.workflow_id,
            publicationId: publication.id,
        });
    }

    public getCached(workflowId: Workflow.Id): VersionControl.Publication | undefined {
        return this.deploymentsMap.get(workflowId);
    }

    public listCached(): VersionControl.Publication[] {
        return [...this.deploymentsMap.values()];
    }

    public subscribe(listener: DeploymentListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private async initializeCache(): Promise<void> {
        try {
            const publications = await this.repository.list(Principal.SELF);

            for (const publication of publications)
                this.deploymentsMap.set(publication.workflow_id, publication);

            this.log.info(`Cached ${publications.length} deployed publications`);
        }
        catch (error) {
            this.log.error(`Failed to load deployed publications: ${(error as Error).message}`);
        }
    }

    private subscribeToSignals(): void {
        this.unsubscribeFromSignals = this.realtime.psubscribe<Deployment.Signal>(
            Deployment.Signal.PATTERN_CHANNEL,
            Deployment.Signal.Schema,
            (signal) => {
                this.handleSignal(signal).catch(error =>
                    this.log.error(`Failed to handle signal for workflow ${signal.workflowId}: ${(error as Error).message}`),
                );
            },
        );
    }

    private async handleSignal(signal: Deployment.Signal): Promise<void> {
        switch (signal.type) {
            case 'deployed': {
                const publication = await this.repository.get(Principal.SELF, signal.workflowId);

                if (publication)
                    await this.upsert(publication);
                else
                    await this.remove(signal.workflowId);
                break;
            }
            case 'undeployed':
                await this.remove(signal.workflowId);
                break;
        }
    }

    private async upsert(publication: VersionControl.Publication): Promise<void> {
        this.deploymentsMap.set(publication.workflow_id, publication);
        await this.notify({ type: 'upserted', deployment: publication });
    }

    private async remove(workflowId: Workflow.Id): Promise<void> {
        if (!this.deploymentsMap.delete(workflowId))
            return;

        await this.notify({ type: 'removed', workflowId });
    }

    private async notify(change: DeploymentChange): Promise<void> {
        const results = await Promise.allSettled(
            [...this.listeners].map(listener => listener(change)),
        );

        for (const result of results) {
            if (result.status === 'rejected')
                this.log.error(`Deployment listener failed: ${String(result.reason)}`);
        }
    }

    public async onModuleInit(): Promise<void> {
        await this.initializeCache();
        this.subscribeToSignals();
    }

    public onModuleDestroy(): void {
        this.listeners.clear();
        this.unsubscribeFromSignals?.();
        this.unsubscribeFromSignals = null;
    }
}
