import { BadRequestException, ForbiddenException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Consultation, Execution, Gateway, Library, Workflow } from '@pretzel-graph/shared/domain';
import { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint';
import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import { System } from '@pretzel-graph/shared/system';
import { createRedisClient } from '@/utils/redis';
import { GatewayService } from '../../Gateway/gateway.service';
import { ShelfService } from '../../Shelf/shelf.service';
import { ChatService } from '../../Chat/chat.service';

// The blueprint-typed filter, read back with the field values the node sent.
type Filter = (event: unknown, context: Gateway.Socket.Context) => boolean;

interface TestRegistration {
    workflowId:  Workflow.Id;
    executionId: Execution.Id;
    timer:       ReturnType<typeof setTimeout>;
    unsubscribe: () => void;
}

// A draft run listening to a live connection: one temporary listener per parked node, which
// answers that node's consultation with the first event its filter accepts.
@Injectable()
export class GatewayIgniterTestService implements OnModuleDestroy {
    private readonly log = System.log.withContext('GatewayIgniterTest');
    private readonly redisPub = createRedisClient('gateway-igniter-test');
    private readonly registrations = new Map<Consultation.Id, TestRegistration>();

    constructor(
        private readonly gateways: GatewayService,
        private readonly shelf:    ShelfService,
        private readonly chats:    ChatService,
    ) {}

    public async register(workflowId: Workflow.Id, body: Gateway.Test.API.Register.Body): Promise<void> {
        const blueprintId = body.blueprintId as Blueprint.Id;
        const base        = this.shelf.getBlueprint({ blueprintId }).blueprint;
        const blueprint   = Blueprint.derive(base, body.fieldValues).blueprint;
        const listener    = blueprint.gatewayListener;

        if (!listener)
            throw new BadRequestException(`${blueprintId} declares no gateway listener`);

        // The body names the connection to listen to; it may only be the one the node points at.
        const ref = Library.Ref.Connection.Schema.safeParse(body.fieldValues[listener.refFieldId]);

        if (!ref.success || ref.data.id !== body.connectionId)
            throw new ForbiddenException('The connection does not match the one this node points at');

        const gateway = await this.shelf.getGatewayFilter(blueprintId);
        const filter  = gateway?.filter as Filter | undefined;

        if (!gateway || !filter)
            throw new BadRequestException(`${blueprintId} has no gateway filter`);

        const connection = this.gateways.connection.getOpen(body.connectionId);

        if (!connection)
            throw new BadRequestException('That connection is not connected');

        // The same context a published run gets, so a draft run filters on identical inputs.
        const context: Gateway.Socket.Context = {
            fieldValues: body.fieldValues as never,
            connection,
            definition:  this.gateways.definition.get(connection.definitionId),
            chatAPI: {
                append: (externalKey, messages) =>
                    this.chats.appendByExternalKey(workflowId, externalKey, messages),
            },
            log: message => this.log.info(message),
        };

        this.deregister(body.consultationId);

        const unsubscribe = this.gateways.connection.subscribe(body.connectionId, event => {
            const parsed = gateway.schema.safeParse(event);

            if (!parsed.success)
                return;

            if (!filter(parsed.data, context))
                return;

            void this.answer(body, event);
        });

        // The node knows how long it waits; a listener outliving that would hold a socket subscription
        // nothing is parked on.
        const timer = setTimeout(() => {
            this.deregister(body.consultationId);
            this.log.warning(`Test listener expired for workflow=${workflowId} node=${body.nodeId}`);
        }, body.timeoutMs);

        this.registrations.set(body.consultationId, {
            workflowId,
            executionId: body.executionId,
            timer,
            unsubscribe,
        });

        this.log.info(`Registered test listener for workflow=${workflowId} node=${body.nodeId} connection=${body.connectionId}`);
    }

    public deregister(consultationId: Consultation.Id): void {
        const registration = this.registrations.get(consultationId);

        if (!registration)
            return;

        clearTimeout(registration.timer);
        registration.unsubscribe();
        this.registrations.delete(consultationId);
    }

    // Answers the node's consultation on the execution's own signal channel, then stops listening.
    private async answer(body: Gateway.Test.API.Register.Body, event: Gateway.Socket.Event): Promise<void> {
        const channel = Execution.Signal.getChannel(body.executionId);

        const signal = Consultation.Signal.Answer.parse({
            channel,
            type:           'consultation:answer',
            executionId:    body.executionId,
            consultationId: body.consultationId,
            answer: {
                requestId: body.consultationId,
                variant:   Gateway.Test.Consultation.Variant,
                event,
            } satisfies Gateway.Test.Consultation.Answer,
        });

        this.deregister(body.consultationId);

        await this.redisPub.publish(channel, JSON.stringify(signal));

        this.log.info(`Dispatched test event for node=${body.nodeId} execution=${body.executionId}`);
    }

    public onModuleDestroy(): void {
        for (const consultationId of [...this.registrations.keys()])
            this.deregister(consultationId);

        this.redisPub.disconnect();
    }
}
