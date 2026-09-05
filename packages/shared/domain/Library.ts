import { z } from "zod"
import type { AxiosInstance } from "axios"
import { Workflow as DomainWorkflow } from "./Workflow"
import { Listing } from "./Listing"

export namespace Library {

    export namespace Folder {
        export const Id = z.uuid().brand("FolderId")
        export type Id = z.infer<typeof Folder.Id>

        // Seeded at install. Every other folder and workflow descends from it.
        export const ROOT_ID = Folder.Id.parse("00000000-0000-4000-8000-000000000001")

        export const Schema = z.object({
            id: Folder.Id,
            parent_folder_id: Folder.Id.nullable(),
            display_name: z.string(),
            description: z.string().nullable(),
            hidden: z.boolean().nullable().optional(),
            created_at: z.string(),
            updated_at: z.string(),
        })
    }
    export type Folder = z.infer<typeof Folder.Schema>


    export namespace WorkflowMeta {
        export const Schema = DomainWorkflow.Meta.Schema
    }
    export type WorkflowMeta = DomainWorkflow.Meta

    // ─────────────────────────────────────────────────────────────
    // API request/response shapes
    // Request shapes mirror DB column names so they can be passed
    // straight to Supabase .insert() / .update() with no mapping.
    // ─────────────────────────────────────────────────────────────
    export namespace API {

        // ── Bootstrap ────────────────────────────────────────
        export namespace Bootstrap {
            export namespace Get {
                export const Request = z.object({});
                export type Request = z.infer<typeof Request>;
                export const Response = z.object({
                    folders: z.array(Library.Folder.Schema),
                    workflow_metas: z.array(Library.WorkflowMeta.Schema),
                });
                export type Response = z.infer<typeof Response>;
            }

            export async function get(
                api: AxiosInstance,
                req: Get.Request = {},
            ): Promise<Get.Response> {
                const { data } = await api.get<Get.Response>('/api/library/bootstrap', {
                    params: req,
                });
                return data;
            }
        }

        // ── Folders ───────────────────────────────────────────
        export namespace Folder {
            export namespace Create {
                export const Request = z.object({
                    parent_folder_id: Library.Folder.Id,
                    display_name: z.string().min(1),
                    description: z.string().nullable().optional(),
                })
                export type Request = z.infer<typeof Request>;
                export type Response = Library.Folder;
            }
            export namespace Update {
                export const Request = z.object({
                    id: Library.Folder.Id,
                    display_name: z.string().min(1).optional(),
                    description: z.string().nullable().optional(),
                    hidden: z.boolean().optional(),
                });
                export type Request = z.infer<typeof Request>;
                export type Response = Library.Folder;
            }
            export namespace Remove {
                export const Request = z.object({ id: Library.Folder.Id });
                export type Request = z.infer<typeof Request>;
                export type Response = { ok: true };
            }

            // One-level-deep contents of a folder:
            // the folder itself + its immediate child folders + workflows.
            export namespace GetContents {
                export const Request = z.object({ id: Library.Folder.Id });
                export type Request = z.infer<typeof Request>;
                export const ResponseSchema = z.object({
                    folder: Library.Folder.Schema,
                    child_folders: z.array(Library.Folder.Schema),
                    workflows: z.array(Library.WorkflowMeta.Schema),
                });
                export type Response = z.infer<typeof ResponseSchema>;
            }

            export async function create(
                api: AxiosInstance,
                req: Create.Request,
            ): Promise<Create.Response> {
                const { data } = await api.post<Create.Response>("/api/library/folders", req);
                return data;
            }

            export async function update(
                api: AxiosInstance,
                req: Update.Request,
            ): Promise<Update.Response> {
                const { id, ...payload } = req;
                const { data } = await api.patch<Update.Response>(`/api/library/folders/${id}`, payload);
                return data;
            }

            export async function remove(
                api: AxiosInstance,
                req: Remove.Request,
            ): Promise<Remove.Response> {
                const { data } = await api.delete<Remove.Response>(`/api/library/folders/${req.id}`);
                return data;
            }

            export async function getContents(
                api: AxiosInstance,
                req: GetContents.Request,
            ): Promise<GetContents.Response> {
                const { data } = await api.get<GetContents.Response>(`/api/library/folders/${req.id}/contents`);
                return data;
            }
        }

        // ── Workflows ─────────────────────────────────────────
        export namespace Workflow {
            export namespace ListPublic {
                export const Request = z.object({
                    workflowId: DomainWorkflow.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    listingId: Listing.Id,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function listPublicWorkflow(api: AxiosInstance, req: ListPublic.Request): Promise<ListPublic.Response> {
                const { data } = await api.post<ListPublic.Response>(`/api/library/workflows/${req.workflowId}/list-public`, {})
                return data
            }

            export namespace UnlistPublic {
                export const Request = z.object({
                    workflowId: DomainWorkflow.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({})
                export type Response = z.infer<typeof Response>
            }

            export async function unlistPublicWorkflow(api: AxiosInstance, req: UnlistPublic.Request): Promise<UnlistPublic.Response> {
                const { data } = await api.post<UnlistPublic.Response>(`/api/library/workflows/${req.workflowId}/unlist-public`, {})
                return data
            }

            export namespace Create {
                export const Request = z.object({
                    folder_id: Library.Folder.Id,
                    display_name: z.string().min(1),
                    description: z.string().nullable().optional(),
                });
                export type Request = z.infer<typeof Request>;
                export type Response = DomainWorkflow;
            }
            export namespace Update {
                export const Request = z.object({
                    id: DomainWorkflow.Id,
                    display_name: z.string().min(1).optional(),
                    description: z.string().nullable().optional(),
                    icon: z.string().nullable().optional(),
                    accent: z.string().nullable().optional(),
                    icon_color: z.string().nullable().optional(),
                    locked: z.boolean().optional(),
                    hidden: z.boolean().optional(),
                });
                export type Request = z.infer<typeof Request>;
                export type Response = Library.WorkflowMeta;
            }
            export namespace Get {
                export const Request = z.object({ id: DomainWorkflow.Id });
                export type Request = z.infer<typeof Request>;
                export type Response = DomainWorkflow;
            }
            export namespace Remove {
                export const Request = z.object({ id: DomainWorkflow.Id });
                export type Request = z.infer<typeof Request>;
                export type Response = { ok: true };
            }

            export async function create(
                api: AxiosInstance,
                req: Create.Request,
            ): Promise<Create.Response> {
                const { data } = await api.post<Create.Response>("/api/library/workflows", req);
                return data;
            }

            export async function update(
                api: AxiosInstance,
                req: Update.Request,
            ): Promise<Update.Response> {
                const { id, ...payload } = req;
                const { data } = await api.patch<Update.Response>(`/api/library/workflows/${id}`, payload);
                return data;
            }

            export async function remove(
                api: AxiosInstance,
                req: Remove.Request,
            ): Promise<Remove.Response> {
                const { data } = await api.delete<Remove.Response>(`/api/library/workflows/${req.id}`);
                return data;
            }

            export namespace Duplicate {
                export const Request = z.object({ id: DomainWorkflow.Id });
                export type Request = z.infer<typeof Request>;
                export type Response = DomainWorkflow;
            }

            export async function duplicate(
                api: AxiosInstance,
                req: Duplicate.Request,
            ): Promise<Duplicate.Response> {
                const { data } = await api.post<Duplicate.Response>(`/api/library/workflows/${req.id}/duplicate`);
                return data;
            }
        }
    }
}
