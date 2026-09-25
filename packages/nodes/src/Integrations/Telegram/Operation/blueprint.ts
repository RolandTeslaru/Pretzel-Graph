import { defineBlueprint, defineField, defineOutput, defineTool } from '@pretzel-graph/node-sdk';
import { TelegramBot } from '@pretzel-graph/nodes/Credentials';

const CHAT_TOOLTIP = 'A Telegram event carries this as chatId. In a private chat it is the person\'s user id.';

const MESSAGE_TOOLTIP = 'A Telegram event carries this as messageId.';

const formatField = (id: string) => defineField.MultiOption(id, 'Format', {
    options: [
        { value: 'none',       displayName: 'Plain Text' },
        { value: 'HTML',       displayName: 'HTML', description: '<b>, <i>, <code>, <pre>, <a href="…">; escape <, > and & elsewhere.' },
        { value: 'MarkdownV2', displayName: 'MarkdownV2', description: 'Every _ * [ ] ( ) ~ ` > # + - = | { } . ! outside markup must be escaped.' },
    ],
    initialValue: 'none',
    variant:      'tab',
});

// The resource, then what you do to it; field ids are unique across the whole tree.
export const Blueprint = defineBlueprint({
    id:             'Integrations.Telegram.Operation',
    displayName:    'Telegram',
    description:    'Sends, edits and reacts to Telegram messages, answers button presses, and reads chats and files.',
    icon:           'Telegram',
    accent:         'utility',
    toolCompatible: true,
    credentials:    [TelegramBot],

    fields: [
        defineField.MultiOption('resource', 'Resource', {
            options: [
                { value: 'message', displayName: 'Message', description: 'Send, edit, delete, react to and pin messages.' },
                { value: 'button',  displayName: 'Button',  description: 'Answer a button press.' },
                { value: 'chat',    displayName: 'Chat',    description: 'Read a chat, a member, or its admins.' },
                { value: 'file',    displayName: 'File',    description: 'Read a text file someone sent.' },
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
                    { value: 'send',   displayName: 'Send' },
                    { value: 'file',   displayName: 'Send File' },
                    { value: 'edit',   displayName: 'Edit' },
                    { value: 'delete', displayName: 'Delete' },
                    { value: 'react',  displayName: 'React' },
                    { value: 'pin',    displayName: 'Pin' },
                    { value: 'typing', displayName: 'Typing' },
                ],
                initialValue: 'send',
            }),
        ],

        'message_action==send': {
            fields: [
                defineField.String('send_chat_id', 'Chat ID', { required: true, tooltip: CHAT_TOOLTIP }),
                defineField.String('send_text', 'Text', { required: true, multiline: true }),
                formatField('send_format'),
                defineField.List('send_buttons', 'Buttons', {
                    tooltip: 'One button per line, as "Label | data" for a button press, or "Label | https://…" for a link.',
                }),
                defineField.String('send_reply_to', 'Reply To', { tooltip: 'Message id to reply to. Leave empty for a new message.' }),
                defineField.String('send_topic_id', 'Topic ID', { advanced: true, tooltip: 'Forum topic to post in. An event carries it as topicId.' }),
                defineField.Boolean('send_silent', 'Silent', { initialValue: false, tooltip: 'Deliver without a notification sound.' }),
            ],
            outputs: [defineOutput.Data('message', 'Message')],
        },

        'message_action==file': {
            fields: [
                defineField.String('file_chat_id', 'Chat ID', { required: true, tooltip: CHAT_TOOLTIP }),
                defineField.MultiOption('file_kind', 'Kind', {
                    options: [
                        { value: 'document',  displayName: 'Document' },
                        { value: 'photo',     displayName: 'Photo' },
                        { value: 'video',     displayName: 'Video' },
                        { value: 'audio',     displayName: 'Audio' },
                        { value: 'voice',     displayName: 'Voice' },
                        { value: 'animation', displayName: 'Animation' },
                    ],
                    initialValue: 'document',
                }),
                defineField.String('file_source', 'Source', {
                    required: true,
                    tooltip:  'A public https URL, or the fileId of a file from a Telegram event.',
                }),
                defineField.String('file_caption', 'Caption', { multiline: true }),
                formatField('file_format'),
                defineField.String('file_reply_to', 'Reply To', { tooltip: 'Message id to reply to.' }),
                defineField.String('file_topic_id', 'Topic ID', { advanced: true }),
            ],
            outputs: [defineOutput.Data('file_message', 'Message')],
        },

        'message_action==edit': {
            fields: [
                defineField.String('edit_chat_id', 'Chat ID', { required: true, tooltip: CHAT_TOOLTIP }),
                defineField.String('edit_message_id', 'Message ID', { required: true, tooltip: 'Only messages the bot sent can be edited.' }),
                defineField.String('edit_text', 'Text', { required: true, multiline: true }),
                formatField('edit_format'),
            ],
            outputs: [defineOutput.Data('edited_message', 'Message')],
        },

        'message_action==delete': {
            fields: [
                defineField.String('delete_chat_id', 'Chat ID', { required: true, tooltip: CHAT_TOOLTIP }),
                defineField.String('delete_message_id', 'Message ID', { required: true, tooltip: MESSAGE_TOOLTIP }),
            ],
        },

        'message_action==react': {
            fields: [
                defineField.String('react_chat_id', 'Chat ID', { required: true, tooltip: CHAT_TOOLTIP }),
                defineField.String('react_message_id', 'Message ID', { required: true, tooltip: MESSAGE_TOOLTIP }),
                defineField.String('react_emoji', 'Emoji', {
                    placeholder: '👍',
                    tooltip:     'One of Telegram\'s reaction emoji. Leave empty to clear the bot\'s reaction.',
                }),
            ],
        },

        'message_action==pin': {
            fields: [
                defineField.String('pin_chat_id', 'Chat ID', { required: true, tooltip: CHAT_TOOLTIP }),
                defineField.String('pin_message_id', 'Message ID', { required: true, tooltip: MESSAGE_TOOLTIP }),
                defineField.Boolean('pin_unpin', 'Unpin', { initialValue: false }),
            ],
        },

        'message_action==typing': {
            fields: [
                defineField.String('typing_chat_id', 'Chat ID', {
                    required: true,
                    tooltip:  'Shows the bot as typing there for about five seconds, or until it sends.',
                }),
                defineField.String('typing_topic_id', 'Topic ID', { advanced: true }),
            ],
        },
    },


    // ─── Button ───────────────────────────────────────────────────────────

    'resource==button': {
        fields: [
            defineField.String('button_query_id', 'Query ID', {
                required: true,
                tooltip:  'A Button Pressed event carries this as queryId. The button spins until it is answered.',
            }),
            defineField.String('button_text', 'Text', { tooltip: 'Shown briefly to the person who pressed. Leave empty to just stop the spinner.' }),
            defineField.Boolean('button_alert', 'Show as Alert', { initialValue: false, tooltip: 'Show the text in a dialog they have to dismiss.' }),
        ],
    },


    // ─── Chat ─────────────────────────────────────────────────────────────

    'resource==chat': {
        fields: [
            defineField.String('chat_target_id', 'Chat ID', { required: true, tooltip: CHAT_TOOLTIP }),
            defineField.MultiOption('chat_lookup', 'Lookup', {
                options: [
                    { value: 'get',    displayName: 'Get'    },
                    { value: 'member', displayName: 'Member' },
                    { value: 'admins', displayName: 'Admins' },
                ],
                initialValue: 'get',
                variant:      'tab',
            }),
        ],

        'chat_lookup==get': {
            outputs: [defineOutput.Data('chat', 'Chat')],
        },

        'chat_lookup==member': {
            fields:  [defineField.String('member_user_id', 'User ID', { required: true, tooltip: 'An event carries this as from.id.' })],
            outputs: [defineOutput.Data('member', 'Member')],
        },

        'chat_lookup==admins': {
            outputs: [defineOutput.DataList('admins', 'Admins')],
        },
    },


    // ─── File ─────────────────────────────────────────────────────────────

    'resource==file': {
        fields: [
            defineField.String('read_file_id', 'File ID', {
                required: true,
                tooltip:  'A message event lists its files, each with a fileId.',
            }),
        ],
        outputs: [defineOutput.Data('file', 'File')],
    },


    // Bots get no message history, so reading is files only; the conversation comes from the recorded chat.
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
