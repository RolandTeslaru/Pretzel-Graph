import { Injectable, Logger, NotFoundException, MethodNotAllowedException } from '@nestjs/common';
import { ExecutionSession, Orchestrator, VersionControl } from '@vx-agent-editor/shared/domain';
import { Webhook } from '@vx-agent-editor/shared/domain/Foundations/Webhook';
import { WorkflowRegistryService } from '../WorkflowRegistry/workflow-registry.service';
import { ApiService } from '../Api/api.service';

export interface InboundRequest {
    method: Webhook.Method;
    path: Webhook.Path;
    headers: Record<string, unknown>;
    query: Record<string, unknown>;
    body: unknown;
}

@Injectable()
export class TriggerService {
    private readonly logger = new Logger(TriggerService.name);

    constructor(
        private readonly registry: WorkflowRegistryService,
        private readonly api: ApiService,
    ) {}

    async handle(req: InboundRequest): Promise<unknown> {
        const publication = this.registry.lookup(req.path);
        if (!publication) {
            throw new NotFoundException(`No active webhook registered at path ${req.path}`);
        }

        const match = this.findWebhookNode(publication, req.path, req.method);
        if (!match) {
            throw new MethodNotAllowedException(
                `Method ${req.method} not allowed on ${req.path}`,
            );
        }

        const executionSession = ExecutionSession.Schema.parse({});

        const payload: Orchestrator.API.Run.InternalRequest = {
            workflowId: publication.workflow_id,
            workflowData: publication.workflow_data,
            executionSession,
        };

        const { jobId, success } = await Orchestrator.API.runInternal(this.api.client, payload); 

        this.logger.log(
            `Triggered workflow=${publication.workflow_id} publication=${publication.id} jobId=${jobId}`,
        );

        return { jobId, success };
    }

    private findWebhookNode(
        publication: VersionControl.Publication,
        path: Webhook.Path,
        method: Webhook.Method,
    ) {
        for (const [nodeId, node] of Object.entries(publication.workflow_data.nodes)) {
            if (!node.webhooks?.length) continue;
            const staticValues = publication.workflow_data.staticValues[node.id] ?? {};
            for (const webhook of node.webhooks) {
                const resolved = Webhook.resolve(webhook, node, staticValues);
                if (resolved.path === path && resolved.method === method) {
                    return { nodeId, webhook: resolved };
                }
            }
        }
        return undefined;
    }
}
