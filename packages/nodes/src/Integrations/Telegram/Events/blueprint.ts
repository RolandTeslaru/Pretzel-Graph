import { defineBlueprint, defineField, defineGatewayListener, defineOutput } from '@pretzel-graph/node-sdk';

// One event per node, so the output has a known shape; several nodes can share one connection.
export const Blueprint = defineBlueprint({
    id:          'Integrations.Telegram.Events',
    displayName: 'Telegram Events',
    description: 'Starts the workflow when the connected Telegram bot receives a message, button press or chat change.',
    icon:        'Telegram',
    accent:      'utility',
    igniter:     true,

    fields: [
        defineField.LibraryRef('connection', 'Connection', {
            accepts:      ['connection'],
            definitionId: 'Connections.Telegram',
            required:     true,
            tooltip:      'The Telegram connection whose updates start this workflow.',
        }),

        defineField.MultiOption('event', 'Event', {
            options: [
                { value: 'message',             displayName: 'Message Received' },
                { value: 'edited_message',      displayName: 'Message Edited' },
                { value: 'callback_query',      displayName: 'Button Pressed' },
                { value: 'message_reaction',    displayName: 'Reaction Changed' },
                { value: 'channel_post',        displayName: 'Channel Post' },
                { value: 'edited_channel_post', displayName: 'Channel Post Edited' },
                { value: 'my_chat_member',      displayName: 'Bot Added, Removed or Blocked' },
                { value: 'chat_member',         displayName: 'Member Changed' },
                { value: 'chat_join_request',   displayName: 'Join Request' },
                { value: 'poll_answer',         displayName: 'Poll Answered' },
            ],
            initialValue: 'message',
            search:       true,
            tooltip:      'Which Telegram update starts this workflow. Reactions and member changes need the bot to be a group admin.',
        }),

        defineField.MultiOption('conversation_scope', 'Conversation Scope', {
            options: [
                { value: 'none',          displayName: 'None',          description: 'Record nothing; the event only starts the run.' },
                { value: 'shared',        displayName: 'Shared',        description: 'One conversation for the whole bot.' },
                { value: 'chat',          displayName: 'Chat',          description: 'One per chat, shared by everyone in it. A private chat is one person.' },
                { value: 'topic',         displayName: 'Topic',         description: 'One per forum topic; chats without topics are one conversation each.' },
                { value: 'chat_and_user', displayName: 'Chat and User', description: 'One per person per chat.' },
            ],
            initialValue: 'chat',
            tooltip:      'Which conversation an event is recorded in, and what runs are serialised against.',
        }),

        defineField.List('chat_ids', 'Chat IDs', {
            only:    'static',
            tooltip: 'Only events from these chat ids. Group ids are negative. Leave empty for any.',
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
            tooltip: 'The Telegram update that started this run.',
        }),
    ],

    gatewayListener: defineGatewayListener({ refFieldId: 'connection' }),


    'event==message': {
        fields: [
            defineField.MultiOption('origin', 'Origin', {
                options: [
                    { value: 'any',     displayName: 'Any' },
                    { value: 'private', displayName: 'Private Chats' },
                    { value: 'group',   displayName: 'Groups' },
                ],
                initialValue: 'private',
                tooltip:      'Where a message has to be sent.',
            }),
            defineField.String('command_name', 'Command', {
                placeholder: '/start',
                tooltip:     'Only messages that start with this command. Leave empty for any message.',
            }),
        ],

        'origin==group': {
            fields: [
                defineField.Boolean('require_mention', 'Only When Addressed', {
                    initialValue: true,
                    tooltip:      'Ignore group messages that do not mention the bot, reply to it, or use one of its commands.',
                }),
            ],
        },
    },

    'event==callback_query': {
        fields: [
            defineField.String('callback_data_prefix', 'Button Data', {
                placeholder: 'approve:',
                tooltip:     'Only buttons whose data starts with this. Leave empty for any button.',
            }),
        ],
    },

    'event==message_reaction': {
        fields: [
            defineField.String('reaction_emoji', 'Emoji', {
                placeholder: '👍',
                tooltip:     'Only when this emoji is added. Leave empty for any change.',
            }),
        ],
    },
});
