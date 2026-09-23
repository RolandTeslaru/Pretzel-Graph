import { RuntimeNode, defineGatewayFilters, type InferOutputs } from '@pretzel-graph/node-sdk';
import { Gateway, type Execution, type Library } from '@pretzel-graph/shared/domain';
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import { Discord } from '../../../Connections/Discord/events';
import { Blueprint } from './blueprint';

export class Node extends RuntimeNode<typeof Blueprint> {

    // Runs in the backend, per event, before any execution exists.
    static gatewayFilters = defineGatewayFilters<typeof Blueprint>()(Discord.Event.Schema, {
        message: (event, { fieldValues }) => {
            if (!fieldValues.allowBotMessages && event.authorIsBot)
                return false;

            return !fieldValues.directMessagesOnly || event.directMessage;
        },
    });

    private event: Gateway.Socket.Event | null = null;

    protected override onIgniter(igniter: Execution.Igniter): void {
        if (igniter.variant === 'gateway_event')
            this.event = igniter.payload;
    }

    protected override async onRun(): Promise<InferOutputs<typeof Blueprint>> {
        if (!this.event)
            this.event = await this.waitForTestEvent();

        return { event: this.event };
    }

    // A draft run listens to the same connection, through a listener that lives as long as this run.
    private async waitForTestEvent(): Promise<Gateway.Socket.Event> {
        const connection = this.fieldValues.connection as Library.Ref | null;

        if (connection?.kind !== 'connection')
            throw new Error('Pick a Discord connection before running this node');

        const answer = await this.context.consultationAPI.consult({
            requestSchema: Gateway.Test.Consultation.Request,
            answerSchema:  Gateway.Test.Consultation.Answer,
            request: {
                nodeId:       this.nodeId,
                variant:      Gateway.Test.Consultation.Variant,
                timeoutMs:    this.fieldValues.testTimeoutMs,
                connectionId: connection.id,
                listenerId:   'message' as Gateway.Listener.Id,
            },
            // The backend runs this node's own filter, so it needs what the filter reads.
            onOpen: request => Gateway.Test.API.register(this.context.internalAPI.raw, {
                workflowId:     this.context.workflowId,
                nodeId:         this.nodeId,
                blueprintId:    Blueprint.id,
                fieldValues:    this.fieldValues as Record<Field.Id, Field.Value>,
                connectionId:   connection.id,
                listenerId:     'message' as Gateway.Listener.Id,
                timeoutMs:      this.fieldValues.testTimeoutMs,
                executionId:    this.context.executionId,
                consultationId: request.id,
            }).then(() => {}),
        });

        return answer.event;
    }
}
