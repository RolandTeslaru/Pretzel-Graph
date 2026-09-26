import { defineBlueprint, defineField, defineInput, defineOutput, defineTool } from '@pretzel-graph/node-sdk';
import { DiscordBot } from '@pretzel-graph/nodes/Credentials';


/**
 * Two axes: the resource, then what you do to it.
 *
 * Field ids are unique across the whole tree, so each action declares its own channel field rather
 * than sharing one — a send addressed to a user opens a DM and has no channel to name.
 */
export const Blueprint = defineBlueprint({
    id:             'Integrations.Discord.Operation',
    displayName:    'Discord',
    description:    'Reads and writes Discord messages, channels, members and roles.',
    icon:           'Discord',
    accent:         'utility',
    toolCompatible: true,
    credentials:    [DiscordBot],

    fields: [
        defineField.MultiOption('resource', 'Resource', {
            options: [
                { value: 'message', displayName: 'Message', description: 'Send, read, edit, react to and pin messages.' },
                { value: 'channel', displayName: 'Channel', description: 'Read a channel, or list a server\'s channels.' },
                { value: 'member',  displayName: 'Member',  description: 'Read or search the members of a server.' },
                { value: 'role',    displayName: 'Role',    description: 'List a server\'s roles.' },
                { value: 'server',  displayName: 'Server',  description: 'List the servers the bot is in, or read one.' },
            ],
            initialValue: 'message',
        }),
    ],
    inputs:  [
        defineInput.Data('event', 'Event', {
            tooltip: 'Optional Discord event or other data that triggers this operation and is available as $in.event.',
        }),
    ],
    outputs: [],


    // ─── Message ──────────────────────────────────────────────────────────

    'resource==message': {
        fields: [
            defineField.MultiOption('message_action', 'Action', {
                options: [
                    { value: 'send',  displayName: 'Send'  },
                    { value: 'fetch', displayName: 'Fetch' },
                    { value: 'edit',  displayName: 'Edit'  },
                    { value: 'react', displayName: 'React' },
                    { value: 'pin',   displayName: 'Pin'   },
                    { value: 'pins',  displayName: 'Pins'  },
                    { value: 'typing', displayName: 'Typing' },
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
                defineField.String('send_content', 'Content', { required: true, multiline: true }),
                defineField.Boolean('send_suppress_mentions', 'Suppress Mentions', {
                    initialValue: true,
                    tooltip:      'Blocks @everyone, @here and role pings. User mentions still notify.',
                }),
            ],
            outputs: [defineOutput.Data('message', 'Message')],

            'send_target==channel': {
                fields: [
                    defineField.String('send_channel_id', 'Channel ID', {
                        required: true,
                        tooltip:  'A Discord event carries this as channelId, and a DM is a channel like any other.',
                    }),
                    defineField.String('send_reply_to_id', 'Reply To', {
                        tooltip: 'Message id to reply to. Leave empty to post a new message.',
                    }),
                ],
            },

            'send_target==user': {
                fields: [
                    defineField.String('send_user_id', 'User ID', {
                        required: true,
                        tooltip:  'Opens the DM channel with this user, reusing it if one already exists.',
                    }),
                ],
            },
        },

        'message_action==fetch': {
            fields: [
                defineField.String('fetch_channel_id', 'Channel ID', { required: true }),
                defineField.Integer('fetch_limit', 'Limit', { initialValue: 50, min: 1, max: 100 }),
                defineField.MultiOption('fetch_anchor', 'From', {
                    options: [
                        { value: 'latest', displayName: 'Latest' },
                        { value: 'before', displayName: 'Before' },
                        { value: 'after',  displayName: 'After'  },
                        { value: 'around', displayName: 'Around' },
                    ],
                    initialValue: 'latest',
                    variant:      'tab',
                }),
            ],
            outputs: [defineOutput.DataList('messages', 'Messages')],

            'fetch_anchor!=latest': {
                fields: [
                    defineField.String('fetch_anchor_id', 'Anchor Message ID', { required: true }),
                ],
            },
        },

        'message_action==edit': {
            fields: [
                defineField.String('edit_channel_id', 'Channel ID', { required: true }),
                defineField.String('edit_message_id', 'Message ID', { required: true }),
                defineField.String('edit_content', 'Content', { required: true, multiline: true }),
            ],
            outputs: [defineOutput.Data('edited_message', 'Message')],
        },

        'message_action==react': {
            fields: [
                defineField.String('react_channel_id', 'Channel ID', { required: true }),
                defineField.String('react_message_id', 'Message ID', { required: true }),
                defineField.String('react_emoji', 'Emoji', {
                    required:    true,
                    placeholder: '⏳',
                    tooltip:     'A unicode emoji, or "name:id" for a custom one.',
                }),
                defineField.Boolean('react_remove', 'Remove', { initialValue: false }),
            ],
        },

        'message_action==pin': {
            fields: [
                defineField.String('pin_channel_id', 'Channel ID', { required: true }),
                defineField.String('pin_message_id', 'Message ID', { required: true }),
                defineField.Boolean('pin_unpin', 'Unpin', { initialValue: false }),
            ],
        },

        'message_action==typing': {
            fields: [
                defineField.String('typing_channel_id', 'Channel ID', {
                    required: true,
                    tooltip:  'Shows the bot as typing there for about ten seconds.',
                }),
            ],
        },

        'message_action==pins': {
            fields:  [defineField.String('pins_channel_id', 'Channel ID', { required: true })],
            outputs: [defineOutput.DataList('pinned_messages', 'Pinned')],
        },
    },


    // ─── Channel ──────────────────────────────────────────────────────────

    'resource==channel': {
        fields: [
            defineField.MultiOption('channel_lookup', 'Lookup', {
                options: [
                    { value: 'get',  displayName: 'Get'  },
                    { value: 'list', displayName: 'List' },
                ],
                initialValue: 'list',
                variant:      'tab',
            }),
        ],

        'channel_lookup==get': {
            fields:  [defineField.String('channel_target_id', 'Channel ID', { required: true })],
            outputs: [defineOutput.Data('channel', 'Channel')],
        },

        'channel_lookup==list': {
            fields:  [defineField.String('channel_server_id', 'Server ID', { required: true })],
            outputs: [defineOutput.DataList('channels', 'Channels')],
        },
    },


    // ─── Member ───────────────────────────────────────────────────────────

    'resource==member': {
        fields: [
            defineField.String('member_server_id', 'Server ID', { required: true }),
            defineField.MultiOption('member_lookup', 'Lookup', {
                options: [
                    { value: 'get',    displayName: 'Get'    },
                    { value: 'search', displayName: 'Search' },
                ],
                initialValue: 'get',
                variant:      'tab',
            }),
        ],

        'member_lookup==get': {
            fields:  [defineField.String('member_user_id', 'User ID', { required: true })],
            outputs: [defineOutput.Data('member', 'Member')],
        },

        'member_lookup==search': {
            fields: [
                defineField.String('member_query', 'Query', {
                    required:    true,
                    placeholder: 'alice',
                    tooltip:     'Matches the start of a username or nickname.',
                }),
                defineField.Integer('member_limit', 'Limit', { initialValue: 20, min: 1, max: 100 }),
            ],
            outputs: [defineOutput.DataList('members', 'Members')],
        },
    },


    // ─── Role ─────────────────────────────────────────────────────────────

    'resource==role': {
        fields:  [defineField.String('role_server_id', 'Server ID', { required: true })],
        outputs: [defineOutput.DataList('roles', 'Roles')],
    },


    // ─── Server ───────────────────────────────────────────────────────────

    'resource==server': {
        fields: [
            defineField.MultiOption('server_lookup', 'Lookup', {
                options: [
                    { value: 'list', displayName: 'List' },
                    { value: 'get',  displayName: 'Get'  },
                ],
                initialValue: 'list',
                variant:      'tab',
            }),
        ],

        'server_lookup==list': {
            outputs: [defineOutput.DataList('servers', 'Servers')],
        },

        'server_lookup==get': {
            fields:  [defineField.String('server_target_id', 'Server ID', { required: true })],
            outputs: [defineOutput.Data('server', 'Server')],
        },
    },


    // Three lists so a workflow can hand an agent reads without writes, and skip the directory
    // entirely — seven tool schemas it would otherwise pay for on every API call.
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
