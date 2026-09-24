import { defineCredential, defineField } from '@pretzel-graph/node-sdk';

export const SlackBot = defineCredential({
    id: 'slackBot',
    displayName: 'Slack Bot',
    icon: 'Slack',
    fields: [
        defineField.Password('botToken', 'Bot Token', {
            required: true,
            tooltip:  'The Bot User OAuth Token, starting with xoxb-.',
        }),
        defineField.Password('appToken', 'App Token', {
            tooltip: 'An app-level token with the connections:write scope, starting with xapp-. Needed to receive events.',
        }),
    ],
});
