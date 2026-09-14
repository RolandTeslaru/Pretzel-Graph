import { z } from "zod"
import { ListingId, PublicationId, WorkflowId } from "../Workflow/ids";
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

        export type Draft = z.infer<typeof Draft.Schema>
        export type Publication = z.infer<typeof Publication.Schema>
    
        export const Schema = z.union([Draft.Schema, Publication.Schema])
    }
    export type Value = z.infer<typeof Value.Schema>


    // What changed at the source since a snapshot was taken, named by the ref's kind and id.
    export namespace Update {

        export namespace Draft {
            export const Schema = z.object({
                kind:       z.literal("draftWorkflow"),
                id:         WorkflowId,
                updated_at: z.coerce.date(),
            })
        }

        export namespace Publication {
            export const Schema = z.object({
                kind:          z.literal("publishedWorkflow"),
                id:            WorkflowId,
                publicationId: PublicationId,
                version:       z.number(),
                name:          z.string(),
                description:   z.string().nullable(),
            })
        }

        export namespace Listing {
            export const Schema = Publication.Schema.extend({
                kind: z.literal("listing"),
                id:   ListingId,
            })
        }

        export type Draft       = z.infer<typeof Draft.Schema>
        export type Publication = z.infer<typeof Publication.Schema>
        export type Listing     = z.infer<typeof Listing.Schema>

        export const Schema = z.discriminatedUnion("kind", [Draft.Schema, Publication.Schema, Listing.Schema])

        // Updates to the published store: publications and listings.
        export const PublicationMap = z.record(WorkflowId, z.discriminatedUnion("kind", [Publication.Schema, Listing.Schema]))
        export type PublicationMap = z.infer<typeof PublicationMap>
    }
    export type Update = z.infer<typeof Update.Schema>


    export const Schema = z.union([Value.Publication.Schema, Value.Draft.Schema])

    export const Variant = z.enum(["draft", "publication"])
    export type Variant = z.infer<typeof Variant>
}
export type Dependency = z.infer<typeof Dependency.Schema>
