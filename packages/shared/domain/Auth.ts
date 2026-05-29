import { z } from "zod"
import type { AxiosInstance } from "axios"

export namespace Auth {
    export namespace User {
        export const Id = z.uuid().brand("UserId");
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
        export namespace Me {
            export namespace Get {
                export const Request = z.object({})
                export type Request = z.infer<typeof Request>
                export const Response = z.object({
                    user: User.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function get(api: AxiosInstance, req: Get.Request = {}): Promise<Get.Response> {
                const { data } = await api.get<Get.Response>('/api/auth/me', { params: req })
                return data
            }
        }
    }
}
