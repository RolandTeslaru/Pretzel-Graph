import { defineBlueprint, defineField, defineGatewayListener, defineOutput } from '@pretzel-graph/node-sdk';

// One event per node, so the output has a known shape; several nodes can share one connection.
export const Blueprint = defineBlueprint({
    id:          'Integrations.Slack.Events',
    displayName: 'Slack Events',
    description: 'Starts the workflow when the connected Slack app receives an event, command or interaction.',
    icon:        'Slack',
    accent:      'utility',
    igniter:     true,

    fields: [
        defineField.LibraryRef('connection', 'Connection', {
            accepts:      ['connection'],
            definitionId: 'Connections.Slack',
            required:     true,
            tooltip:      'The Slack connection whose events start this workflow.',
        }),

        defineField.MultiOption('event', 'Event', {
            options: [
                { value: 'message',               displayName: 'Message Posted' },
                { value: 'app_mention',           displayName: 'App Mentioned' },
                { value: 'message_changed',       displayName: 'Message Edited' },
                { value: 'message_deleted',       displayName: 'Message Deleted' },
                { value: 'reaction_added',        displayName: 'Reaction Added' },
                { value: 'reaction_removed',      displayName: 'Reaction Removed' },
                { value: 'slash_command',         displayName: 'Slash Command' },
                { value: 'block_actions',         displayName: 'Button or Menu Used' },
                { value: 'view_submission',       displayName: 'Modal Submitted' },
                { value: 'shortcut',              displayName: 'Shortcut Used' },
                { value: 'app_home_opened',       displayName: 'App Home Opened' },
                { value: 'member_joined_channel', displayName: 'Member Joined Channel' },
                { value: 'member_left_channel',   displayName: 'Member Left Channel' },
                { value: 'team_join',             displayName: 'User Joined Workspace' },
                { value: 'channel_created',       displayName: 'Channel Created' },
                { value: 'channel_deleted',       displayName: 'Channel Deleted' },
                { value: 'channel_rename',        displayName: 'Channel Renamed' },
                { value: 'channel_archive',       displayName: 'Channel Archived' },
                { value: 'channel_unarchive',     displayName: 'Channel Unarchived' },
                { value: 'pin_added',             displayName: 'Message Pinned' },
                { value: 'pin_removed',           displayName: 'Message Unpinned' },
            ],
            initialValue: 'app_mention',
            search:       true,
            tooltip:      'Which Slack event starts this workflow. The Slack app must be subscribed to it.',
        }),

        defineField.MultiOption('conversation_scope', 'Conversation Scope', {
            options: [
                { value: 'none',             displayName: 'None',             description: 'Record nothing; the event only starts the run.' },
                { value: 'shared',           displayName: 'Shared',           description: 'One conversation for the whole connection.' },
                { value: 'channel',          displayName: 'Channel',          description: 'One per channel, shared by everyone in it. A DM is a channel.' },
                { value: 'thread',           displayName: 'Thread',           description: 'One per thread; every message outside a thread starts its own, so DMs rarely want this.' },
                { value: 'channel_and_user', displayName: 'Channel and User', description: 'One per person per channel.' },
            ],
            initialValue: 'channel',
            tooltip:      'Which conversation an event is recorded in, and what runs are serialised against.',
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
            tooltip: 'The Slack event that started this run.',
        }),
    ],

    gatewayListener: defineGatewayListener({ refFieldId: 'connection' }),


    'event==message': {
        fields: [
            defineField.MultiOption('origin', 'Origin', {
                options: [
                    { value: 'any',     displayName: 'Any' },
                    { value: 'dm',      displayName: 'Direct Messages' },
                    { value: 'channel', displayName: 'Channels' },
                ],
                initialValue: 'dm',
                tooltip:      'Where a message has to be posted. Group DMs count as channels.',
            }),
            defineField.Boolean('allow_bot_messages', 'Allow Bot Messages', {
                initialValue: false,
                tooltip:      "Also start on messages from other bots. This connection's own messages never start a run.",
            }),
            defineField.Boolean('thread_replies', 'Include Thread Replies', {
                initialValue: true,
                tooltip:      'Also start on replies inside threads, not only on top-level messages.',
            }),
        ],

        'origin==channel': {
            fields: [
                defineField.Boolean('require_mention', 'Only When Mentioned', {
                    initialValue: false,
                    tooltip:      'Ignore channel messages that do not mention the app.',
                }),
            ],
        },
    },

    'event==reaction_added': {
        fields: [
            defineField.String('reaction_add_emoji', 'Emoji', {
                placeholder: 'thumbsup',
                tooltip:     'Only this emoji name. Leave empty for any.',
            }),
        ],
    },

    'event==reaction_removed': {
        fields: [
            defineField.String('reaction_remove_emoji', 'Emoji', {
                placeholder: 'thumbsup',
                tooltip:     'Only this emoji name. Leave empty for any.',
            }),
        ],
    },

    'event==slash_command': {
        fields: [
            defineField.String('command_name', 'Command', {
                placeholder: '/ask',
                tooltip:     'Only this command. Leave empty for any command the app owns.',
            }),
        ],
    },

    'event==block_actions': {
        fields: [
            defineField.List('action_ids', 'Action IDs', {
                only:    'static',
                tooltip: 'Only buttons or menus with these action ids. Leave empty for any.',
            }),
        ],
    },

    'event==view_submission': {
        fields: [
            defineField.String('view_callback_id', 'Callback ID', {
                tooltip: 'Only modals with this callback id. Leave empty for any.',
            }),
        ],
    },

    'event==shortcut': {
        fields: [
            defineField.String('shortcut_callback_id', 'Callback ID', {
                tooltip: 'Only the shortcut with this callback id. Leave empty for any.',
            }),
        ],
    },
});
