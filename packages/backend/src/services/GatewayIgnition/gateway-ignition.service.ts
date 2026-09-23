import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Chat, Execution, Gateway, Library, VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint';
import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import { System } from '@pretzel-graph/shared/system';
import type { ZodType } from 'zod';
import {
    ActivePublicationChange,
    ActivePublicationService,
} from '../ActivePublication/active-publication.service';
import { ChatService } from '../Chat/chat.service';
import { ExecutionService } from '../Execution/execution.service';
import { GatewayService } from '../Gateway/gateway.service';
import { ShelfService } from '../Shelf/shelf.service';

// A published node that listens to a connection, with everything an event needs to be handled.
interface ListeningNode {
    publication:  VersionControl.Publication;
    nodeId:       Workflow.Node.Id;
    connectionId: Gateway.Connection.Id;
    schema:       ZodType;
    filter:       (
        event:   unknown,
        context: Gateway.Socket.Context,
    ) => boolean;
    // Absent when the node records nothing; an event then starts a run without opening a chat.
    recorder?:    (
        event:   unknown,
        context: Gateway.Socket.Context,
    ) => Promise<Chat.Id | void>;
    fieldValues:  Record<Field.Id, Field.Value>;
}

@Injectable()
export class GatewayIgnitionService implements OnModuleInit, OnModuleDestroy {
    private readonly log = System.log.withContext('GatewayIgnition');
    private readonly subscriptions = new Map<Workflow.Id, (() => void)[]>();
    private unsubscribeFromPublications: (() => void) | null = null;

    constructor(
        private readonly activePublications: ActivePublicationService,
        private readonly gateways: GatewayService,
        private readonly shelf: ShelfService,
        private readonly executions: ExecutionService,
        private readonly chats: ChatService,
    ) {}

    public async onModuleInit(): Promise<void> {
        this.unsubscribeFromPublications = this.activePublications.subscribe(change =>
            this.handlePublicationChange(change),
        );

        const publications = this.activePublications.list();
        const results = await Promise.allSettled(
            publications.map(publication => this.registerPublication(publication)),
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

        for (const workflowId of this.subscriptions.keys())
            this.unregister(workflowId);
    }

    private async handlePublicationChange(change: ActivePublicationChange): Promise<void> {
        if (change.type === 'removed') {
            this.unregister(change.workflowId);
            return;
        }

        await this.registerPublication(change.publication);
    }

    private async registerPublication(publication: VersionControl.Publication): Promise<void> {
        this.clearSubscriptions(publication.workflow_id);

        const listeningNodes: ListeningNode[] = [];

        for (const node of Object.values(publication.workflow_data.nodes)) {
            if (node.isDisabled)
                continue;

            const staticValues = publication.workflow_data.staticValues[node.id] ?? {};
            const base = this.shelf.getBlueprint({ blueprintId: node.blueprintId }).blueprint;
            const blueprint = Blueprint.derive(base, staticValues).blueprint;

            const listener = blueprint.gatewayListener;

            if (!listener)
                continue;

            const filtering = await this.shelf.getGatewayFilter(node.blueprintId);

            if (!filtering)
                throw new Error(`Node ${node.blueprintId} declares a gateway listener but no gateway filter`);

            // A node records only if it declares a recorder; filtering alone is enough to ignite.
            const recorder = await this.shelf.getGatewayRecorder(node.blueprintId);

            const fieldValues = Field.mapValuesToIds(blueprint.fields, staticValues);

            const ref = fieldValues[listener.refFieldId];

            if (ref == null)
                continue;

            const connectionRef = Library.Ref.Connection.Schema.safeParse(ref);

            if (!connectionRef.success)
                throw new Error(`Node ${node.id} gateway listener does not reference a connection`);

            listeningNodes.push({
                publication,
                nodeId:       node.id,
                connectionId: connectionRef.data.id,
                schema:       filtering.schema,
                filter:       filtering.filter as ListeningNode['filter'],
                recorder:     recorder?.recorder as ListeningNode['recorder'],
                fieldValues,
            });
        }

        const unsubscribers = listeningNodes.map(node =>
            this.gateways.connection.subscribe(node.connectionId, event => {
                void this.handleSocketEvent(node, event).catch(error =>
                    this.log.error(
                        `Gateway event failed for workflow ${publication.workflow_id} node ${node.nodeId}: ${String(error)}`,
                    ),
                );
            }),
        );

        if (unsubscribers.length)
            this.subscriptions.set(publication.workflow_id, unsubscribers);

        this.log.info(
            `Registered ${unsubscribers.length} gateway listeners for workflow ${publication.workflow_id}`,
        );
    }

    private unregister(workflowId: Workflow.Id): void {
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

    private async handleSocketEvent(node: ListeningNode, event: Gateway.Socket.Event): Promise<void> {
        const parsed = node.schema.safeParse(event);

        if (!parsed.success)
            return;

        const context = this.createContext(node);

        if (!context)
            return;

        if (!node.filter(parsed.data, context))
            return;

        // Recorded before the run starts, so an execution never reads a history missing the event
        // that triggered it — and so the events that start no run are still there when one does.
        const chatId = await this.record(node, parsed.data, context);

        const igniter: Execution.Igniter = {
            variant: 'gateway_event',
            nodeId: node.nodeId,
            payload: Gateway.Socket.Event.parse(parsed.data),
            ...(chatId ? { chat_id: chatId } : {}),
        };

        const { execution } = await this.executions.runFromService({
            workflowId: node.publication.workflow_id,
            workflowData: node.publication.workflow_data,
            igniter,
        }, 'gateway');

        this.log.info(
            `Triggered workflow=${node.publication.workflow_id} publication=${node.publication.id} executionId=${execution.id}`,
        );
    }


    // A recorder that throws loses its event, never the run: the workflow still fires.
    // What the filter and the recorder both read. Null once the connection's socket is gone, which
    // is also when there is nothing left to handle.
    private createContext(node: ListeningNode): Gateway.Socket.Context | null {
        const connection = this.gateways.connection.getOpen(node.connectionId);

        if (!connection)
            return null;

        return {
            fieldValues: node.fieldValues as never,
            connection,
            definition:  this.gateways.definition.get(connection.definitionId),
            chatAPI: {
                append: (externalKey, messages) =>
                    this.chats.appendByExternalKey(node.publication.workflow_id, externalKey, messages),
            },
            log: message => this.log.info(message),
        };
    }

    private async record(
        node:    ListeningNode,
        event:   unknown,
        context: Gateway.Socket.Context,
    ): Promise<Chat.Id | null> {
        if (!node.recorder)
            return null;

        try {
            const chatId = await node.recorder(event, context);

            return chatId ?? null;
        }
        catch (error) {
            this.log.error(`Recorder for node ${node.nodeId} failed: ${(error as Error).message}`);
            return null;
        }
    }
}
