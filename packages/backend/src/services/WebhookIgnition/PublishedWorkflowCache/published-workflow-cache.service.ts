import { Injectable, Logger } from '@nestjs/common';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common/interfaces';
import { createRedisClient, createRedisSubscriber } from '../../../utils/redis';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { resolveWebhook } from '@pretzel-graph/shared/utils';
import { sql } from 'kysely';
import { DB } from '@/db';

@Injectable()
export class PublishedWorkflowCacheService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PublishedWorkflowCacheService.name);
    private redisSub = createRedisSubscriber('published-workflow-cache');

    // workflowId maps to active publication
    private readonly publicationsMap = new Map<Workflow.Id, VersionControl.Publication>();

    private toPublication(row: unknown): VersionControl.Publication {
        // A raw version_control row parses straight into the domain schema.
        return VersionControl.Publication.Schema.parse(row);
    }

    // ─────────────────────────────────────────────────────────
    // Public lookup
    // ─────────────────────────────────────────────────────────

    public lookup(workflowId: Workflow.Id): VersionControl.Publication | undefined {
        return this.publicationsMap.get(workflowId);
    }

    // ─────────────────────────────────────────────────────────
    // Cache initialisation
    // ─────────────────────────────────────────────────────────

    public async initializeCache() {
        let rows: unknown[];

        try {
            // Active publications carrying at least one webhook node.
            rows = await DB.asService('load published workflows', (trx) =>
                trx
                    .selectFrom('version_control')
                    .selectAll()
                    .where('is_active', '=', true)
                    .where(sql<boolean>`exists (
                        select 1
                        from jsonb_each(workflow_data->'nodes') as n
                        where jsonb_typeof(n.value->'webhooks') = 'array'
                          and jsonb_array_length(n.value->'webhooks') > 0
                    )`)
                    .execute(),
            );
        }
        catch (error) {
            this.logger.error(`Failed to load published workflows: ${(error as Error).message}`);
            return;
        }

        const publications = rows.map((row: unknown) =>
            this.toPublication(row),
        );

        for (const publication of publications) {
            this.addPublication(publication);
        }

        this.logger.log(
            `Cached ${publications.length} published workflows`,
        );
    }

    // The active publication for one workflow; no acting user behind an inbound webhook.
    private async fetchActivePublication(workflowId: Workflow.Id): Promise<VersionControl.Publication | null> {
        const row = await DB.asService('load active publication', (trx) =>
            trx
                .selectFrom('version_control')
                .select(['id', 'workflow_id', 'version', 'name', 'description', 'workflow_meta', 'workflow_data', 'is_active', 'published_at'])
                .where('workflow_id', '=', workflowId)
                .where('is_active', '=', true)
                .orderBy('published_at', 'desc')
                .limit(1)
                .executeTakeFirst(),
        );

        return row ? this.toPublication(row) : null;
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
            let signal: VersionControl.Signal;
            try {
                signal = VersionControl.Signal.Schema.parse(JSON.parse(raw));
            } catch (e) {
                this.logger.warn(`Ignored malformed signal: ${(e as Error).message}`);
                return;
            }
            this.handleSignal(signal).catch(e =>
                this.logger.error(`Failed to handle signal for workflow ${signal.workflowId}: ${(e as Error).message}`),
            );
        });
    }

    private async handleSignal(signal: VersionControl.Signal) {
        switch (signal.type) {
            case 'published':
            case 'activated': {
                // The signal is only a nudge — re-read the authoritative row rather than trust
                // the wire. Replace any prior entry regardless; a re-read that finds nothing
                // (e.g. deactivated in the same instant) correctly leaves the workflow unregistered.
                this.removePublication(signal.workflowId);
                const publication = await this.fetchActivePublication(signal.workflowId);
                if (publication)
                    this.addPublication(publication);
                break;
            }
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
        const registeredPaths: string[] = [];

        for (const [nodeId, node] of Object.entries(workflow_data.nodes) as [
            Workflow.Node.Id,
            Workflow.Node.Raw,
        ][]) {
            // @ts-expect-error TODO: node.webhooks not defined yet
            if (!node.webhooks?.length)
                continue;
            const staticValues = workflow_data.staticValues[nodeId] ?? {};

            // @ts-expect-error TODO: node.webhooks not defined yet
            for (const webhook of node.webhooks) {
                const resolved = resolveWebhook(webhook, node, staticValues);
                registeredPaths.push(`[${resolved.method}] /${publication.workflow_id}/${resolved.path} (node: ${nodeId})`);
            }
        }

        this.logger.log(
            `Cached publication "${publication.name}" v${publication.version} (workflow: ${publication.workflow_id})\n` +
            (registeredPaths.length
                ? registeredPaths.map(p => `  → ${p}`).join('\n')
                : '  → (no webhook nodes)'),
        );
    }

    private removePublication(workflowId: Workflow.Id) {
        if (!this.publicationsMap.has(workflowId)) return;
        this.publicationsMap.delete(workflowId);
        this.logger.log(`Dropped publication for workflow ${workflowId}`);
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
