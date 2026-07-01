import z from "zod";
import type { AxiosInstance } from "axios";
import { Workflow } from "./Workflow";
import { Realtime } from "./Realtime";
import { Auth } from "./Auth";

export namespace VersionControl {
    // Canonical version-control publication record. workflow_data binds to the
    // current Workflow via a getter (Workflow is fully loaded before this module
    // through the domain barrel, and via the ./Workflow import here).
    export namespace Publication {
        // Same brand as Workflow.Dependency.Publication.Id (structural).
        export const Id = z.uuid().brand("PublicationId");
        export type Id = z.infer<typeof Id>

        export const Schema = z.object({
            id:            Id,
            workflow_id:   Workflow.Id,
            version:       z.number(),
            name:          z.string(),
            description:   z.string().nullable(),
            get workflow_data() { return Workflow.Data.Schema; },
            is_active:     z.boolean(),
            published_at:  z.coerce.date(),
        })

        export namespace Database {
            export namespace Row {
                export const Schema = Publication.Schema.extend({ user_id: Auth.User.Id })
            }
            export type Row = z.infer<typeof Row.Schema>
        }

        export namespace Meta {
            export const Schema = Publication.Schema.omit({
                workflow_data: true,
            })
        }
        export type Meta = z.infer<typeof Meta.Schema>
    }
    export type Publication = z.infer<typeof Publication.Schema>

    // Signals are emitted by the backend when a publication changes state.
    // Subscribers (e.g. the webhook server) use them to keep caches in sync.
    export namespace Signal {
        export const Channel = Realtime.Channel.brand("VersionControl.Signal.Channel")
        export type Channel = z.infer<typeof Channel>

        export const Action = z.enum(["published", "activated", "deactivated", "removed"])
        export type Action = z.infer<typeof Action>

        export const getChannel = (workflowId: Workflow.Id, action: Action): Channel =>
            `version_control:${workflowId}:${action}` as Channel

        export const PATTERN_CHANNEL = "version_control:*" as Channel;

        export const Base = Realtime.Signal.Base.extend({
            workflowId: Workflow.Id,
            publicationId: Publication.Id,
        })

        export namespace Published {
            export const Schema = Base.extend({
                type: z.literal("published"),
                publication: Publication.Schema,
            })
        }
        export type Published = z.infer<typeof Published.Schema>

        export namespace Activated {
            export const Schema = Base.extend({
                type: z.literal("activated"),
                publication: Publication.Schema,
            })
        }
        export type Activated = z.infer<typeof Activated.Schema>

        export namespace Deactivated {
            export const Schema = Base.extend({
                type: z.literal("deactivated"),
            })
        }
        export type Deactivated = z.infer<typeof Deactivated.Schema>

        export namespace Removed {
            export const Schema = Base.extend({
                type: z.literal("removed"),
            })
        }
        export type Removed = z.infer<typeof Removed.Schema>

        export const Schema = z.discriminatedUnion("type", [
            Published.Schema,
            Activated.Schema,
            Deactivated.Schema,
            Removed.Schema,
        ])
    }
    export type Signal = z.infer<typeof Signal.Schema>

    export namespace API {
        export namespace Publish {
            export const Request = z.object({
                workflowId: Workflow.Id,
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
        export async function publish(api: AxiosInstance, req: Publish.Request): Promise<Publish.Response> {
            const { data } = await api.post<Publish.Response>("/api/version-control/publish", req);
            return data;
        }

        export namespace List {
            export const Request = z.object({
                workflowId: Workflow.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                publications: Publication.Meta.Schema.array(),
            })
            export type Response = z.infer<typeof Response>
        }
        export async function list(api: AxiosInstance, req: List.Request): Promise<List.Response> {
            const { data } = await api.get<List.Response>(`/api/version-control/list/${req.workflowId}`);
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

        export namespace Get {
            export const Request = z.object({
                publicationId: Publication.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                publication: Publication.Schema,
            })
            export type Response = z.infer<typeof Response>
        }
        export async function get(api: AxiosInstance, req: Get.Request): Promise<Get.Response> {
            const { data } = await api.get<Get.Response>(`/api/version-control/${req.publicationId}`);
            return data;
        }

        export namespace Activate {
            export const Request = z.object({
                publicationId: Publication.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                publication: Publication.Schema,
            })
            export type Response = z.infer<typeof Response>
        }
        export async function activate(api: AxiosInstance, req: Activate.Request): Promise<Activate.Response> {
            const { data } = await api.post<Activate.Response>(`/api/version-control/${req.publicationId}/activate`);
            return data;
        }

        export namespace Deactivate {
            export const Request = z.object({
                publicationId: Publication.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                publication: Publication.Schema,
            })
            export type Response = z.infer<typeof Response>
        }
        export async function deactivate(api: AxiosInstance, req: Deactivate.Request): Promise<Deactivate.Response> {
            const { data } = await api.post<Deactivate.Response>(`/api/version-control/${req.publicationId}/deactivate`);
            return data;
        }

        export namespace Remove {
            export const Request = z.object({
                publicationId: Publication.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                success: z.boolean(),
                workflowId: Workflow.Id,
            })
            export type Response = z.infer<typeof Response>
        }
        export async function remove(api: AxiosInstance, req: Remove.Request): Promise<Remove.Response> {
            const { data } = await api.delete<Remove.Response>(`/api/version-control/${req.publicationId}`);
            return data;
        }
    }
}
