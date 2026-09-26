import { defineCredential, defineField } from '@pretzel-graph/node-sdk';

export const TelegramBot = defineCredential({
    id: 'telegramBot',
    displayName: 'Telegram Bot',
    icon: 'Telegram',
    fields: [
        defineField.Password('botToken', 'Bot Token', {
            required: true,
            tooltip:  'The token @BotFather gives when you create the bot, such as 123456:ABC-DEF…',
        }),
    ],
});
