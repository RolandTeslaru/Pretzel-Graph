import z from "zod";
import type { AxiosInstance } from "axios";
import { Workflow } from "../Workflow";
import { Publication } from "./publication";

export namespace API {
    export namespace Publish {
        export const Request = z.strictObject({
            name: z.string(),
            description: z.string().nullable().optional(),
            workflowData: Workflow.Data.Schema,
        })
        export type Request = z.infer<typeof Request>

        export const Response = z.object({
            publication: Publication.Schema,
        })
        export type Response = z.infer<typeof Response>
    }
    export async function publish(api: AxiosInstance, workflowId: Workflow.Id, req: Publish.Request): Promise<Publish.Response> {
        const { data } = await api.post<Publish.Response>(`/api/version-control/${workflowId}/publish`, req);
        return data;
    }

    export namespace List {
        export const Response = z.object({
            publications: Publication.Meta.Schema.array(),
        })
        export type Response = z.infer<typeof Response>
    }
    export async function list(api: AxiosInstance, workflowId: Workflow.Id): Promise<List.Response> {
        const { data } = await api.get<List.Response>(`/api/version-control/list/${workflowId}`);
        return data;
    }

    export namespace Get {
        export const Response = z.object({
            publication: Publication.Schema,
        })
        export type Response = z.infer<typeof Response>
    }
    export async function get(api: AxiosInstance, publicationId: Publication.Id): Promise<Get.Response> {
        const { data } = await api.get<Get.Response>(`/api/version-control/${publicationId}`);
        return data;
    }

    export namespace Remove {
        export const Response = z.object({
            success: z.boolean(),
            workflowId: Workflow.Id,
        })
        export type Response = z.infer<typeof Response>
    }
    export async function remove(api: AxiosInstance, workflowId: Workflow.Id, publicationId: Publication.Id): Promise<Remove.Response> {
        const { data } = await api.delete<Remove.Response>(`/api/version-control/${workflowId}/${publicationId}`);
        return data;
    }
}
