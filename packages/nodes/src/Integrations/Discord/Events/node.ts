import { RuntimeNode, defineGatewayFilter, defineGatewayRecorder, type InferOutputs } from '@pretzel-graph/node-sdk';
import { Chat, Gateway, type Execution, type Library } from '@pretzel-graph/shared/domain';
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import { Discord } from '../domain';
import { Blueprint } from './blueprint';

export class Node extends RuntimeNode<typeof Blueprint> {

    // Runs in the backend, per event, before any execution exists.
    static gatewayFilter = defineGatewayFilter<typeof Blueprint>()(Discord.Event.Schema,
        (event, { fieldValues }) => {
            if (event.type !== 'messageCreate')
                return false;

            if (!fieldValues.allowBotMessages && event.author.bot)
                return false;

            return !fieldValues.directMessagesOnly || Boolean(event.directMessage);
        },
    );

    /**
     * Records every message the filter passed, whether or not it starts a run.
     *
     * The key comes from the connection's own provider, so the node never writes "discord" into it,
     * and the chat id it returns is what the run reads its history from.
     */
    static gatewayRecorder = defineGatewayRecorder<typeof Blueprint>()(Discord.Event.Schema,
        async (event, { fieldValues, connectionId, provider, chatAPI }) => {
            if (event.type !== 'messageCreate' || fieldValues.conversation === 'none')
                return;

            const subject = fieldValues.conversation === 'user' ? event.author.id : event.channelId;

            return chatAPI.append(Chat.createExternalKey(provider, connectionId, subject), [{
                id:      Chat.Message.Id.parse(crypto.randomUUID()),
                role:    'human',
                content: event.content,
                data:    { name: event.author.name, additional_kwargs: { messageId: event.messageId } },
            }]);
        },
    );

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
            },
            // The backend runs this node's own filter, so it needs what the filter reads.
            onOpen: request => Gateway.Test.API.register(this.context.internalAPI.raw, {
                workflowId:     this.context.workflowId,
                nodeId:         this.nodeId,
                blueprintId:    Blueprint.id,
                fieldValues:    this.fieldValues as Record<Field.Id, Field.Value>,
                connectionId:   connection.id,
                timeoutMs:      this.fieldValues.testTimeoutMs,
                executionId:    this.context.executionId,
                consultationId: request.id,
            }).then(() => {}),
        });

        return answer.event;
    }
}
