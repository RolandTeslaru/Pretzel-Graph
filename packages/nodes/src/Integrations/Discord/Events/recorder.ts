import { defineGatewayRecorder } from '@pretzel-graph/node-sdk';
import { Chat } from '@pretzel-graph/shared/domain';
import { Discord } from '../domain';
import { Blueprint } from './blueprint';

/**
 * Records every message the filter passed, whether or not it starts a run.
 *
 * The key comes from the connection's own provider, so the node never writes "discord" into it,
 * and the chat id it returns is what the run reads its history from.
 */
export const gatewayRecorder = defineGatewayRecorder<typeof Blueprint>()(Discord.Event.Schema,
    async (event, ctx) => {

        const { fieldValues, connection, definition, chatAPI } = ctx 

        if (event.type !== 'messageCreate' || fieldValues.event !== 'messageCreate')
            return;

        if (fieldValues.conversation === 'none')
            return;

        const subject = fieldValues.conversation === 'user' ? event.author.id : event.channelId;

        const externaKey = Chat.createExternalKey(definition.provider, connection.id, subject)

        return chatAPI.append(
            externaKey,
            [{
                id:      Chat.Message.Id.parse(crypto.randomUUID()),
                role:    'human',
                content: event.content,
                data:    { 
                    name: event.author.name, 
                    additional_kwargs: { 
                        messageId: event.messageId } },
            }]
        );
    },
);
