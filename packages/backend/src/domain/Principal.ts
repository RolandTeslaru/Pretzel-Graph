import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { Auth } from '@vx-agent-editor/shared/domain';

const SupabaseClientSchema = z.custom<SupabaseClient>(
    (value) => typeof value === 'object' && value !== null,
    'Expected SupabaseClient'
);

export namespace Principal {
    export namespace User {
        export const Schema = z.object({
            type: z.literal('user'),
            userId: Auth.User.Id,
            supabase: SupabaseClientSchema,
        })
    }
    export type User = z.infer<typeof User.Schema>

    export namespace Service {
        export const Schema = z.object({
            type: z.literal('service'),
            service: z.string(),
            authorizedByUserId: Auth.User.Id.optional(),
            supabase: SupabaseClientSchema,
        })
    }
    export type Service = z.infer<typeof Service.Schema>

    export const Schema = z.discriminatedUnion('type', [User.Schema, Service.Schema])
}
export type Principal = z.infer<typeof Principal.Schema>
