import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Execution, Gateway, Library, VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint';
import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import { System } from '@pretzel-graph/shared/system';
import type { ZodType } from 'zod';
import { DeploymentChange, DeploymentService } from '../Deployment/deployment.service';
import { ChatService } from '../Chat/chat.service';
import { ExecutionService } from '../Execution/execution.service';
import { ExecutionTracker } from '../Execution/execution.tracker';
import { GatewayService } from '../Gateway/gateway.service';
import { ShelfService } from '../Shelf/shelf.service';

// The node field naming its policy, and what a node that declares none falls back to.
const IGNITION_POLICY_FIELD = 'ignition_policy' as Field.Id;
const POLICY_DEFAULT: Gateway.Socket.IgnitionPolicy = 'every_event';

// A deployed node subscribed to a connection, with everything an event needs to be handled.
interface Listener {
    deployment:   VersionControl.Publication;
    nodeId:       Workflow.Node.Id;
    connectionId: Gateway.Connection.Id;
    fieldValues:  Record<Field.Id, Field.Value>;
    hooks:        Gateway.Socket.Hooks;
}

@Injectable()
export class GatewayIgnitionService implements OnModuleInit, OnModuleDestroy {
    private readonly log = System.log.withContext('GatewayIgnition');
    private readonly subscriptions = new Map<Workflow.Id, (() => void)[]>();

    // The run each conversation currently has in flight.
    private readonly activeFingerprints = new Map<Gateway.Socket.ScopeFingerprint, Execution.Id>();
    private unsubscribeFromSettled: (() => void) | null = null;
    private unsubscribeFromDeployments: (() => void) | null = null;

    constructor(
        private readonly deployments: DeploymentService,
        private readonly gateways: GatewayService,
        private readonly shelf: ShelfService,
        private readonly executions: ExecutionService,
        private readonly executionTracker: ExecutionTracker,
        private readonly chats: ChatService,
    ) {}

    public async onModuleInit(): Promise<void> {
        this.unsubscribeFromSettled = this.executionTracker.onSettled(executionId => this.releaseFingerprint(executionId));

        this.unsubscribeFromDeployments = this.deployments.subscribe(change =>
            this.handleDeploymentChange(change),
        );

        const deployments = this.deployments.listCached();
        const results = await Promise.allSettled(
            deployments.map(deployment => this.registerDeployment(deployment)),
        );

        for (const [index, result] of results.entries()) {
            if (result.status === 'rejected')
                this.log.error(
                    `Failed to register workflow ${deployments[index].workflow_id}: ${String(result.reason)}`,
                );
        }
    }

    public onModuleDestroy(): void {
        this.unsubscribeFromDeployments?.();
        this.unsubscribeFromDeployments = null;
        this.unsubscribeFromSettled?.();
        this.unsubscribeFromSettled = null;
        this.activeFingerprints.clear();

        for (const workflowId of this.subscriptions.keys())
            this.unregisterDeployment(workflowId);
    }

    private async handleDeploymentChange(change: DeploymentChange): Promise<void> {
        if (change.type === 'removed') {
            this.unregisterDeployment(change.workflowId);
            return;
        }

        await this.registerDeployment(change.deployment);
    }

    private async registerDeployment(deployment: VersionControl.Publication): Promise<void> {
        this.clearSubscriptions(deployment.workflow_id);

        const listeners: Listener[] = [];

        for (const node of Object.values(deployment.workflow_data.nodes)) {
            if (node.isDisabled)
                continue;

            const staticValues = deployment.workflow_data.staticValues[node.id] ?? {};
            const base = this.shelf.getBlueprint({ blueprintId: node.blueprintId }).blueprint;
            const blueprint = Blueprint.derive(base, staticValues).blueprint;

            const listener = blueprint.gatewayListener;

            if (!listener)
                continue;

            const hooks = await this.shelf.getGatewayHooks(node.blueprintId);

            if (!hooks)
                throw new Error(`Node ${node.blueprintId} declares a gateway listener but no gateway hooks`);

            const fieldValues = Field.mapValuesToIds(blueprint.fields, staticValues);

            const ref = fieldValues[listener.refFieldId];

            if (ref == null)
                continue;

            const connectionRef = Library.Ref.Connection.Schema.safeParse(ref);

            if (!connectionRef.success)
                throw new Error(`Node ${node.id} gateway listener does not reference a connection`);

            listeners.push({
                deployment,
                nodeId:       node.id,
                connectionId: connectionRef.data.id,
                fieldValues,
                hooks:        hooks as Gateway.Socket.Hooks,
            });
        }

        const unsubscribers = listeners.map(listener =>
            this.gateways.connection.subscribe(listener.connectionId, event => {
                void this.handleSocketEvent(listener, event).catch(error =>
                    this.log.error(
                        `Gateway event failed for workflow ${deployment.workflow_id} node ${listener.nodeId}: ${String(error)}`,
                    ),
                );
            }),
        );

        if (unsubscribers.length)
            this.subscriptions.set(deployment.workflow_id, unsubscribers);

        this.log.info(
            `Registered ${unsubscribers.length} gateway listeners for workflow ${deployment.workflow_id}`,
        );
    }

