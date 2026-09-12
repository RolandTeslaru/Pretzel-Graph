import type { AxiosInstance } from "axios"
import z from "zod"
import { Workflow as WorkflowNs } from "../Workflow"
import { Foundations } from "../Foundations"
import { Vault } from "../Vault"

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
                blueprints: z.record(Foundations.Blueprint.Id, Foundations.Blueprint.Schema),
                repairs: z.array(WorkflowNs.Repair.Schema),
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
                        publicationId: WorkflowNs.Dependency.Publication.Id,
                    })),
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    updates: WorkflowNs.Dependency.Publication.UpdateMap,
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
                    credentialInstanceIds: z.record(
                        Vault.Credential.Template.Id,
                        Vault.Credential.Instance.Id,
                    ).default({}),
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

    // A worker-side hold on a workflow. The backend keeps one transaction open, row-locked, from
    // begin to commit; the document is edited where the run is and comes back whole on commit.
    // Keyed by the execution behind the delegate, so nothing travels but the workflow id.
    export namespace Session {
        /** The row with its blueprints, as the editor loads it — what a hold starts from. */
        export namespace Begin {
            export const Response = Workflow.Get.Response
            export type Response = z.infer<typeof Response>
        }

        export namespace Commit {
            export const Request = z.object({ data: WorkflowNs.Data.Schema })
            export type Request  = z.infer<typeof Request>
            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }

        export namespace Meta {
            export const Response = WorkflowNs.Meta.Schema
            export type Response = z.infer<typeof Response>
        }

        export async function getMeta(api: AxiosInstance, workflowId: WorkflowNs.Id): Promise<Meta.Response> {
            const { data } = await api.get<Meta.Response>(`/api/internal/workbench/workflows/${workflowId}/meta`)
            return data
        }

        /** Lock and load. Refused while anyone holds the workflow. */
        export async function beginTransaction(api: AxiosInstance, workflowId: WorkflowNs.Id): Promise<Begin.Response> {
            const { data } = await api.post<Begin.Response>(`/api/internal/workbench/workflows/${workflowId}/session`)
            return data
        }

        export async function heartbeat(api: AxiosInstance, workflowId: WorkflowNs.Id): Promise<void> {
            await api.post(`/api/internal/workbench/workflows/${workflowId}/session/heartbeat`)
        }

        export async function commitTransaction(api: AxiosInstance, workflowId: WorkflowNs.Id, request: Commit.Request): Promise<Commit.Response> {
            const { data } = await api.post<Commit.Response>(`/api/internal/workbench/workflows/${workflowId}/session/commit`, request)
            return data
        }

        export async function abortTransaction(api: AxiosInstance, workflowId: WorkflowNs.Id): Promise<void> {
            await api.post(`/api/internal/workbench/workflows/${workflowId}/session/abort`)
        }
    }
}
