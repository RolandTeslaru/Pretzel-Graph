import { defineCredential, defineField } from '@pretzel-graph/node-sdk';

export const DiscordBot = defineCredential({
    id: 'discordBot',
    displayName: 'Discord Bot',
    icon: 'MessagesSquare',
    fields: [
        defineField.Password('botToken', 'Bot Token', {
            required: true,
        }),
    ],
});
