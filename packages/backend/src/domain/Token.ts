import { z } from 'zod';

export namespace Token {
    export const UserSupabaseJWT = z.string().min(1).brand('UserSupabaseJWT');
    export type UserSupabaseJWT = z.infer<typeof UserSupabaseJWT>

    export const InternalService = z.string().min(1).brand('InternalServiceToken');
    export type InternalService = z.infer<typeof InternalService>

    export const Schema = z.union([UserSupabaseJWT, InternalService]);
}
export type Token = z.infer<typeof Token.Schema>
