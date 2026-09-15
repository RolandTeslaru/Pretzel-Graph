import { z } from "zod"
import type { AxiosInstance } from "axios"
import { Workflow as WorkflowD } from "../../Workflow"
import { Skill as SkillD } from "../../Skill"
import { Folder as FolderD } from "../folder"
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

    export import Folder   = FolderMod.Folder
    export import Workflow = WorkflowMod.Workflow
    export import Skill    = SkillMod.Skill
}
