import { tool } from '@langchain/core/tools';
import { ToolBudget } from '@pretzel-graph/node-sdk';
import { z } from 'zod/v3';

import { TelegramAPI, describeTelegramError, type TelegramChat, type TelegramMember } from '../client';


const chatIdParam = z.string()
    .describe('Chat id. A Telegram event carries it as chatId; in a private chat it equals the person\'s user id. Group ids are negative.');

const messageIdParam = z.number().int()
    .describe('Message id, from an event\'s messageId or the id returned when the message was sent.');

const textParam = z.string().min(1).max(4096)
    .describe('Message text, at most 4096 characters. Plain text unless `html` is set.');

const htmlParam = z.boolean().default(false)
    .describe('Format with HTML: <b>, <i>, <code>, <pre>, <a href="…">. Escape <, > and & everywhere else, or sending fails.');


const listedChat = (chat: TelegramChat & Record<string, unknown>) => ({
    id:          String(chat.id),
    type:        chat.type,
    title:       chat.title ?? ([chat.first_name, chat.last_name].filter(Boolean).join(' ') || undefined),
    username:    chat.username,
    forum:       chat.is_forum || undefined,
    description: (chat.description as string | undefined) || (chat.bio as string | undefined) || undefined,
});

const listedMember = (member: TelegramMember & Record<string, unknown>) => ({
    id:       String(member.user.id),
    name:     [member.user.first_name, member.user.last_name].filter(Boolean).join(' '),
    username: member.user.username,
    bot:      member.user.is_bot || undefined,
    status:   member.status,
    title:    (member.custom_title as string | undefined) || undefined,
});


