import type { AxiosInstance } from "axios"
import { z } from "zod"
import { Dependency } from "./Dependency"
import { WorkflowId } from "./Workflow/ids"

// The sources a dependency is taken from: draft and published workflows, and listings.
export namespace Resource {
    export namespace API {
        // A resource's current state, shaped as the snapshot a dependency embeds.
        export namespace Load {
            export const Request = Dependency.Ref.Schema
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                dependency: Dependency.Value.Schema,
            })
            export type Response = z.infer<typeof Response>
        }

        export async function load(api: AxiosInstance, request: Load.Request): Promise<Load.Response> {
            const { data } = await api.get<Load.Response>(`/api/resources/${request.kind}/${request.id}`)
            return data
        }

        // Newer versions of the resources a saved workflow depends on.
        export namespace CheckUpdates {
            export const Request = z.object({
                workflowId: WorkflowId,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                updates: z.array(Dependency.Update.Schema),
            })
            export type Response = z.infer<typeof Response>
        }

        export async function checkUpdates(api: AxiosInstance, request: CheckUpdates.Request): Promise<CheckUpdates.Response> {
            const { data } = await api.post<CheckUpdates.Response>(`/api/resources/check-updates`, request)
            return data
        }
    }
}