    private unregisterDeployment(workflowId: Workflow.Id): void {
        this.clearSubscriptions(workflowId);
    }

    private clearSubscriptions(workflowId: Workflow.Id): void {
        const unsubscribers = this.subscriptions.get(workflowId);

        if (!unsubscribers)
            return;

        for (const unsubscribe of unsubscribers)
            unsubscribe();

        this.subscriptions.delete(workflowId);
    }

    private async handleSocketEvent(listener: Listener, event: Gateway.Socket.Event): Promise<void> {
        const parsed = listener.hooks.schema.safeParse(event);

        if (!parsed.success)
            return;

        const context = this.createContext(listener);

        if (!context)
            return;

        // Fingerprinted once, so the filter, the recorder, the policy and the igniter agree. A node
        // that fingerprints nothing still needs a slot of its own to serialise against.
        const scopeFingreprint = listener.hooks.scope?.(parsed.data, context)
            ?? Gateway.Socket.createScope(context.definition.provider, listener.connectionId, 'node', listener.nodeId);

        if (!listener.hooks.filter(parsed.data, scopeFingreprint, context))
            return;

        try {
            await listener.hooks.recorder?.(parsed.data, scopeFingreprint, context);
        }
        catch (error) {
            this.log.error(`Recorder for node ${listener.nodeId} failed: ${(error as Error).message}`);
        }

        const policy = Gateway.Socket.IgnitionPolicy.catch(POLICY_DEFAULT)
            .parse(listener.fieldValues[IGNITION_POLICY_FIELD]);

        if (!this.admits(policy, scopeFingreprint))
            return;

        const igniterProps = await listener.hooks.igniter?.(parsed.data, scopeFingreprint, context) ?? {};

        const igniter: Execution.Igniter = {
            variant: 'gateway_event',
            nodeId: listener.nodeId,
            payload: Gateway.Socket.Event.parse(parsed.data),
            ...igniterProps,
        };

        const { execution } = await this.executions.runFromService({
            workflowId: listener.deployment.workflow_id,
            workflowData: listener.deployment.workflow_data,
            igniter,
        }, 'gateway');

        // Claimed before the await returns, so a second event cannot slip in behind this one.
        if (policy !== 'every_event')
            this.activeFingerprints.set(scopeFingreprint, execution.id);

        this.log.info(
            `Triggered workflow=${listener.deployment.workflow_id} deployment=${listener.deployment.id} executionId=${execution.id}`,
        );
    }


    /**
     * Whether this event may start a run now, given what the fingerprint already has in flight.
     *
     * Discarding loses nothing when the node records: the run that does happen reads the messages
     * this one skipped.
     */
    private admits(
        policy: Gateway.Socket.IgnitionPolicy,
        scope:  Gateway.Socket.ScopeFingerprint,
    ): boolean {
        if (policy === 'every_event')
            return true;

        const running = this.activeFingerprints.get(scope);

        if (running === undefined)
            return true;

        if (!this.executionTracker.isActive(running)) {
            this.activeFingerprints.delete(scope);
            return true;
        }

        return false;
    }


    // A run settled, so the next event on that conversation may start one.
    private releaseFingerprint(executionId: Execution.Id): void {
        for (const [scope, running] of this.activeFingerprints) {
            if (running === executionId) {
                this.activeFingerprints.delete(scope);
                return;
            }
        }
    }


    // What the hooks read. Null once the connection's socket is gone, which
    // is also when there is nothing left to handle.
    private createContext(listener: Listener): Gateway.Socket.Context | null {
        const connection = this.gateways.connection.getOpen(listener.connectionId);

        if (!connection)
            return null;

        return {
            fieldValues: listener.fieldValues as never,
            connection,
            definition:  this.gateways.definition.get(connection.definitionId),
            chatAPI: {
                append: (externalKey, messages) =>
                    this.chats.appendByExternalKey(listener.deployment.workflow_id, externalKey, messages),
                findIdByExternalKey: externalKey =>
                    this.chats.findIdByExternalKey(listener.deployment.workflow_id, externalKey),
            },
            log: message => this.log.info(message),
        };
    }

}
