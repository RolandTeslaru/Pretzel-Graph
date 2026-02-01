import { z } from "zod"
import { Workflow as DomainWorkflow } from "./Workflow"

export namespace Library {

    // Note this only returns the metadata from the workflow table

    export namespace WorkflowMeta {
        export const Schema = DomainWorkflow.Schema.omit({ data: true })
    }
    export type WorkflowMeta = z.infer<typeof WorkflowMeta.Schema>


    export namespace Folder {
        export const Id = z.string().brand("FolderId")
        export type Id = z.infer<typeof Folder.Id>

        export const Schema = z.object({
            id: Folder.Id,
            display_name: z.string(),
            workflow_ids: z.set(DomainWorkflow.Id),
            parent_folder_id: Folder.Id,
            created_at: z.iso.datetime(),
            updated_at: z.iso.datetime(),
        })
    }
    export type Folder = z.infer<typeof Folder.Schema>


    export namespace Project {
        export const Id = z.string().brand("ProjectId")
        export type Id = z.infer<typeof Project.Id>

        export const Schema = Folder.Schema
            .omit({ parent_folder_id: true, id: true })
            .extend({
                id: Project.Id,
            })
    }
    export type Project = z.infer<typeof Project.Schema>



    export namespace API {
        export namespace Workflow {
            export namespace Create {
                // We accept a full Workflow object to create it
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
                export const Request = z.object({ folderId: z.string().optional() });
                export type Request = z.infer<typeof Request>;

                export const ResponseSchema = z.array(Library.WorkflowMeta.Schema);
                export type Response = z.infer<typeof ResponseSchema>;
            }
        }
    }
}