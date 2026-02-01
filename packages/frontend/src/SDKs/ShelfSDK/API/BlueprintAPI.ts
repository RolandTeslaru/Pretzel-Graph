import { z } from "zod"
import { api } from "@/SDKs/ApiInterceptorSDK/sdk"
import { Shelf } from "@vx-agent-builder/shared/types"

export namespace ShelfAPI {


    export namespace Drawer {
        export namespace Get {
            export const Query = Shelf.API.Drawer.Get.Request
            export const Response = Shelf.API.Drawer.Get.Response

            export type Query = z.infer<typeof Query>
            export type Response = z.infer<typeof Response>

            export async function fetch(
                drawerId: Shelf.Drawer.Id
            ): Promise<Response> {
                const { data } = await api.get(`/api/v2/blueprints/drawer/${drawerId}`)
                return data;
            }
        }

        export namespace GetAllIds {
            export const Query = Shelf.API.Drawer.GetAllIds.Request
            export const Response = Shelf.API.Drawer.GetAllIds.Response

            export type Query = z.infer<typeof Query>
            export type Response = z.infer<typeof Response>

            export async function fetch(): Promise<Response> {
                const { data } = await api.get(`/api/v2/blueprints/drawer/ids`)
                return data;
            }
        }
    }



    export namespace Blueprint {
        export namespace Get {
            export const Query = Shelf.API.Blueprint.Get.Request
            export const Response = Shelf.API.Blueprint.Get.Response

            export type Query = z.infer<typeof Query>
            export type Response = z.infer<typeof Response>

            export async function fetch(
                blueprintId: Shelf.Blueprint.Id
            ): Promise<Response> {
                const { data } = await api.get(`/api/v2/blueprints/blueprint/${blueprintId}`)
                return data;
            }
        }
    }
}