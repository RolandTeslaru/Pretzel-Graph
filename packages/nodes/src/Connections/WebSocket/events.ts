import { z } from 'zod';
import { Gateway } from '@pretzel-graph/shared/domain';

export namespace WebSocketConnection {
    export namespace Event {
        export const Message = Gateway.Socket.Event.extend({
            type:       z.literal('message'),
            // Parsed JSON when the connection reads JSON, the raw text otherwise.
            data:       z.json(),
            receivedAt: z.string(),
        });
        export type Message = z.infer<typeof Message>;

        export const Schema = z.discriminatedUnion('type', [Message]);
    }
    export type Event = z.infer<typeof Event.Schema>;
}
