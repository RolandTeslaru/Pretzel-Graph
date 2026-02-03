import { Workflow } from "@vx-agent-editor/shared/types"
import { supabase } from "@/libs/supabase"
import { z } from "zod"

export namespace WorkflowAPI {
    export namespace Get {
        export const Request = z.object({
            workflowId: Workflow.Id
        })
        export type Request = z.infer<typeof Request>

        export const Response = z.object({
            workflow: Workflow.Schema
        })
        export type Response = z.infer<typeof Response>

        export async function fetch(request: Request): Promise<Response> {
            const { data, error } = await supabase
                .from("workflows")
                .select("*")
                .eq("id", request.workflowId)
                .maybeSingle()

            if (error) throw error
                if (!data) throw new Error("Workflow not found")

            return {
                workflow: data
            }
        }

    }
}