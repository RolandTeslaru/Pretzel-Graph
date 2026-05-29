import type { AxiosInstance } from "axios"
import z from "zod"
import { Workflow as WorkflowNs } from "./Workflow"
import { VersionControlPublication } from "./VersionControlPublication"
import { Foundations } from "./index"

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
                const { data } = await api.post<Commit.Response>(
                    "/api/workbench/workflows/commit",
                    request,
                    { timeout: 8_000 },
                )
                return data
            }
        }

        export namespace Dependency {
            export namespace Published {
                export namespace Load {
                    export const Request = z.object({
                        dependencyId: WorkflowNs.Id,
                    })
                    export type Request = z.infer<typeof Request>

                    export const Response = z.object({
                        dependency: WorkflowNs.Dependency.Publication.Schema,
                    })
                    export type Response = z.infer<typeof Response>
                }

                export async function load(api: AxiosInstance, request: Published.Load.Request): Promise<Published.Load.Response> {
                    const { data } = await api.get<Published.Load.Response>(`/api/workbench/dependencies/workflows/${request.dependencyId}/published`)
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
                        updates: z.record(WorkflowNs.Id, WorkflowNs.Dependency.Publication.UpdateInfo),
                    })
                    export type Response = z.infer<typeof Response>
                }

                export async function checkUpdates(api: AxiosInstance, request: Published.CheckUpdates.Request): Promise<Published.CheckUpdates.Response> {
                    const { data } = await api.post<Published.CheckUpdates.Response>(`/api/workbench/dependencies/check-updates`, request)
                    return data
                }
            }

            export namespace Draft {
                export namespace Load {
                    export const Request = z.object({
                        dependencyId: WorkflowNs.Id,
                    })
                    export type Request = z.infer<typeof Request>

                    export const Response = z.object({
                        dependency: WorkflowNs.Dependency.Draft.Schema,
                    })
                    export type Response = z.infer<typeof Response>
                }

                export async function load(api: AxiosInstance, request: Draft.Load.Request): Promise<Draft.Load.Response> {
                    const { data } = await api.get<Draft.Load.Response>(`/api/workbench/dependencies/workflows/${request.dependencyId}/draft`)
                    return data
                }

                export namespace CheckUpdates {
                    export const Request = z.object({
                        dependencies: z.array(z.object({
                            workflowId:          WorkflowNs.Id,
                            workflow_updated_at: z.coerce.date(),
                        })),
                    })
                    export type Request = z.infer<typeof Request>

                    export const Response = z.object({
                        updates: z.record(WorkflowNs.Id, WorkflowNs.Dependency.Draft.UpdateInfo),
                    })
                    export type Response = z.infer<typeof Response>
                }

                export async function checkUpdates(api: AxiosInstance, request: Draft.CheckUpdates.Request): Promise<Draft.CheckUpdates.Response> {
                    const { data } = await api.post<Draft.CheckUpdates.Response>(`/api/workbench/dependencies/check-draft-updates`, request)
                    return data
                }
            }
        }

        export namespace Field {
            export namespace ResourceLoader {
                export namespace LoadOptions {
                    export const Request = z.object({
                        blueprintId: Foundations.Blueprint.Id,
                        loaderId: Foundations.Field.ResourceLoader.LoaderId,
                        fieldValues: z.record(z.string(), z.any()).default({}),
                        searchQuery: z.string().optional(),
                        paginationCursor: z.string().optional(),
                    })
                    export type Request = z.infer<typeof Request>

                    export const Response = z.object({
                        options: z.array(Foundations.Field.ResourceLoader.OptionItem),
                        nextPaginationCursor: z.string().optional(),
                    })
                    export type Response = z.infer<typeof Response>
                }

                export async function loadOptions(
                    api: AxiosInstance,
                    request: LoadOptions.Request,
                ): Promise<LoadOptions.Response> {
                    const { data } = await api.post<LoadOptions.Response>(
                        '/api/workbench/field/resource-loader/load-options', request
                    )
                    return data
                }
            }
        }
    }
}
