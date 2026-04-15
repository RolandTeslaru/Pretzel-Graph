import type { AxiosInstance } from "axios"
import z from "zod"
import { Foundations } from "./Foundations"
import { Orchestrator } from "./Orchestrator"
import { Workflow as DomainWorkflow } from "./Workflow"

export namespace Workbench {
    export namespace API {
        export namespace Workflow {
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

            export async function get(api: AxiosInstance, request: Get.Request): Promise<Get.Response> {
                const { data } = await api.get<Get.Response>(`/api/workbench/workflows/${request.workflowId}`)
                return data
            }

            export namespace Commit {
                export const Request = z.object({
                    workflow: DomainWorkflow.Schema,
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

        export namespace Chat {
            export namespace StreamOutput {
                export const Request = z.object({
                    jobId: Orchestrator.Job.Id
                })
                export type Request = z.infer<typeof Request>
                export const Response = z.object({
                    
                })
                export type Response = z.infer<typeof Response>
            }
        }
    }
}