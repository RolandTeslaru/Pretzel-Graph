import { z } from 'zod';
import { Auth } from '@pretzel-graph/shared/domain';

export namespace Principal {
    export namespace User {
        export const Schema = z.object({
            type: z.literal('user'),
            userId: Auth.User.Id,
        })
    }
    export type User = z.infer<typeof User.Schema>

    export namespace Service {
        export const Schema = z.object({
            type: z.literal('service'),
            service: z.string(),
            authorizedByUserId: Auth.User.Id.optional(),
        })
    }
    export type Service = z.infer<typeof Service.Schema>

    export const Schema = z.discriminatedUnion('type', [User.Schema, Service.Schema])
}
export type Principal = z.infer<typeof Principal.Schema>
