import { z } from "zod"
import { Workflow as DomainWorkflow } from "./Workflow"
import { Auth } from "./Auth"

export namespace Library {

    export namespace Project {
        export const Id = z.string().brand("ProjectId")
        export type Id = z.infer<typeof Project.Id>

        export const Schema = z.object({
            id: Project.Id,
            user_id: Auth.User.Id,
            display_name: z.string(),
            description: z.string().nullable(),
            created_at: z.string(),
            updated_at: z.string(),
        })
    }
    export type Project = z.infer<typeof Project.Schema>


    export namespace Folder {
        export const Id = z.string().brand("FolderId")
        export type Id = z.infer<typeof Folder.Id>

        export const Schema = z.object({
            id: Folder.Id,
            project_id: Project.Id,
            user_id: Auth.User.Id,
            parent_folder_id: Folder.Id.nullable(),
            is_root: z.boolean(),
            display_name: z.string(),
            description: z.string().nullable(),
            workflow_ids: z.array(DomainWorkflow.Id),
            child_folder_ids: z.array(Folder.Id),
            created_at: z.string(),
            updated_at: z.string(),
        })
    }
    export type Folder = z.infer<typeof Folder.Schema>


    export namespace WorkflowMeta {
        export const Schema = DomainWorkflow.Schema.omit({ data: true })
    }
    export type WorkflowMeta = z.infer<typeof WorkflowMeta.Schema>


    // ─────────────────────────────────────────────────────────────
    // API request/response shapes
    // Request shapes mirror DB column names so they can be passed
    // straight to Supabase .insert() / .update() with no mapping.
    // ─────────────────────────────────────────────────────────────
    export namespace API {

        // ── Projects ──────────────────────────────────────────
        export namespace Project {
            export namespace Create {
                export const Request = z.object({
                    display_name: z.string().min(1),
                    description: z.string().nullable().optional(),
                })
                export type Request = z.infer<typeof Request>;
                export type Response = Library.Project;
            }
            export namespace List {
                export const ResponseSchema = z.array(Library.Project.Schema);
                export type Response = z.infer<typeof ResponseSchema>;
            }
            export namespace Delete {
                export const Request = z.object({ id: Library.Project.Id });
                export type Request = z.infer<typeof Request>;
                export type Response = { ok: true };
            }
        }

        // ── Folders ───────────────────────────────────────────
        export namespace Folder {
            export namespace Create {
                export const Request = z.object({
                    project_id: Library.Project.Id,
                    parent_folder_id: Library.Folder.Id,
                    display_name: z.string().min(1),
                    description: z.string().nullable().optional(),
                })
                export type Request = z.infer<typeof Request>;
                export type Response = Library.Folder;
            }
            export namespace List {
                export const Request = z.object({ project_id: Library.Project.Id.optional() });
                export type Request = z.infer<typeof Request>;
                export const ResponseSchema = z.array(Library.Folder.Schema);
                export type Response = z.infer<typeof ResponseSchema>;
            }
            export namespace Delete {
                export const Request = z.object({ id: Library.Folder.Id });
                export type Request = z.infer<typeof Request>;
                export type Response = { ok: true };
            }
        }

        // ── Workflows ─────────────────────────────────────────
        export namespace Workflow {
            export namespace Create {
                export const Request = DomainWorkflow.Schema;
                export type Request = z.infer<typeof Request>;
                export type Response = DomainWorkflow;
            }
            export namespace Update {
                export const Request = DomainWorkflow.Schema;
                export type Request = z.infer<typeof Request>;
                export type Response = DomainWorkflow;
            }
            export namespace Get {
                export const Request = z.object({ id: DomainWorkflow.Id });
                export type Request = z.infer<typeof Request>;
                export type Response = DomainWorkflow;
            }
            export namespace List {
                export const Request = z.object({ folder_id: Library.Folder.Id.optional() });
                export type Request = z.infer<typeof Request>;
                export const ResponseSchema = z.array(Library.WorkflowMeta.Schema);
                export type Response = z.infer<typeof ResponseSchema>;
            }
            export namespace Delete {
                export const Request = z.object({ id: DomainWorkflow.Id });
                export type Request = z.infer<typeof Request>;
                export type Response = { ok: true };
            }
        }
    }
}
