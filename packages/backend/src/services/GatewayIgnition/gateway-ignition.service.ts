import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Execution, Gateway, Library, VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint';
import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import { System } from '@pretzel-graph/shared/system';
import type { ZodType } from 'zod';
import {
    ActivePublicationChange,
    ActivePublicationService,
} from '../ActivePublication/active-publication.service';
import { ExecutionService } from '../Execution/execution.service';
import { GatewayService } from '../Gateway/gateway.service';
import { ShelfService } from '../Shelf/shelf.service';

interface Registration {
    publication: VersionControl.Publication;
    nodeId:      Workflow.Node.Id;
    schema:      ZodType;
    filter:      (
        event: unknown,
        context: { fieldValues: Record<Field.Id, Field.Value> },
    ) => boolean;
    fieldValues: Record<Field.Id, Field.Value>;
}

interface PendingRegistration {
    connectionId: Gateway.Connection.Id;
    registration: Registration;
}

@Injectable()
export class GatewayIgnitionService implements OnModuleInit, OnModuleDestroy {
    private readonly log = System.log.withContext('GatewayIgnition');
    private readonly subscriptions = new Map<Workflow.Id, (() => void)[]>();
    private readonly registrationGenerations = new Map<Workflow.Id, number>();
    private nextRegistrationGeneration = 0;
    private unsubscribeFromPublications: (() => void) | null = null;

    constructor(
        private readonly activePublications: ActivePublicationService,
        private readonly gateways: GatewayService,
        private readonly shelf: ShelfService,
        private readonly executions: ExecutionService,
    ) {}

    public async onModuleInit(): Promise<void> {
        this.unsubscribeFromPublications = this.activePublications.subscribe(change =>
            this.handlePublicationChange(change),
        );

        const publications = this.activePublications.list();
        const results = await Promise.allSettled(
            publications.map(publication => this.register(publication)),
        );

        for (const [index, result] of results.entries()) {
            if (result.status === 'rejected')
                this.log.error(
                    `Failed to register workflow ${publications[index].workflow_id}: ${String(result.reason)}`,
                );
        }
    }

    public onModuleDestroy(): void {
        this.unsubscribeFromPublications?.();
        this.unsubscribeFromPublications = null;
        this.registrationGenerations.clear();

        for (const workflowId of this.subscriptions.keys())
            this.unregister(workflowId);
    }

    private async handlePublicationChange(change: ActivePublicationChange): Promise<void> {
        if (change.type === 'removed') {
            this.unregister(change.workflowId);
            return;
        }

        await this.register(change.publication);
    }

    private async register(publication: VersionControl.Publication): Promise<void> {
        const generation = ++this.nextRegistrationGeneration;

        this.registrationGenerations.set(publication.workflow_id, generation);
        this.clearSubscriptions(publication.workflow_id);

        const pending: PendingRegistration[] = [];

        for (const node of Object.values(publication.workflow_data.nodes)) {
            if (node.isDisabled)
                continue;

            const staticValues = publication.workflow_data.staticValues[node.id] ?? {};
            const base = this.shelf.getBlueprint({ blueprintId: node.blueprintId }).blueprint;
            const blueprint = Blueprint.derive(base, staticValues).blueprint;

            if (!blueprint.gatewayListeners?.length)
                continue;

            const filters = await this.shelf.getGatewayFilters(node.blueprintId);

            if (!filters)
                throw new Error(`Node ${node.blueprintId} declares gateway listeners but no gateway filters`);

            const fieldValues = Field.mapValuesToIds(blueprint.fields, staticValues);

            for (const listener of blueprint.gatewayListeners) {
                const filter = filters.filters[listener.filter];

                if (!filter)
                    throw new Error(
                        `Node ${node.blueprintId} gateway listener ${listener.id} names missing filter ${listener.filter}`,
                    );

                const ref = fieldValues[listener.refFieldId];

                if (ref == null)
                    continue;

                const connectionRef = Library.Ref.Connection.Schema.safeParse(ref);

                if (!connectionRef.success)
                    throw new Error(
                        `Node ${node.id} gateway listener ${listener.id} does not reference a connection`,
                    );

                pending.push({
                    connectionId: connectionRef.data.id,
                    registration: {
                        publication,
                        nodeId: node.id,
                        schema: filters.schema,
                        filter: filter as Registration['filter'],
                        fieldValues,
                    },
                });
            }
        }

        // A newer publication change or removal won while node classes were loading.
        if (this.registrationGenerations.get(publication.workflow_id) !== generation)
            return;

        const unsubscribers = pending.map(({ connectionId, registration }) =>
            this.gateways.connection.subscribe(connectionId, event => {
                void this.handle(registration, event).catch(error =>
                    this.log.error(
                        `Gateway event failed for workflow ${publication.workflow_id} node ${registration.nodeId}: ${String(error)}`,
                    ),
                );
            }),
        );

        if (unsubscribers.length)
            this.subscriptions.set(publication.workflow_id, unsubscribers);

        this.registrationGenerations.delete(publication.workflow_id);

        this.log.info(
            `Registered ${unsubscribers.length} gateway listeners for workflow ${publication.workflow_id}`,
        );
    }

    private unregister(workflowId: Workflow.Id): void {
        this.registrationGenerations.delete(workflowId);
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

    private async handle(registration: Registration, event: Gateway.Socket.Event): Promise<void> {
        const parsed = registration.schema.safeParse(event);

        if (!parsed.success)
            return;

        if (!registration.filter(parsed.data, { fieldValues: registration.fieldValues }))
            return;

        const igniter: Execution.Igniter = {
            variant: 'gateway_event',
            nodeId: registration.nodeId,
            payload: Gateway.Socket.Event.parse(parsed.data),
        };

        const { execution } = await this.executions.runFromService({
            workflowId: registration.publication.workflow_id,
            workflowData: registration.publication.workflow_data,
            igniter,
        }, 'gateway');

        this.log.info(
            `Triggered workflow=${registration.publication.workflow_id} publication=${registration.publication.id} executionId=${execution.id}`,
        );
    }
}
