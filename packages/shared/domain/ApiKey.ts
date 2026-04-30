import { z } from "zod"
import { Auth } from "./Auth"

export namespace ApiKey {

    export const Id = z.string().brand("ApiKeyId")
    export type Id = z.infer<typeof Id>

    // Raw key format: pg_live_<32-char-base62>. Returned once at creation, never stored.
    export const Raw = z.string().regex(/^pg_live_[A-Za-z0-9]{32}$/)
    export type Raw = z.infer<typeof Raw>

    // Public-safe shape for the dashboard. Never includes key_hash.
    export const Schema = z.object({
        id:           Id,
        user_id:      Auth.User.Id,
        name:         z.string(),
        prefix:       z.string(),
        last_used_at: z.iso.datetime().nullable(),
        expires_at:   z.iso.datetime().nullable(),
        revoked_at:   z.iso.datetime().nullable(),
        created_at:   z.iso.datetime(),
    })
    export type Schema = z.infer<typeof Schema>

    export namespace API {
        export namespace Create {
            export const Request  = z.object({ name: z.string().min(1).max(64) })
            export type Request   = z.infer<typeof Request>
            export const Response = z.object({ apiKey: Schema, raw: Raw })
            export type Response  = z.infer<typeof Response>
        }
        export namespace List {
            export const Request  = z.object({})
            export type Request   = z.infer<typeof Request>
            export const Response = z.object({ apiKeys: z.array(Schema) })
            export type Response  = z.infer<typeof Response>
        }
        export namespace Revoke {
            export const Request  = z.object({ id: Id })
            export type Request   = z.infer<typeof Request>
            export const Response = z.object({})
            export type Response  = z.infer<typeof Response>
        }
    }
}
