import { z } from 'zod';
import { Auth, Execution } from '@pretzel-graph/shared/domain';

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
        })
    }
    export type Service = z.infer<typeof Service.Schema>

    /** A live execution. Built from the execution row, never sent by the worker. */
    export namespace Delegate {
        export const Schema = z.object({
            type: z.literal('delegate'),
            createdBy: Auth.User.Id.nullable(),
            executionId: Execution.Id,
            // Audit only, never an access-control input.
            via: z.custom<Execution.Igniter['variant']>(),
        })
    }
    export type Delegate = z.infer<typeof Delegate.Schema>

    export const Schema = z.discriminatedUnion('type', [User.Schema, Service.Schema, Delegate.Schema])
}
export type Principal = z.infer<typeof Principal.Schema>
