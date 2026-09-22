import { defineBlueprint, defineField, defineGatewayListener, defineOutput } from '@pretzel-graph/node-sdk';

export const Blueprint = defineBlueprint({
    id:          'Integrations.Discord.OnMessage',
    displayName: 'Discord On Message',
    description: 'Starts the workflow when the connected Discord bot receives a message.',
    icon:        'Discord',
    accent:      'utility',
    igniter:     true,
    fields: [
        defineField.LibraryRef('connection', 'Connection', {
            accepts:      ['connection'],
            definitionId: 'Connections.Discord',
            required:     true,
            tooltip:      'The Discord connection whose messages start this workflow.',
        }),
        defineField.Boolean('directMessagesOnly', 'Direct Messages Only', {
            initialValue: true,
            tooltip:      'Ignore messages sent in server channels.',
        }),
        defineField.Boolean('allowBotMessages', 'Allow Bot Messages', {
            initialValue: false,
            tooltip:      "Also start on messages sent by other bots. This connection's own messages never start a run.",
        }),
        defineField.Integer('testTimeoutMs', 'Test Timeout (ms)', {
            initialValue: 30_000,
            min:          10_000,
            max:          10 * 60_000,
            tooltip:      'How long a test run waits for a Discord message.',
        }),
    ],
    inputs:      [],
    outputs: [
        defineOutput.Data('event', 'Event', {
            tooltip: 'The normalized Discord message event.',
        }),
    ],
    gatewayListeners: [
        defineGatewayListener({ id: 'message', refFieldId: 'connection' }),
    ],
});
