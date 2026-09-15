import { z } from "zod"
import type { AxiosInstance } from "axios"
import { Workflow as WorkflowD } from "../../Workflow"
import { Skill as SkillD } from "../../Skill"
import { Folder as FolderD } from "../folder"

export namespace Folder {
    export namespace Create {
        export const Request = z.object({
            parent_folder_id: FolderD.Id,
            display_name: z.string().min(1),
            description: z.string().nullable().optional(),
        })
        export type Request = z.infer<typeof Request>;
        export type Response = FolderD;
    }
    export namespace Update {
        export const Request = z.object({
            id: FolderD.Id,
            display_name: z.string().min(1).optional(),
            description: z.string().nullable().optional(),
            hidden: z.boolean().optional(),
            parent_folder_id: FolderD.Id.optional(),
        });
        export type Request = z.infer<typeof Request>;
        export type Response = FolderD;
    }
    export namespace Remove {
        export const Request = z.object({ id: FolderD.Id });
        export type Request = z.infer<typeof Request>;
        export type Response = { ok: true };
    }

    // One-level-deep contents of a folder:
    // the folder itself + its immediate child folders, workflows and skills.
    export namespace GetContents {
        export const Request = z.object({ id: FolderD.Id });
        export type Request = z.infer<typeof Request>;
        export const ResponseSchema = z.object({
            folder: FolderD.Schema,
            child_folders: z.array(FolderD.Schema),
            workflows: z.array(WorkflowD.Meta.Schema),
            skills: z.array(SkillD.Meta.Schema),
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
