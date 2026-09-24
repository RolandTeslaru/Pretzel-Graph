import { defineBlueprint, defineField, defineGatewayListener, defineOutput } from '@pretzel-graph/node-sdk';

/**
 * One event per node, so the output has a known shape and each event brings its own filters.
 *
 * Several of these can point at one connection: a workflow that answers messages and another that
 * watches reactions are two nodes on the same socket.
 */
export const Blueprint = defineBlueprint({
    id:          'Integrations.Discord.Events',
    displayName: 'Discord Events',
    description: 'Starts the workflow when the connected Discord bot receives an event.',
    icon:        'Discord',
    accent:      'utility',
    igniter:     true,

    fields: [
        defineField.LibraryRef('connection', 'Connection', {
            accepts:      ['connection'],
            definitionId: 'Connections.Discord',
            required:     true,
            tooltip:      'The Discord connection whose events start this workflow.',
        }),

        defineField.MultiOption('event', 'Event', {
            options: [
                { value: 'messageCreate',                 displayName: 'Message Sent' },
                { value: 'messageUpdate',                 displayName: 'Message Edited' },
                { value: 'messageDelete',                 displayName: 'Message Deleted' },
                { value: 'messageReactionAdd',            displayName: 'Reaction Added' },
                { value: 'messageReactionRemove',         displayName: 'Reaction Removed' },
                { value: 'typingStart',                   displayName: 'Typing Started' },
                { value: 'guildMemberAdd',                displayName: 'Member Joined' },
                { value: 'guildMemberRemove',             displayName: 'Member Left' },
                { value: 'guildMemberUpdate',             displayName: 'Member Changed' },
                { value: 'channelCreate',                 displayName: 'Channel Created' },
                { value: 'channelDelete',                 displayName: 'Channel Deleted' },
                { value: 'channelUpdate',                 displayName: 'Channel Changed' },
                { value: 'threadCreate',                  displayName: 'Thread Created' },
                { value: 'threadDelete',                  displayName: 'Thread Deleted' },
                { value: 'voiceStateUpdate',              displayName: 'Voice State Changed' },
                { value: 'presenceUpdate',                displayName: 'Presence Changed' },
                { value: 'guildBanAdd',                   displayName: 'Member Banned' },
                { value: 'guildBanRemove',                displayName: 'Member Unbanned' },
                { value: 'autoModerationActionExecution', displayName: 'AutoMod Acted' },
                { value: 'inviteCreate',                  displayName: 'Invite Created' },
                { value: 'inviteDelete',                  displayName: 'Invite Deleted' },
                { value: 'guildScheduledEventCreate',     displayName: 'Event Scheduled' },
                { value: 'guildScheduledEventUpdate',     displayName: 'Scheduled Event Changed' },
                { value: 'guildScheduledEventDelete',     displayName: 'Scheduled Event Cancelled' },
                { value: 'interactionCreate',             displayName: 'Interaction Received' },
            ],
            initialValue: 'messageCreate',
            search:       true,
            tooltip:      'Which Discord event starts this workflow. The connection must have the intent for it.',
        }),

        defineField.MultiOption('origin', 'Origin', {
            options: [
                { value: 'any',    displayName: 'Any' },
                { value: 'dm',     displayName: 'Direct Messages' },
                { value: 'server', displayName: 'Servers' },
            ],
            initialValue: 'dm',
            tooltip:      'Where an event has to come from. Server-only events ignore this.',
        }),

        defineField.MultiOption('conversation_scope', 'Conversation Scope', {
            options: [
                { value: 'none',             displayName: 'None',             description: 'Record nothing; the event only starts the run.' },
                { value: 'shared',           displayName: 'Shared',           description: 'One conversation for the whole connection.' },
                { value: 'channel',          displayName: 'Channel',          description: 'One per channel, shared by everyone in it. A DM is a channel.' },
                { value: 'channel_and_user', displayName: 'Channel and User', description: 'One per person per channel.' },
            ],
            initialValue: 'channel',
            tooltip:      'Which conversation an event is recorded in, and what runs are serialised against.',
        }),

        // Declared once for every event: almost all of them carry a server, a channel and a user.
        defineField.List('server_ids', 'Server IDs', {
            only:    'static',
            tooltip: 'Only events from these server ids. Leave empty for any.',
        }),
        defineField.List('channel_ids', 'Channel IDs', {
            only:    'static',
            tooltip: 'Only events from these channel ids. Leave empty for any.',
        }),
        defineField.List('allowed_user_ids', 'Allowed User IDs', {
            only:    'static',
            tooltip: 'Only events caused by these user ids. Leave empty for anyone.',
        }),

        defineField.Integer('test_timeout_ms', 'Test Timeout (ms)', {
            initialValue: 30_000,
            min:          10_000,
            max:          10 * 60_000,
            tooltip:      'How long a test run waits for an event.',
        }),
    ],

    inputs: [],
    outputs: [
        defineOutput.Data('event', 'Event', {
            tooltip: 'The Discord event that started this run.',
        }),
    ],

    gatewayListener: defineGatewayListener({ refFieldId: 'connection' }),


    'event==messageCreate': {
        fields: [
            defineField.Boolean('allow_bot_messages', 'Allow Bot Messages', {
                initialValue: false,
                tooltip:      "Also start on messages from other bots. This connection's own messages never start a run.",
            }),
        ],

        'origin==server': {
            fields: [
                defineField.Boolean('require_mention', 'Only When Mentioned', {
                    initialValue: true,
                    tooltip:      'Ignore server messages that do not mention the bot.',
                }),
            ],
        },
    },

    'event==messageReactionAdd': {
        fields: [
            defineField.String('reaction_add_emoji', 'Emoji', {
                tooltip: 'Only this emoji. Leave empty for any.',
            }),
        ],
    },

    'event==messageReactionRemove': {
        fields: [
            defineField.String('reaction_remove_emoji', 'Emoji', {
                tooltip: 'Only this emoji. Leave empty for any.',
            }),
        ],
    },
});
