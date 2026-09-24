import { RuntimeNode, type InferOutputs } from '@pretzel-graph/node-sdk';

import { SlackAPI, describeSlackError, type ChannelKind, type Page } from '../client';
import { Blueprint } from './blueprint';
import { buildTools } from './tools';


export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {

        const fields = this.fieldValues;

        const { botToken } = this.context.credentialsAPI.getDecryptedValue(this.credentials.slackBot.blob);

        const slack = new SlackAPI(this.httpClientFactory, botToken);

        // defineTool is terminal and total-replacing, so no run-mode field exists on this arm.
        if (fields.isConvertedToTool === true)
            return buildTools(slack) satisfies InferOutputs<typeof Blueprint, typeof fields>;

        try {
            if (fields.resource === 'message')
                return await this.runMessage(slack, fields);

            if (fields.resource === 'channel') {

                if (fields.channel_action === 'get')
                    return {
                        channel: await slack.getChannel(fields.channel_target_id),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                if (fields.channel_action === 'join')
                    return {
                        joined_channel: await slack.joinChannel(fields.channel_join_id),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                const kinds: ChannelKind[] = fields.channel_include_private
                    ? ['public_channel', 'private_channel']
                    : ['public_channel'];

                return {
                    channels: await collect(fields.channel_limit, (limit, cursor) =>
                        slack.listChannels(kinds, limit, cursor, fields.channel_include_archived),
                    ),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            if (fields.user_lookup === 'get')
                return {
                    user: await slack.getUser(fields.user_id),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            if (fields.user_lookup === 'email')
                return {
                    found_user: await slack.findUserByEmail(fields.user_email.trim()),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            return {
                users: await collect(fields.user_limit, (limit, cursor) => slack.listUsers(limit, cursor)),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }
        catch (error) {
            throw describeSlackError(error, `the ${fields.resource} operation`);
        }
    }


    private async runMessage(
        slack:  SlackAPI,
        fields: Extract<typeof this.fieldValues, { resource: 'message' }>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> {

        if (fields.message_action === 'send') {

            const channelId = fields.send_target === 'user'
                ? await slack.openDM(fields.send_user_id)
                : fields.send_channel_id;

            const threadTs = fields.send_target === 'channel' ? fields.send_thread_ts || undefined : undefined;

            const sent = await slack.sendMessage(channelId, {
                text:      fields.send_text,
                threadTs,
                broadcast: fields.send_target === 'channel' ? fields.send_broadcast : undefined,
                unfurl:    fields.send_unfurl,
            });

            return { message: { ...sent.message, channel: sent.channel } };
        }

        if (fields.message_action === 'ephemeral')
            return {
                ephemeral_message: await slack.sendEphemeral(
                    fields.ephemeral_channel_id,
                    fields.ephemeral_user_id,
                    fields.ephemeral_text,
                    fields.ephemeral_thread_ts || undefined,
                ),
            };

        if (fields.message_action === 'respond') {
            await slack.respond(fields.respond_url, fields.respond_text, fields.respond_in_channel, fields.respond_replace);

            return {};
        }

        if (fields.message_action === 'fetch') {
            const { items } = await slack.fetchMessages(fields.fetch_channel_id, {
                limit:  fields.fetch_limit,
                oldest: fields.fetch_oldest || undefined,
                latest: fields.fetch_latest || undefined,
            });

            return { messages: items };
        }

        if (fields.message_action === 'thread')
            return {
                replies: await collect(fields.thread_limit, (limit, cursor) =>
                    slack.fetchThread(fields.thread_channel_id, fields.thread_ts, limit, cursor),
                ),
            };

        if (fields.message_action === 'edit')
            return {
                edited_message: await slack.editMessage(fields.edit_channel_id, fields.edit_ts, fields.edit_text),
            };

        if (fields.message_action === 'delete') {
            await slack.deleteMessage(fields.delete_channel_id, fields.delete_ts);

            return {};
        }

        if (fields.message_action === 'react') {
            await slack.react(fields.react_channel_id, fields.react_ts, fields.react_emoji, fields.react_remove);

            return {};
        }

        if (fields.message_action === 'pin') {
            await slack.pin(fields.pin_channel_id, fields.pin_ts, fields.pin_unpin);

            return {};
        }

        return { pinned_messages: await slack.listPins(fields.pins_channel_id) };
    }
}


// Follows Slack's cursor until the limit is reached or the list runs out.
async function collect<T>(limit: number, fetchPage: (limit: number, cursor?: string) => Promise<Page<T>>): Promise<T[]> {
    const items: T[] = [];

    let cursor: string | undefined;

    do {
        const page = await fetchPage(Math.min(200, limit - items.length), cursor);

        items.push(...page.items);

        cursor = page.nextCursor ?? undefined;
    }
    while (cursor && items.length < limit);

    return items.slice(0, limit);
}
