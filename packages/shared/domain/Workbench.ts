import type { AxiosInstance } from "axios"
import z from "zod"
import { Foundations } from "./Foundations"
import { Workflow as DomainWorkflow } from "./Workflow"

export namespace Workbench {
    export namespace API {
        export namespace Workflow {
            export namespace Create {
                export const Request = z.object({
                    workflow: DomainWorkflow.Schema,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    workflow_id: DomainWorkflow.Id,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function create(api: AxiosInstance, request: Create.Request): Promise<Create.Response> {
                const { data } = await api.post<Create.Response>("/api/workbench/workflows", request)
                return data
            }

            export namespace Get {
                export const Request = z.object({
                    workflowId: DomainWorkflow.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    workflow: DomainWorkflow.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function get(api: AxiosInstance, request: Get.Request, abortSignal?: AbortSignal): Promise<Get.Response> {
                const { data } = await api.get<Get.Response>(`/api/workbench/workflows/${request.workflowId}`, { signal: abortSignal })
                return data
            }

            export namespace Commit {
                export const Request = z.object({
                    workflowId: DomainWorkflow.Id,
                    data: DomainWorkflow.Data.Schema,
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
                    dependencyId: DomainWorkflow.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    dependency: DomainWorkflow.Dependency.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function load(api: AxiosInstance, request: Load.Request): Promise<Load.Response> {
                const { data } = await api.get<Load.Response>(`/api/workbench/dependencies/workflows/${request.dependencyId}`)
                return data
            }
        }
    }
}
