import type { AxiosInstance } from "axios"
import z from "zod"
import { Foundations } from "./Foundations"
import { Orchestrator } from "./Orchestrator"

export namespace Workbench {
    export namespace API {
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