import { Injectable, Logger } from '@nestjs/common';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common/interfaces';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { resolveWebhook } from '@pretzel-graph/shared/utils';
import Redis from 'ioredis';
import { db, closeDb } from '@/utils/db';

@Injectable()
export class WorkflowRegistryService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(WorkflowRegistryService.name);
    private redisSub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

    // workflowId maps to active publication
    private readonly publicationsMap = new Map<Workflow.Id, VersionControl.Publication>();

    private toPublication(row: unknown): VersionControl.Publication {
        // A raw version_control row parses straight into the domain schema — same as the
        // backend's DB.VersionControl.toDomain. (Previously referenced Publication.Database.Row,
        // a namespace removed in an earlier refactor, which left this uncompilable.)
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
            const result = await db().query('select * from get_active_webhook_publications()');
            rows = result.rows;
        }
        catch (error) {
            this.logger.error(`Failed to hydrate registry: ${(error as Error).message}`);
            return;
        }

        const publications = rows.map((row: unknown) =>
            this.toPublication(row),
        );

        for (const publication of publications) {
            this.addPublication(publication);
        }

        this.logger.log(
            `Hydrated registry — ${publications.length} publications`,
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
            `Registered publication "${publication.name}" v${publication.version} (workflow: ${publication.workflow_id})\n` +
            (registeredPaths.length
                ? registeredPaths.map(p => `  → ${p}`).join('\n')
                : '  → (no webhook nodes)'),
        );
    }

    private removePublication(workflowId: Workflow.Id) {
        if (!this.publicationsMap.has(workflowId)) return;
        this.publicationsMap.delete(workflowId);
        this.logger.log(`Removed publication for workflow ${workflowId}`);
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
        await closeDb();
    }
}
