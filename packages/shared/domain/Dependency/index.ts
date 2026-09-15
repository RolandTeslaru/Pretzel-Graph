import { z } from "zod"
import { ListingId, PublicationId, SkillId, WorkflowId } from "../Workflow/ids";
import * as RefMod from "./ref";
import { Skill as SkillD } from "../Skill";
import { Data } from "../Workflow/data";

export namespace Dependency {
    
    export import Ref = RefMod.Ref

    export const Id = z.string().brand("Dependency.Id")
    export type Id = z.infer<typeof Dependency.Id>

    export const createId = (ref: Ref) => `${ref.kind}:${ref.id}` as Dependency.Id


    // The snapshots a depending workflow embeds.
    export namespace Value {

        // A draft workflow: its display fields and graph.
        export namespace Draft {
            export const Schema = z.object({
                kind:         z.literal("draftWorkflow"),
                id:           WorkflowId,
                display_name: z.string(),
                icon:         z.string().nullable().optional(),
                accent:       z.string().nullable().optional(),
                updated_at:   z.coerce.date(),
                get workflow_data() { return Data.Schema },
            })
        }

        // A published workflow or listing: the publication, the workflow's display fields and graph.
        export namespace Publication {
            export const Schema = z.object({
                kind:         z.enum(["publishedWorkflow", "listing"]),
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

        // A skill: its instructions, and the hash its updates are checked against.
        export namespace Skill {
            export const Schema = SkillD.Schema.pick({
                id:           true,
                name:         true,
                description:  true,
                content:      true,
                content_hash: true,
                icon:         true,
                accent:       true,
            }).extend({
                kind: z.literal("skill"),
            })
        }

        export type Draft = z.infer<typeof Draft.Schema>
        export type Publication = z.infer<typeof Publication.Schema>
        export type Skill = z.infer<typeof Skill.Schema>

        export const Schema = z.union([Draft.Schema, Publication.Schema, Skill.Schema])
    }
    export type Value = z.infer<typeof Value.Schema>

    // The snapshot a ref of each kind points at.
    type ValueByKind = {
        draftWorkflow:     Value.Draft
        publishedWorkflow: Value.Publication
        listing:           Value.Publication
        skill:             Value.Skill
    }
    export type ValueFor<R extends Ref> = ValueByKind[R["kind"]]


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

        export namespace Skill {
            export const Schema = z.object({
                kind:         z.literal("skill"),
                id:           SkillId,
                name:         z.string(),
                content_hash: z.string(),
                updated_at:   z.coerce.date(),
            })
        }

        export type Draft       = z.infer<typeof Draft.Schema>
        export type Publication = z.infer<typeof Publication.Schema>
        export type Listing     = z.infer<typeof Listing.Schema>
        export type Skill       = z.infer<typeof Skill.Schema>

        export const Schema = z.discriminatedUnion("kind", [Draft.Schema, Publication.Schema, Listing.Schema, Skill.Schema])
    }
    export type Update = z.infer<typeof Update.Schema>
}
