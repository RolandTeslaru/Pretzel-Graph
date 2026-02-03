import { api } from "@/SDKs/ApiInterceptorSDK/sdk"
import { Shelf } from "@vx-agent-editor/shared/types"

export namespace ShelfAPI {

    export namespace Drawer {
        export namespace Get {
            export async function fetch(
                drawerId: Shelf.Drawer.Id
            ): Promise<Response> {
                const { data } = await api.get(`/api/v2/blueprints/drawer/${drawerId}`)
                return data;
            }
        }

        export namespace GetAllIds {
            export async function fetch(): Promise<Shelf.API.Drawer.GetAllIds.Response> {
                const { data } = await api.get(`/api/v2/blueprints/drawer/ids`)
                return data;
            }
        }
    }

    export namespace Blueprint {
        export namespace Get {
            export async function fetch(
                {blueprintId}: Shelf.API.Blueprint.Get.Request
            ): Promise<Shelf.API.Blueprint.Get.Response> {
                const { data } = await api.get(`/api/v2/blueprints/blueprint/${blueprintId}`)
                return data;
            }
        }
    }
}