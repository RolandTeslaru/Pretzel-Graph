import type { AxiosInstance } from "axios"
import z from "zod"
import { Foundations } from "./Foundations"
import { Orchestrator } from "./Orchestrator"

export namespace Workbench {
    export namespace API {
        export namespace Field {
            export namespace Reconcile {
                export const Request = z.object({
                    blueprintId: Foundations.Blueprint.Id,
                    fieldId: Foundations.Field.Id,
                    newValue: Foundations.Field.Value
                })
                export type Request = z.infer<typeof Request>
                export const Response = z.object({
                    reconciledBlueprint: Foundations.Blueprint.Schema
                })
                export type Response = z.infer<typeof Response>
            }
            export async function reconcile(api: AxiosInstance, req: Reconcile.Request): Promise<Reconcile.Response> {
                const { data } = await api.post<Reconcile.Response>(
                    "/api/workbench/field/reconcile", req
                )
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