import { z } from "zod"

export namespace Auth {
    export namespace User {
        export const Id = z.string().brand("UserId");
        export type Id = z.infer<typeof Id>
        export const Schema = z.object({
            id: User.Id,
            username: z.string(),
            display_name: z.string(),
            is_admin: z.boolean(),

            avatar_url: z.string().nullable(),

            created_at: z.string(),
            updated_at: z.string(),
        })
    }
    export type User = z.infer<typeof User.Schema>
}