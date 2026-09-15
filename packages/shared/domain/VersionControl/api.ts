import z from "zod";
import type { AxiosInstance } from "axios";
import { Workflow } from "../Workflow";
import { Publication } from "./publication";

export namespace API {
    // publish_workflow is SECURITY DEFINER and does not resolve through RLS, so the
    // workflow travels in the path where the route's scope guard proves ownership.
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

    export namespace ListActiveWorkflows {
        export const Response = z.object({
            activeWorkflows: z.record(Workflow.Id, Publication.Meta.Schema),
        })
        export type Response = z.infer<typeof Response>
    }
    export async function listActiveWorkflows(api: AxiosInstance): Promise<ListActiveWorkflows.Response> {
        const { data } = await api.get<ListActiveWorkflows.Response>("/api/version-control/active");
        return data;
    }

    export namespace GetActiveByWorkflow {
        export const Response = z.object({
            publication: Publication.Meta.Schema.nullable(),
        })
        export type Response = z.infer<typeof Response>
    }
    export async function getActiveByWorkflow(api: AxiosInstance, workflowId: Workflow.Id): Promise<GetActiveByWorkflow.Response> {
        const { data } = await api.get<GetActiveByWorkflow.Response>(`/api/version-control/active/${workflowId}`);
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

    export namespace Activate {
        export const Response = z.object({
            publication: Publication.Schema,
        })
        export type Response = z.infer<typeof Response>
    }
    export async function activate(api: AxiosInstance, workflowId: Workflow.Id, publicationId: Publication.Id): Promise<Activate.Response> {
        const { data } = await api.post<Activate.Response>(`/api/version-control/${workflowId}/${publicationId}/activate`);
        return data;
    }

    export namespace Deactivate {
        export const Response = z.object({
            publication: Publication.Schema,
        })
        export type Response = z.infer<typeof Response>
    }
    export async function deactivate(api: AxiosInstance, workflowId: Workflow.Id, publicationId: Publication.Id): Promise<Deactivate.Response> {
        const { data } = await api.post<Deactivate.Response>(`/api/version-control/${workflowId}/${publicationId}/deactivate`);
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
