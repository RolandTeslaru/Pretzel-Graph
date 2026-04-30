import { Injectable, Logger, NotFoundException, MethodNotAllowedException } from '@nestjs/common';
import { Execution, VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { resolveWebhook } from '@pretzel-graph/shared/utils';
import { Webhook } from '@pretzel-graph/shared/domain/Webhook';
import { WorkflowRegistryService } from '../WorkflowRegistry/workflow-registry.service';
import { ApiService } from '../Api/api.service';

export interface InboundRequest {
    workflowId: Webhook.WorkflowId;
    method: Webhook.Method;
    path: Webhook.Path;
    headers: Record<string, unknown>;
    query: Record<string, unknown>;
    body: unknown;
}

@Injectable()
export class WebhookIgniterService {
    private readonly logger = new Logger(WebhookIgniterService.name);

    constructor(
        private readonly registry: WorkflowRegistryService,
        private readonly api: ApiService,
    ) {}

    async handle(req: InboundRequest): Promise<unknown> {
        const publication = this.registry.lookup(req.workflowId as unknown as Workflow.Id);
        if (!publication) {
            throw new NotFoundException(`No active webhook registered for workflow ${req.workflowId}`);
        }

        const match = this.findWebhookNode(publication, req.path, req.method);
        if (!match) {
            throw new MethodNotAllowedException(
                `Method ${req.method} not allowed on ${req.path}`,
            );
        }

        const igniter: Execution.Igniter = {
            variant: "webhook",
            nodeId: match.nodeId as Workflow.Node.Id,
            payload: {
                method: req.method,
                path: req.path,
                headers: req.headers,
                query: req.query,
                body: req.body,
            },
        };

        const payload: Execution.API.Run.InternalRequest = {
            workflowId: publication.workflow_id,
            workflowData: publication.workflow_data,
            igniter,
        };

        const { execution } = await Execution.API.runInternal(this.api.client, payload); 

        this.logger.log(
            `Triggered workflow=${publication.workflow_id} publication=${publication.id} executionId=${execution.id}`,
        );

        return { execution };
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
                const resolved = resolveWebhook(webhook, node, staticValues);
                if (resolved.path === path && resolved.method === method) {
                    return { nodeId, webhook: resolved };
                }
            }
        }
        return undefined;
    }
}
