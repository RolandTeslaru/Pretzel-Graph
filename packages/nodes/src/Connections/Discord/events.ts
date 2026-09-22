import { z } from 'zod';
import { Gateway } from '@pretzel-graph/shared/domain';

export namespace Discord {
    export namespace Event {
        export const Message = Gateway.Socket.Event.extend({
            provider:      z.literal('discord'),
            type:          z.literal('message'),
            messageId:     z.string(),
            channelId:     z.string(),
            authorId:      z.string(),
            authorName:    z.string(),
            authorIsBot:   z.boolean(),
            content:       z.string(),
            directMessage: z.boolean(),
            createdAt:     z.string(),
            // Everything Discord sent, for nodes needing more than the mapped fields.
            raw:           z.json(),
        });
        export type Message = z.infer<typeof Message>;

        export const Schema = z.discriminatedUnion('type', [Message]);
    }
    export type Event = z.infer<typeof Event.Schema>;
}
