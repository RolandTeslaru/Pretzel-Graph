import { Injectable, Logger } from '@nestjs/common';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common/interfaces';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { Webhook } from '@pretzel-graph/shared/domain/Foundations/Webhook';
import Redis from 'ioredis';
import { createServiceClient } from '@/utils/supabase';

@Injectable()
export class WorkflowRegistryService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(WorkflowRegistryService.name);
    private redisSub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

    // workflowId maps to active publication
    private readonly publicationsMap = new Map<Workflow.Id, VersionControl.Publication>();
    // resolved webhook path maps to workflowId (for lookup)
    private readonly webhookPathMap = new Map<Webhook.Path, Workflow.Id>();

    // ─────────────────────────────────────────────────────────
    // Public lookup
    // ─────────────────────────────────────────────────────────

    public lookup(path: Webhook.Path): VersionControl.Publication | undefined {
        const workflowId = this.webhookPathMap.get(path);
        if (!workflowId) return undefined;
        return this.publicationsMap.get(workflowId);
    }

    // ─────────────────────────────────────────────────────────
    // Cache initialisation
    // ─────────────────────────────────────────────────────────

    public async initializeCache() {
        const supabase = createServiceClient();
        const { data, error } = await supabase.rpc('get_active_webhook_publications');

        if (error) {
            this.logger.error(`Failed to hydrate registry: ${error.message}`);
            return;
        }

        const publications = (data ?? []).map((row: VersionControl.Publication) =>
            VersionControl.Publication.Schema.parse(row),
        );

        for (const publication of publications) {
            this.addPublication(publication);
        }

        this.logger.log(
            `Hydrated registry — ${publications.length} publications, ${this.webhookPathMap.size} webhook routes`,
        );
    }

    // ─────────────────────────────────────────────────────────
    // Signal handling
    // ─────────────────────────────────────────────────────────

    private subscribeToSignals() {
        this.redisSub.psubscribe(VersionControl.Signal.PATTERN_CHANNEL, (err) => {
            if (err) this.logger.error(`psubscribe failed: ${err.message}`);
            else this.logger.log(`Subscribed to ${VersionControl.Signal.PATTERN_CHANNEL}`);
        });

        this.redisSub.on('pmessage', (_pattern, _channel, raw) => {
            try {
                const signal = VersionControl.Signal.Schema.parse(JSON.parse(raw));
                this.handleSignal(signal);
            } catch (e) {
                this.logger.warn(`Ignored malformed signal: ${(e as Error).message}`);
            }
        });
    }

    private handleSignal(signal: VersionControl.Signal) {
        switch (signal.type) {
            case 'published':
            case 'activated':
                // New active publication — replace any prior entries for this workflow.
                this.removePublication(signal.workflowId);
                this.addPublication(signal.publication);
                break;
            case 'deactivated':
            case 'removed':
                this.removePublication(signal.workflowId);
                break;
        }
    }

    // ─────────────────────────────────────────────────────────
    // Cache mutations
    // ─────────────────────────────────────────────────────────

    private addPublication(publication: VersionControl.Publication) {
        if (!publication.is_active) return;

        this.publicationsMap.set(publication.workflow_id, publication);

        const { workflow_data } = publication;
        for (const [nodeId, node] of Object.entries(workflow_data.nodes) as [
            Workflow.Node.Id,
            Workflow.Node,
        ][]) {
            if (!node.webhooks?.length) 
                continue;
            const staticValues = workflow_data.staticValues[nodeId] ?? {};
            
            for (const webhook of node.webhooks) {
                const resolvedWebhook = Webhook.resolve(webhook, node, staticValues);
                this.webhookPathMap.set(resolvedWebhook.path, publication.workflow_id);
            }
        }
    }

    private removePublication(workflowId: Workflow.Id) {
        const publication = this.publicationsMap.get(workflowId);
        if (!publication) return;

        for (const [path, owner] of this.webhookPathMap)
            if (owner === workflowId) 
                this.webhookPathMap.delete(path);

        this.publicationsMap.delete(workflowId);
    }

    // ─────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────

    async onModuleInit() {
        await this.initializeCache();
        this.subscribeToSignals();
    }

    async onModuleDestroy() {
        this.redisSub.disconnect();
    }
}
