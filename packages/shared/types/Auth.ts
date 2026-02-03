import { z } from "zod"
import { createApiResponse } from "../api/utils";

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


    export namespace API {
        export namespace User {
            export namespace Login {
                export const Query = z.object({
                    username: z.string(),
                    password: z.string(),
                })

                export const Response = createApiResponse(z.object({}))
            }


            export namespace Logout {
                export const Query = z.object({})
                export const Response = createApiResponse(z.object({}))
            }


            export namespace Refresh {
                export const Query = z.object({})

                export const Response = createApiResponse(z.object({
                    access_token: z.string(),
                    refresh_token: z.string(),
                    token_type: z.string(),
                }))
            }


            export namespace Get {
                export const Query = z.object({})

                export const Response = createApiResponse(z.object({
                    id: z.string(),
                    username: z.string(),
                    is_active: z.boolean(),
                    is_superuser: z.boolean(),
                    create_at: z.string(),
                    updated_at: z.string(),
                }))
            }


            export namespace AutoLogin {
                export const Query = z.object({})

                export const Response = createApiResponse(z.object({
                    access_token: z.string(),
                    refresh_token: z.string()
                }))
            }
        }
    }
}