import { defineCredential, defineField } from '@pretzel-graph/node-sdk';

// One token, sent the way the connection's authentication field says.
export const WebSocketToken = defineCredential({
    id: 'webSocketToken',
    displayName: 'WebSocket Token',
    icon: 'WebSocket',
    fields: [
        defineField.Password('token', 'Token', {
            required: true,
        }),
    ],
});
