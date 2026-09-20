import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { Principal } from '@/domain/Principal';
import { createRedisSubscriber } from '@/utils/redis';
import { ActivePublicationRepository } from './active-publication.repository';

export type ActivePublicationChange =
    | { type: 'upserted'; publication: VersionControl.Publication }
    | { type: 'removed'; workflowId: Workflow.Id };

export type ActivePublicationListener = (
    change: ActivePublicationChange,
) => Promise<void> | void;

@Injectable()
export class ActivePublicationService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ActivePublicationService.name);
    private readonly redisSub = createRedisSubscriber('active-publication');
    private readonly publications = new Map<Workflow.Id, VersionControl.Publication>();
    private readonly listeners = new Set<ActivePublicationListener>();

    constructor(
        private readonly repository: ActivePublicationRepository,
    ) {}

    public get(workflowId: Workflow.Id): VersionControl.Publication | undefined {
        return this.publications.get(workflowId);
    }

    public list(): VersionControl.Publication[] {
        return [...this.publications.values()];
    }

    public subscribe(listener: ActivePublicationListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private async initializeRegistry(): Promise<void> {
        try {
            const publications = await this.repository.list(Principal.SELF);

            for (const publication of publications)
                this.publications.set(publication.workflow_id, publication);

            this.logger.log(`Registered ${publications.length} active publications`);
        }
        catch (error) {
            this.logger.error(`Failed to load active publications: ${(error as Error).message}`);
        }
    }

    private subscribeToSignals(): void {
        this.redisSub.psubscribe(VersionControl.Signal.PATTERN_CHANNEL, (error) => {
            if (error)
                this.logger.error(`psubscribe failed: ${error.message}`);
            else
                this.logger.log(`Subscribed to ${VersionControl.Signal.PATTERN_CHANNEL}`);
        });

        this.redisSub.on('pmessage', (_pattern, _channel, raw) => {
            let signal: VersionControl.Signal;

            try {
                signal = VersionControl.Signal.Schema.parse(JSON.parse(raw));
            }
            catch (error) {
                this.logger.warn(`Ignored malformed signal: ${(error as Error).message}`);
                return;
            }

            this.handleSignal(signal).catch(error =>
                this.logger.error(`Failed to handle signal for workflow ${signal.workflowId}: ${(error as Error).message}`),
            );
        });
    }

    private async handleSignal(signal: VersionControl.Signal): Promise<void> {
        switch (signal.type) {
            case 'published':
            case 'activated': {
                const publication = await this.repository.findByWorkflowId(Principal.SELF, signal.workflowId);

                if (publication)
                    await this.upsert(publication);
                else
                    await this.remove(signal.workflowId);
                break;
            }
            case 'deactivated':
            case 'removed':
                await this.remove(signal.workflowId);
                break;
        }
    }

    private async upsert(publication: VersionControl.Publication): Promise<void> {
        this.publications.set(publication.workflow_id, publication);
        await this.notify({ type: 'upserted', publication });
    }

    private async remove(workflowId: Workflow.Id): Promise<void> {
        if (!this.publications.delete(workflowId))
            return;

        await this.notify({ type: 'removed', workflowId });
    }

    private async notify(change: ActivePublicationChange): Promise<void> {
        const results = await Promise.allSettled(
            [...this.listeners].map(listener => listener(change)),
        );

        for (const result of results) {
            if (result.status === 'rejected')
                this.logger.error(`Active publication listener failed: ${String(result.reason)}`);
        }
    }

    public async onModuleInit(): Promise<void> {
        await this.initializeRegistry();
        this.subscribeToSignals();
    }

    public onModuleDestroy(): void {
        this.listeners.clear();
        this.redisSub.disconnect();
    }
}
