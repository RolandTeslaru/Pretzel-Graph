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

    /**
     * A running execution acting for the user who owns it. Built on the backend
     * from the execution row — never sent by the worker, which knows only its
     * own execution id.
     *
     * `actingAsUserId` is the privilege axis: it becomes auth.uid(). That is a
     * different question from who triggered the run, and the two come apart for
     * SDK invocation. A provenance name would force the wrong answer there —
     * see SPECS/delegated-execution-principal.md.
     */
    export namespace Delegate {
        export const Schema = z.object({
            type: z.literal('delegate'),
            actingAsUserId: Auth.User.Id,
            executionId: Execution.Id,
            // Derived from the igniter union so it can't drift. Audit only —
            // never an access-control input.
            via: z.custom<Execution.Igniter['variant']>(),
        })
    }
    export type Delegate = z.infer<typeof Delegate.Schema>

    export const Schema = z.discriminatedUnion('type', [User.Schema, Service.Schema, Delegate.Schema])
}
export type Principal = z.infer<typeof Principal.Schema>
