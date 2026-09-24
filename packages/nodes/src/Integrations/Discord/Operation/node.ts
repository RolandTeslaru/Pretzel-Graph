import { RuntimeNode, type InferOutputs } from '@pretzel-graph/node-sdk';

import { DiscordAPI, describeDiscordError } from '../client';
import { Blueprint } from './blueprint';
import { buildTools } from './tools';


export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {

        const fields = this.fieldValues;

        const { botToken } = this.context.credentialsAPI.getDecryptedValue(this.credentials.discordBot.blob);

        const discord = new DiscordAPI(botToken);

        // defineTool is terminal and total-replacing, so no run-mode field exists on this arm.
        if (fields.isConvertedToTool === true)
            return buildTools(discord) satisfies InferOutputs<typeof Blueprint, typeof fields>;

        try {
            if (fields.resource === 'message')
                return await this.runMessage(discord, fields);

            if (fields.resource === 'channel') {

                if (fields.channel_lookup === 'get')
                    return {
                        channel: await discord.getChannel(fields.channel_target_id),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                return {
                    channels: await discord.listChannels(fields.channel_server_id),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            if (fields.resource === 'member') {

                if (fields.member_lookup === 'get')
                    return {
                        member: await discord.getMember(fields.member_server_id, fields.member_user_id),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                return {
                    members: await discord.searchMembers(
                        fields.member_server_id,
                        fields.member_query,
                        fields.member_limit,
                    ),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            if (fields.resource === 'role')
                return {
                    roles: await discord.listRoles(fields.role_server_id),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            if (fields.server_lookup === 'get')
                return {
                    server: await discord.getServer(fields.server_target_id),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            return {
                servers: await discord.listServers(),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }
        catch (error) {
            throw describeDiscordError(error, `the ${fields.resource} operation`);
        }
    }


    private async runMessage(
        discord: DiscordAPI,
        fields:  Extract<typeof this.fieldValues, { resource: 'message' }>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> {

        if (fields.message_action === 'send') {

            const channelId = fields.send_target === 'user'
                ? await discord.openDM(fields.send_user_id)
                : fields.send_channel_id;

            return {
                message: await discord.sendMessage(channelId, {
                    content:          fields.send_content,
                    replyToId:        fields.send_target === 'channel' ? fields.send_reply_to_id || undefined : undefined,
                    suppressMentions: fields.send_suppress_mentions,
                }),
            };
        }

        if (fields.message_action === 'fetch')
            return {
                messages: await discord.fetchMessages(fields.fetch_channel_id, {
                    limit:    fields.fetch_limit,
                    anchor:   fields.fetch_anchor,
                    anchorId: fields.fetch_anchor === 'latest' ? undefined : fields.fetch_anchor_id,
                }),
            };

        if (fields.message_action === 'edit')
            return {
                edited_message: await discord.editMessage(
                    fields.edit_channel_id,
                    fields.edit_message_id,
                    fields.edit_content,
                ),
            };

        if (fields.message_action === 'react') {
            await discord.react(
                fields.react_channel_id,
                fields.react_message_id,
                fields.react_emoji,
                fields.react_remove,
            );

            return {};
        }

        if (fields.message_action === 'typing') {
            await discord.startTyping(fields.typing_channel_id);

            return {};
        }

        if (fields.message_action === 'pin') {
            await discord.pin(fields.pin_channel_id, fields.pin_message_id, fields.pin_unpin);

            return {};
        }

        return { pinned_messages: await discord.listPins(fields.pins_channel_id) };
    }
}
