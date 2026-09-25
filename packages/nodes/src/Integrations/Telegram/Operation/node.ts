import { RuntimeNode, type InferOutputs } from '@pretzel-graph/node-sdk';

import { TelegramAPI, describeTelegramError, type Button } from '../client';
import { Blueprint } from './blueprint';
import { buildTools } from './tools';


export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {

        const fields = this.fieldValues;

        const { botToken } = this.context.credentialsAPI.getDecryptedValue(this.credentials.telegramBot.blob);

        const telegram = new TelegramAPI(this.httpClientFactory, botToken);

        // defineTool is terminal and total-replacing, so no run-mode field exists on this arm.
        if (fields.isConvertedToTool === true)
            return buildTools(telegram) satisfies InferOutputs<typeof Blueprint, typeof fields>;

        try {
            if (fields.resource === 'message')
                return await this.runMessage(telegram, fields);

            if (fields.resource === 'button') {
                await telegram.answerButton(fields.button_query_id, fields.button_text || undefined, fields.button_alert);

                return {};
            }

            if (fields.resource === 'file')
                return {
                    file: await telegram.readTextFile(fields.read_file_id),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            if (fields.chat_lookup === 'member')
                return {
                    member: await telegram.getMember(fields.chat_target_id, fields.member_user_id),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            if (fields.chat_lookup === 'admins')
                return {
                    admins: await telegram.listAdmins(fields.chat_target_id),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            return {
                chat: await telegram.getChat(fields.chat_target_id),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }
        catch (error) {
            throw describeTelegramError(error, `the ${fields.resource} operation`);
        }
    }


    private async runMessage(
        telegram: TelegramAPI,
        fields:   Extract<typeof this.fieldValues, { resource: 'message' }>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> {

        if (fields.message_action === 'send')
            return {
                message: await telegram.sendMessage(fields.send_chat_id, {
                    text:      fields.send_text,
                    parseMode: fields.send_format,
                    replyTo:   optionalNumber(fields.send_reply_to, 'Reply To'),
                    topicId:   optionalNumber(fields.send_topic_id, 'Topic ID'),
                    buttons:   parseButtons(fields.send_buttons),
                    silent:    fields.send_silent,
                }),
            };

        if (fields.message_action === 'file')
            return {
                file_message: await telegram.sendFile(fields.file_kind, fields.file_chat_id, {
                    source:    fields.file_source,
                    caption:   fields.file_caption || undefined,
                    parseMode: fields.file_format,
                    replyTo:   optionalNumber(fields.file_reply_to, 'Reply To'),
                    topicId:   optionalNumber(fields.file_topic_id, 'Topic ID'),
                }),
            };

        if (fields.message_action === 'edit')
            return {
                edited_message: await telegram.editMessage(
                    fields.edit_chat_id,
                    requiredNumber(fields.edit_message_id, 'Message ID'),
                    fields.edit_text,
                    fields.edit_format,
                ),
            };

        if (fields.message_action === 'delete') {
            await telegram.deleteMessage(fields.delete_chat_id, requiredNumber(fields.delete_message_id, 'Message ID'));

            return {};
        }

        if (fields.message_action === 'react') {
            await telegram.react(fields.react_chat_id, requiredNumber(fields.react_message_id, 'Message ID'), fields.react_emoji.trim() || null);

            return {};
        }

        if (fields.message_action === 'pin') {
            await telegram.pin(fields.pin_chat_id, requiredNumber(fields.pin_message_id, 'Message ID'), fields.pin_unpin);

            return {};
        }

        await telegram.startTyping(fields.typing_chat_id, optionalNumber(fields.typing_topic_id, 'Topic ID'));

        return {};
    }
}


// Message and topic ids are integers, but arrive through text fields.
const optionalNumber = (value: string | null | undefined, label: string) => {
    if (!value?.trim())
        return undefined;

    const parsed = Number(value.trim());

    if (!Number.isInteger(parsed))
        throw new Error(`${label} must be a whole number, got "${value}"`);

    return parsed;
};

const requiredNumber = (value: string, label: string) => {
    const parsed = optionalNumber(value, label);

    if (parsed === undefined)
        throw new Error(`${label} is required`);

    return parsed;
};

// "Label | data" makes a button press; "Label | https://…" makes a link. One button per row.
export const parseButtons = (lines: string[]): Button[][] => lines
    .filter(line => line.trim())
    .map(line => {
        const split = line.indexOf('|');

        if (split < 0)
            throw new Error(`Button "${line}" needs a "Label | data" pair`);

        const text   = line.slice(0, split).trim();
        const target = line.slice(split + 1).trim();

        if (/^https?:\/\//.test(target))
            return [{ text, url: target }];

        if (Buffer.byteLength(target) > 64)
            throw new Error(`Button "${text}" has data over Telegram's 64-byte limit`);

        return [{ text, callback_data: target }];
    });
