import { defineBlueprint, defineField, defineGatewayEvent, defineOutput } from '@pretzel-graph/node-sdk';
import { DiscordBot } from '../../../Credentials';

export const Blueprint = defineBlueprint({
    id:          'Integrations.Discord.OnMessage',
    displayName: 'Discord On Message',
    description: 'Starts the workflow when the connected Discord bot receives a direct message.',
    icon:        'MessagesSquare',
    accent:      'utility',
    igniter:     true,
    fields: [
        defineField.Integer('testTimeoutMs', 'Test Timeout (ms)', {
            initialValue: 30_000,
            min:          10_000,
            max:          10 * 60_000,
            tooltip:      'How long a test run waits for a Discord direct message.',
        }),
    ],
    inputs:      [],
    outputs: [
        defineOutput.Data('event', 'Event', {
            tooltip: 'The normalized Discord message event.',
        }),
    ],
    credentials: [DiscordBot],
    gatewayEvents: [
        defineGatewayEvent({
            id:                 'message',
            provider:           'discord',
            event:              'message',
            credential:         DiscordBot,
            directMessagesOnly: true,
            ignoreBotMessages:  true,
        }),
    ],
});
