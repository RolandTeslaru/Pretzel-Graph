import { z } from "zod"
import type { AxiosInstance } from "axios"
import { Skill as SkillD } from "../../Skill"
import { Folder as FolderD } from "../folder"

export namespace Skill {
    export namespace Create {
        export const Request = z.object({
            folder_id: FolderD.Id,
            name: SkillD.Name,
            description: z.string().max(1024).optional(),
            content: z.string().optional(),
            icon: z.string().nullable().optional(),
            accent: z.string().nullable().optional(),
        });
        export type Request = z.infer<typeof Request>;
        export type Response = SkillD;
    }
    export namespace Update {
        export const Request = z.object({
            id: SkillD.Id,
            name: SkillD.Name.optional(),
            description: z.string().max(1024).optional(),
            content: z.string().optional(),
            icon: z.string().nullable().optional(),
            accent: z.string().nullable().optional(),
            folder_id: FolderD.Id.optional(),
        });
        export type Request = z.infer<typeof Request>;
        export type Response = SkillD;
    }
    export namespace Get {
        export const Request = z.object({ id: SkillD.Id });
        export type Request = z.infer<typeof Request>;
        export type Response = SkillD;
    }
    export namespace Remove {
        export const Request = z.object({ id: SkillD.Id });
        export type Request = z.infer<typeof Request>;
        export type Response = { ok: true };
    }

    export async function create(
        api: AxiosInstance,
        req: Create.Request,
    ): Promise<Create.Response> {
        const { data } = await api.post<Create.Response>("/api/library/skills", req);
        return data;
    }

    export async function get(
        api: AxiosInstance,
        req: Get.Request,
    ): Promise<Get.Response> {
        const { data } = await api.get<Get.Response>(`/api/library/skills/${req.id}`);
        return data;
    }

    export async function update(
        api: AxiosInstance,
        req: Update.Request,
    ): Promise<Update.Response> {
        const { id, ...payload } = req;
        const { data } = await api.patch<Update.Response>(`/api/library/skills/${id}`, payload);
        return data;
    }

    export async function remove(
        api: AxiosInstance,
        req: Remove.Request,
    ): Promise<Remove.Response> {
        const { data } = await api.delete<Remove.Response>(`/api/library/skills/${req.id}`);
        return data;
    }
}
