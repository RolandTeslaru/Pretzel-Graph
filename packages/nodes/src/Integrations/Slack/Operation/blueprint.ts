import { defineBlueprint, defineField, defineOutput, defineTool } from '@pretzel-graph/node-sdk';
import { SlackBot } from '@pretzel-graph/nodes/Credentials';

const CHANNEL_TOOLTIP = 'A Slack event carries this as channelId, and a DM is a channel like any other.';

const TS_TOOLTIP = "The message's timestamp, which Slack uses as its id. A Slack event carries it as messageTs.";

// The resource, then what you do to it; field ids are unique across the whole tree.
export const Blueprint = defineBlueprint({
    id:             'Integrations.Slack.Operation',
    displayName:    'Slack',
    description:    'Reads and writes Slack messages, threads, channels and users.',
    icon:           'Slack',
    accent:         'utility',
    toolCompatible: true,
    credentials:    [SlackBot],

    fields: [
        defineField.MultiOption('resource', 'Resource', {
            options: [
                { value: 'message', displayName: 'Message', description: 'Send, read, edit, delete, react to and pin messages.' },
                { value: 'channel', displayName: 'Channel', description: 'Read, list or join channels.' },
                { value: 'user',    displayName: 'User',    description: 'Read a user, find one by email, or list them.' },
            ],
            initialValue: 'message',
        }),
    ],
    inputs:  [],
    outputs: [],


    // ─── Message ──────────────────────────────────────────────────────────

    'resource==message': {
        fields: [
            defineField.MultiOption('message_action', 'Action', {
                options: [
                    { value: 'send',      displayName: 'Send' },
                    { value: 'ephemeral', displayName: 'Send Ephemeral', description: 'Visible only to one person in the channel.' },
                    { value: 'respond',   displayName: 'Respond', description: 'Answer a slash command or interaction.' },
                    { value: 'fetch',     displayName: 'Fetch' },
                    { value: 'thread',    displayName: 'Fetch Thread' },
                    { value: 'edit',      displayName: 'Edit' },
                    { value: 'delete',    displayName: 'Delete' },
                    { value: 'react',     displayName: 'React' },
                    { value: 'pin',       displayName: 'Pin' },
                    { value: 'pins',      displayName: 'Pins' },
                ],
                initialValue: 'send',
            }),
        ],

        'message_action==send': {
            fields: [
                defineField.MultiOption('send_target', 'To', {
                    options: [
                        { value: 'channel', displayName: 'Channel', description: 'Post in a channel, or in a DM you already have the id for.' },
                        { value: 'user',    displayName: 'User',    description: 'Open a DM with a user and post there.' },
                    ],
                    initialValue: 'channel',
                    variant:      'tab',
                }),
                defineField.String('send_text', 'Text', {
                    required: true,
                    multiline: true,
                    tooltip:  'Slack mrkdwn: *bold*, _italic_, `code`, <https://example.com|links> and <@U123> mentions.',
                }),
                defineField.Boolean('send_unfurl', 'Link Previews', {
                    initialValue: false,
                    tooltip:      'Show previews for links in the message.',
                }),
            ],
            outputs: [defineOutput.Data('message', 'Message')],

            'send_target==channel': {
                fields: [
                    defineField.String('send_channel_id', 'Channel ID', { required: true, tooltip: CHANNEL_TOOLTIP }),
                    defineField.String('send_thread_ts', 'Thread', {
                        tooltip: 'Timestamp of the thread to reply in. Leave empty to post a new message.',
                    }),
                    defineField.Boolean('send_broadcast', 'Also Send to Channel', {
                        initialValue: false,
                        tooltip:      'Show a thread reply in the channel as well.',
                    }),
                ],
            },

            'send_target==user': {
                fields: [
                    defineField.String('send_user_id', 'User ID', {
                        required: true,
                        tooltip:  'Opens the DM with this user, reusing it if one already exists.',
                    }),
                ],
            },
        },

        'message_action==ephemeral': {
            fields: [
                defineField.String('ephemeral_channel_id', 'Channel ID', { required: true, tooltip: CHANNEL_TOOLTIP }),
                defineField.String('ephemeral_user_id', 'User ID', {
                    required: true,
                    tooltip:  'The only person who sees the message. They must be in the channel.',
                }),
                defineField.String('ephemeral_text', 'Text', { required: true, multiline: true }),
                defineField.String('ephemeral_thread_ts', 'Thread', {
                    tooltip: 'Timestamp of the thread to show it in. Leave empty for the channel.',
                }),
            ],
            outputs: [defineOutput.Data('ephemeral_message', 'Message')],
        },

        'message_action==respond': {
            fields: [
                defineField.String('respond_url', 'Response URL', {
                    required: true,
                    tooltip:  'A slash command or interaction carries this as responseUrl. It works for 30 minutes.',
                }),
                defineField.String('respond_text', 'Text', { required: true, multiline: true }),
                defineField.Boolean('respond_in_channel', 'Visible to Everyone', {
                    initialValue: false,
                    tooltip:      'Post the response in the channel instead of only to the person who asked.',
                }),
                defineField.Boolean('respond_replace', 'Replace Original', {
                    initialValue: false,
                    tooltip:      'Replace the message the button or menu was on.',
                }),
            ],
        },

        'message_action==fetch': {
            fields: [
                defineField.String('fetch_channel_id', 'Channel ID', { required: true, tooltip: CHANNEL_TOOLTIP }),
                defineField.Integer('fetch_limit', 'Limit', { initialValue: 50, min: 1, max: 200 }),
                defineField.String('fetch_oldest', 'After', {
                    tooltip: 'Only messages newer than this timestamp. Leave empty for no bound.',
                }),
                defineField.String('fetch_latest', 'Before', {
                    tooltip: 'Only messages older than this timestamp. Leave empty for the latest.',
                }),
            ],
            outputs: [defineOutput.DataList('messages', 'Messages')],
        },

        'message_action==thread': {
            fields: [
                defineField.String('thread_channel_id', 'Channel ID', { required: true, tooltip: CHANNEL_TOOLTIP }),
                defineField.String('thread_ts', 'Thread', {
                    required: true,
                    tooltip:  "The parent message's timestamp. A Slack event carries it as threadTs.",
                }),
                defineField.Integer('thread_limit', 'Limit', { initialValue: 100, min: 1, max: 200 }),
            ],
            outputs: [defineOutput.DataList('replies', 'Replies')],
        },

        'message_action==edit': {
            fields: [
                defineField.String('edit_channel_id', 'Channel ID', { required: true, tooltip: CHANNEL_TOOLTIP }),
                defineField.String('edit_ts', 'Message', { required: true, tooltip: TS_TOOLTIP }),
                defineField.String('edit_text', 'Text', { required: true, multiline: true }),
            ],
            outputs: [defineOutput.Data('edited_message', 'Message')],
        },

        'message_action==delete': {
            fields: [
                defineField.String('delete_channel_id', 'Channel ID', { required: true, tooltip: CHANNEL_TOOLTIP }),
                defineField.String('delete_ts', 'Message', { required: true, tooltip: TS_TOOLTIP }),
            ],
        },

        'message_action==react': {
            fields: [
                defineField.String('react_channel_id', 'Channel ID', { required: true, tooltip: CHANNEL_TOOLTIP }),
                defineField.String('react_ts', 'Message', { required: true, tooltip: TS_TOOLTIP }),
                defineField.String('react_emoji', 'Emoji', {
                    required:    true,
                    placeholder: 'eyes',
                    tooltip:     'An emoji name without colons, such as thumbsup or a custom one.',
                }),
                defineField.Boolean('react_remove', 'Remove', { initialValue: false }),
            ],
        },

        'message_action==pin': {
            fields: [
                defineField.String('pin_channel_id', 'Channel ID', { required: true, tooltip: CHANNEL_TOOLTIP }),
                defineField.String('pin_ts', 'Message', { required: true, tooltip: TS_TOOLTIP }),
                defineField.Boolean('pin_unpin', 'Unpin', { initialValue: false }),
            ],
        },

        'message_action==pins': {
            fields:  [defineField.String('pins_channel_id', 'Channel ID', { required: true, tooltip: CHANNEL_TOOLTIP })],
            outputs: [defineOutput.DataList('pinned_messages', 'Pinned')],
        },
    },


    // ─── Channel ──────────────────────────────────────────────────────────

    'resource==channel': {
        fields: [
            defineField.MultiOption('channel_action', 'Action', {
                options: [
                    { value: 'list', displayName: 'List' },
                    { value: 'get',  displayName: 'Get'  },
                    { value: 'join', displayName: 'Join' },
                ],
                initialValue: 'list',
                variant:      'tab',
            }),
        ],

        'channel_action==list': {
            fields: [
                defineField.Boolean('channel_include_private', 'Include Private', {
                    initialValue: false,
                    tooltip:      'Also list private channels the app has been added to.',
                }),
                defineField.Boolean('channel_include_archived', 'Include Archived', { initialValue: false }),
                defineField.Integer('channel_limit', 'Limit', { initialValue: 200, min: 1, max: 1000 }),
            ],
            outputs: [defineOutput.DataList('channels', 'Channels')],
        },

        'channel_action==get': {
            fields:  [defineField.String('channel_target_id', 'Channel ID', { required: true, tooltip: CHANNEL_TOOLTIP })],
            outputs: [defineOutput.Data('channel', 'Channel')],
        },

        'channel_action==join': {
            fields:  [defineField.String('channel_join_id', 'Channel ID', { required: true, tooltip: 'A public channel for the app to join.' })],
            outputs: [defineOutput.Data('joined_channel', 'Channel')],
        },
    },


    // ─── User ─────────────────────────────────────────────────────────────

    'resource==user': {
        fields: [
            defineField.MultiOption('user_lookup', 'Lookup', {
                options: [
                    { value: 'get',   displayName: 'Get'   },
                    { value: 'email', displayName: 'By Email' },
                    { value: 'list',  displayName: 'List'  },
                ],
                initialValue: 'get',
                variant:      'tab',
            }),
        ],

        'user_lookup==get': {
            fields:  [defineField.String('user_id', 'User ID', { required: true, tooltip: 'A Slack event carries this as userId.' })],
            outputs: [defineOutput.Data('user', 'User')],
        },

        'user_lookup==email': {
            fields:  [defineField.String('user_email', 'Email', { required: true, placeholder: 'alice@example.com' })],
            outputs: [defineOutput.Data('found_user', 'User')],
        },

        'user_lookup==list': {
            fields:  [defineField.Integer('user_limit', 'Limit', { initialValue: 200, min: 1, max: 1000 })],
            outputs: [defineOutput.DataList('users', 'Users')],
        },
    },


    // Three lists so a workflow can hand an agent reads without writes, and skip the directory entirely.
    'isConvertedToTool==true': defineTool({
        fields:  [],
        inputs:  [],
        outputs: [
            defineOutput.ToolList('read_tools', 'Read Tools'),
            defineOutput.ToolList('write_tools', 'Write Tools'),
            defineOutput.ToolList('directory_tools', 'Directory Tools'),
        ],
    }),
});
