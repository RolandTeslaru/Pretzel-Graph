import { z } from "zod"
import { PublicationId, WorkflowId } from "../Workflow/ids";
import * as RefMod from "./ref";
import { Data } from "../Workflow/data";

export namespace Dependency {

    export import Ref = RefMod.Ref


    // The snapshots a depending workflow embeds.
    export namespace Value {

        // A draft workflow: its display fields and graph.
        export namespace Draft {
            export const Schema = z.object({
                id:           WorkflowId,
                display_name: z.string(),
                icon:         z.string().nullable().optional(),
                accent:       z.string().nullable().optional(),
                updated_at:   z.coerce.date(),
                get data() { return Data.Schema },
            })
        }
        export type Draft = z.infer<typeof Draft.Schema>

        // A published workflow: the publication, the workflow's display fields and graph.
        export namespace Publication {
            export const Schema = z.object({
                id:           PublicationId,
                workflow_id:  WorkflowId,
                version:      z.number(),
                name:         z.string(),
                published_at: z.coerce.date(),
                display_name: z.string(),
                icon:         z.string().nullable().optional(),
                accent:       z.string().nullable().optional(),
                get workflow_data() { return Data.Schema },
            })
        }
        export type Publication = z.infer<typeof Publication.Schema>
    }


    // What changed at the source since a snapshot was taken.
    export namespace Update {

        export const Draft = z.object({
            workflowId: WorkflowId,
            updated_at: z.coerce.date(),
        })
        export type Draft = z.infer<typeof Draft>

        export const Publication = z.object({
            workflowId:    WorkflowId,
            publicationId: PublicationId,
            version:       z.number(),
            name:          z.string(),
            description:   z.string().nullable(),
        })
        export type Publication = z.infer<typeof Publication>

        export const PublicationMap = z.record(WorkflowId, Publication)
        export type PublicationMap = z.infer<typeof PublicationMap>
    }


    export const Schema = z.union([Value.Publication.Schema, Value.Draft.Schema])

    export const Variant = z.enum(["draft", "publication"])
    export type Variant = z.infer<typeof Variant>
}
export type Dependency = z.infer<typeof Dependency.Schema>
