import { Injectable, NotFoundException, MethodNotAllowedException } from '@nestjs/common';
import { Execution, VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { resolveWebhook } from '@pretzel-graph/shared/utils';
import { Webhook } from '@pretzel-graph/shared/domain/Webhook';
import { DeploymentService } from '../../Deployment/deployment.service';
import { ExecutionService } from '../../Execution/execution.service';
import { ShelfService } from '../../Shelf/shelf.service';
import { System } from '@pretzel-graph/shared/system';

export interface InboundRequest {
    workflowId: Webhook.WorkflowId;
    method: Webhook.Method;
    path: Webhook.Path;
    headers: Record<string, unknown>;
    query: Record<string, unknown>;
    body: unknown;
}

@Injectable()
export class IgniterService {
    private readonly log = System.log.withContext("Igniter");

    constructor(
        private readonly deployments: DeploymentService,
        private readonly executions: ExecutionService,
        private readonly shelf: ShelfService,
    ) {}

    async handle(req: InboundRequest): Promise<unknown> {
        const deployment = this.deployments.getCached(req.workflowId as unknown as Workflow.Id);
        if (!deployment) {
            throw new NotFoundException(`No deployed webhook registered for workflow ${req.workflowId}`);
        }

        const match = this.findWebhookNode(deployment, req.path, req.method);
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
            workflowId: deployment.workflow_id,
            workflowData: deployment.workflow_data,
            igniter,
        };

        const { execution } = await this.executions.runFromService(payload, 'webhook');

        this.log.info(
            `Triggered workflow=${deployment.workflow_id} publication=${deployment.id} executionId=${execution.id}`,
        );

        // The sender gets an acknowledgement and an id to quote, nothing more —
        // the execution's contents are not the caller's to see.
        return { executionId: execution.id };
    }

    private findWebhookNode(
        publication: VersionControl.Publication,
        path: Webhook.Path,
        method: Webhook.Method,
    ) {
        for (const [nodeId, node] of Object.entries(publication.workflow_data.nodes)) {
            const blueprint = this.shelf.getBlueprint({ blueprintId: node.blueprintId }).blueprint;
            if (!blueprint.webhooks?.length) continue;
            const staticValues = publication.workflow_data.staticValues[node.id] ?? {};
            for (const webhook of blueprint.webhooks) {
                const resolved = resolveWebhook(webhook, node, staticValues);
                if (resolved.path === path && resolved.method === method) {
                    return { nodeId, webhook: resolved };
                }
            }
        }
        return undefined;
    }
}