export function buildTools(telegram: TelegramAPI) {

    // ─── Write ────────────────────────────────────────────────────────────

    const sendMessage = tool(
        async ({ chat_id, text, html, reply_to_message_id, topic_id, buttons }) => {
            try {
                const message = await telegram.sendMessage(chat_id, {
                    text,
                    parseMode: html ? 'HTML' : 'none',
                    replyTo:   reply_to_message_id,
                    topicId:   topic_id,
                    buttons:   buttons?.map(button => [
                        button.url ? { text: button.text, url: button.url } : { text: button.text, callback_data: button.data ?? button.text },
                    ]),
                });

                return JSON.stringify({ message_id: message.message_id, sent: true });
            }
            catch (error) {
                throw describeTelegramError(error, 'sending a message');
            }
        },
        {
            name:        'telegram_send_message',
            description: 'Send a message to a Telegram chat. The bot can only message chats it is in, or people who have messaged it first. Longer text has to be split across calls.',
            schema: z.object({
                chat_id:             chatIdParam,
                text:                textParam,
                html:                htmlParam,
                reply_to_message_id: z.number().int().optional().describe('Reply to this message.'),
                topic_id:            z.number().int().optional().describe('Forum topic to post in, from an event\'s topicId.'),
                buttons:             z.array(z.object({
                    text: z.string().describe('The button label.'),
                    data: z.string().max(64).optional().describe('Sent back as the Button Pressed event\'s data, at most 64 bytes.'),
                    url:  z.string().optional().describe('Open this link instead of sending a press.'),
                })).optional().describe('Buttons under the message, one per row.'),
            }),
        },
    );


    const editMessage = tool(
        async ({ chat_id, message_id, text, html }) => {
            try {
                await telegram.editMessage(chat_id, message_id, text, html ? 'HTML' : 'none');

                return JSON.stringify({ message_id, edited: true });
            }
            catch (error) {
                throw describeTelegramError(error, 'editing a message');
            }
        },
        {
            name:        'telegram_edit_message',
            description: 'Rewrite the text of a message the bot itself sent. Useful for updating a status message in place.',
            schema: z.object({
                chat_id:    chatIdParam,
                message_id: messageIdParam,
                text:       textParam,
                html:       htmlParam,
            }),
        },
    );


    const react = tool(
        async ({ chat_id, message_id, emoji }) => {
            try {
                await telegram.react(chat_id, message_id, emoji ?? null);

                return JSON.stringify({ ok: true });
            }
            catch (error) {
                throw describeTelegramError(error, 'reacting to a message');
            }
        },
        {
            name:        'telegram_react',
            description: 'Set the bot\'s reaction on a Telegram message, replacing any earlier one. A lightweight acknowledgement when a full reply is not wanted.',
            schema: z.object({
                chat_id:    chatIdParam,
                message_id: messageIdParam,
                emoji:      z.string().optional().describe('One of Telegram\'s reaction emoji, such as 👍 ❤ 🔥 👀 🎉 🤔. Leave out to clear the reaction.'),
            }),
        },
    );


    const answerButton = tool(
        async ({ query_id, text, alert }) => {
            try {
                await telegram.answerButton(query_id, text, alert);

                return JSON.stringify({ ok: true });
            }
            catch (error) {
                throw describeTelegramError(error, 'answering a button press');
            }
        },
        {
            name:        'telegram_answer_button',
            description: 'Answer a button press, which stops the button\'s loading spinner. Call it once per press, from the queryId of a Button Pressed event.',
            schema: z.object({
                query_id: z.string().describe('The queryId of the Button Pressed event.'),
                text:     z.string().max(200).optional().describe('A short note shown to the person who pressed.'),
                alert:    z.boolean().default(false).describe('Show the note in a dialog instead of a brief toast.'),
            }),
        },
    );


    // ─── Directory ────────────────────────────────────────────────────────

    const getChat = tool(
        async ({ chat_id }) => {
            try {
                return JSON.stringify(listedChat(await telegram.getChat(chat_id)));
            }
            catch (error) {
                throw describeTelegramError(error, 'reading a chat');
            }
        },
        {
            name:        'telegram_get_chat',
            description: 'Read a Telegram chat: its type, title, username and description.',
            schema:      z.object({ chat_id: chatIdParam }),
        },
    );


    const getMember = tool(
        async ({ chat_id, user_id }) => {
            try {
                return JSON.stringify(listedMember(await telegram.getMember(chat_id, user_id)));
            }
            catch (error) {
                throw describeTelegramError(error, 'reading a member');
            }
        },
        {
            name:        'telegram_get_member',
            description: 'Read one member of a Telegram chat: their name and status (creator, administrator, member, restricted, left or kicked).',
            schema: z.object({
                chat_id: chatIdParam,
                user_id: z.string().describe('User id, from an event\'s from.id.'),
            }),
        },
    );


    const listAdmins = tool(
        async ({ chat_id }) => {
            try {
                const admins = await telegram.listAdmins(chat_id);

                return ToolBudget.list('admins', admins.map(listedMember));
            }
            catch (error) {
                throw describeTelegramError(error, 'listing admins');
            }
        },
        {
            name:        'telegram_list_admins',
            description: 'List the admins of a Telegram group. Bots cannot list ordinary members.',
            schema:      z.object({ chat_id: chatIdParam }),
        },
    );


    const readFile = tool(
        async ({ file_id }) => {
            try {
                return ToolBudget.value(await telegram.readTextFile(file_id), {
                    hint: 'The file is too large to read whole.',
                });
            }
            catch (error) {
                throw describeTelegramError(error, 'reading a file');
            }
        },
        {
            name:        'telegram_read_file',
            description: 'Read the text of a file someone sent the bot, such as a .txt, .csv, .md or .json. Binary files like images or PDFs cannot be read.',
            schema:      z.object({ file_id: z.string().describe('A fileId from the files list of a message event.') }),
        },
    );


    return {
        read_tools: [
            readFile,
        ],

        write_tools: [
            sendMessage,
            editMessage,
            react,
            answerButton,
        ],

        directory_tools: [
            getChat,
            getMember,
            listAdmins,
        ],
    };
}
