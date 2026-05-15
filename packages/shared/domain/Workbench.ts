import type { AxiosInstance } from "axios"
import z from "zod"
import { Workflow as WorkflowNs } from "./Workflow"
import { VersionControlPublication } from "./VersionControlPublication"

export namespace Workbench {
    export namespace API {
        export namespace Workflow {
            export namespace Create {
                export const Request = z.object({
                    workflow: WorkflowNs.Schema,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    workflow_id: WorkflowNs.Id,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function create(api: AxiosInstance, request: Create.Request): Promise<Create.Response> {
                const { data } = await api.post<Create.Response>("/api/workbench/workflows", request)
                return data
            }

            export namespace Get {
                export const Request = z.object({
                    workflowId: WorkflowNs.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    workflow: WorkflowNs.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function get(api: AxiosInstance, request: Get.Request, abortSignal?: AbortSignal): Promise<Get.Response> {
                const { data } = await api.get<Get.Response>(`/api/workbench/workflows/${request.workflowId}`, { signal: abortSignal })
                return data
            }

            export namespace Commit {
                export const Request = z.object({
                    workflowId: WorkflowNs.Id,
                    data: WorkflowNs.Data.Schema,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({})
                export type Response = z.infer<typeof Response>
            }

            export async function commit(api: AxiosInstance, request: Commit.Request): Promise<Commit.Response> {
                const { data } = await api.post<Commit.Response>("/api/workbench/workflows/commit", request)
                return data
            }
        }

        export namespace Dependency {
            export namespace Load {
                export const Request = z.object({
                    dependencyId: WorkflowNs.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    dependency: WorkflowNs.Dependency.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function load(api: AxiosInstance, request: Load.Request): Promise<Load.Response> {
                const { data } = await api.get<Load.Response>(`/api/workbench/dependencies/workflows/${request.dependencyId}`)
                return data
            }

            export namespace CheckUpdates {
                export const Request = z.object({
                    dependencies: z.array(z.object({
                        workflowId:    WorkflowNs.Id,
                        publicationId: VersionControlPublication.Id,
                    })),
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    updates: z.record(WorkflowNs.Id, WorkflowNs.Dependency.UpdateInfo),
                })
                export type Response = z.infer<typeof Response>
            }

            export async function checkUpdates(api: AxiosInstance, request: CheckUpdates.Request): Promise<CheckUpdates.Response> {
                const { data } = await api.post<CheckUpdates.Response>(`/api/workbench/dependencies/check-updates`, request)
                return data
            }
        }
    }
}
