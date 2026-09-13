import { z } from "zod"
import { PublicationId, WorkflowId } from "../Workflow/ids"
import { Workflow } from "../Workflow"

// Canonical version-control publication record; workflow_meta and workflow_data bind to Workflow via getters.
export namespace Publication {
    export const Id = PublicationId;
    export type Id = PublicationId

    // A publication row without its graph.
    export namespace Meta {
        export const Schema = z.object({
            id:            PublicationId,
            workflow_id:   WorkflowId,
            version:       z.number(),
            name:          z.string(),
            description:   z.string().nullable(),
            // The workflow's display row as it looked when this version was published.
            get workflow_meta() { return Workflow.Meta.Schema },
            is_active:     z.boolean(),
            published_at:  z.coerce.date(),
        })
    }
    export type Meta = z.infer<typeof Meta.Schema>

    export const Schema = Meta.Schema.extend({
        get workflow_data() { return Workflow.Data.Schema },
    })
}
export type Publication = z.infer<typeof Publication.Schema>
