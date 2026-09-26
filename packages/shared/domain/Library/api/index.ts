import { z } from "zod"
import type { AxiosInstance } from "axios"
import { Workflow as WorkflowD } from "../../Workflow"
import { Skill as SkillD } from "../../Skill"
import { Folder as FolderD } from "../folder"
import { Ref as RefD } from "../ref"
import * as FolderMod from "./folder"
import * as WorkflowMod from "./workflow"
import * as SkillMod from "./skill"

export namespace API {

    export namespace Bootstrap {
        export namespace Get {
            export const Request = z.object({});
            export type Request = z.infer<typeof Request>;
            export const Response = z.object({
                folders: z.array(FolderD.Schema),
                workflow_metas: z.array(WorkflowD.Meta.Schema),
                skill_metas: z.array(SkillD.Meta.Schema),
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

    // Reached from inside a run with the execution token.
    export namespace Internal {
        export namespace Query {
            export const Request = z.object({
                kinds:       z.array(RefD.Kind).optional(),
                displayName: z.string().optional(),
                folderIds:   z.array(FolderD.Id).optional(),
                limit:       z.number().int().positive().max(500).optional(),
            });
            export type Request = z.infer<typeof Request>;

            // One row per library item; columns a kind doesn't have are null.
            export const Item = z.object({
                kind:          RefD.Kind,
                id:            z.string(),
                name:          z.string(),
                folder_id:     FolderD.Id.nullable(),
                folder_name:   z.string().nullable(),
                description:   z.string().nullable(),
                hidden:        z.boolean(),
                definition_id: z.string().nullable(),
                status:        z.string().nullable(),
                updated_at:    z.coerce.date(),
            });
            export type Item = z.infer<typeof Item>;

            export const Response = z.object({
                items: z.array(Item),
                total: z.number(),
            });
            export type Response = z.infer<typeof Response>;
        }

        export async function query(api: AxiosInstance, req: Query.Request): Promise<Query.Response> {
            const { data } = await api.post<Query.Response>('/api/internal/library/items/query', req);
            return data;
        }
    }

    export import Folder   = FolderMod.Folder
    export import Workflow = WorkflowMod.Workflow
    export import Skill    = SkillMod.Skill
}
