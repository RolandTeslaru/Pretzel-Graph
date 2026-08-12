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

            email: z.string().nullable(),
            avatar_url: z.string().nullable(),

            created_at: z.string(),
            updated_at: z.string(),
        })

        // Editable profile fields. Deliberately excludes is_admin (privilege escalation)
        // and email (owned by supabase auth, changing it needs a confirmation round trip).
        export const Username = z.string().trim()
            .min(3, 'Username must be at least 3 characters')
            .max(32, 'Username must be at most 32 characters')
            .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, hyphens and underscores only')

        export const DisplayName = z.string().trim()
            .min(1, 'Display name is required')
            .max(64, 'Display name must be at most 64 characters')
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

            export namespace Update {
                export const Request = z.object({
                    username: User.Username,
                    display_name: User.DisplayName,
                })
                export type Request = z.infer<typeof Request>
                export const Response = z.object({
                    user: User.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function update(api: AxiosInstance, req: Update.Request): Promise<Update.Response> {
                const { data } = await api.patch<Update.Response>('/api/auth/me', req)
                return data
            }
        }
    }
}
