import { z } from "zod"
import { ListingId, WorkflowId } from "../Workflow/ids"

// Pointers from a node's fields into the workflow's embedded dependency snapshots.
export namespace Ref {
    export namespace DraftWorkflow {
        export const Schema = z.object({
            kind: z.literal("draftWorkflow"),
            id:   WorkflowId,
        })
    }
    export namespace PublishedWorkflow {
        export const Schema = z.object({
            kind: z.literal("publishedWorkflow"),
            id:   WorkflowId,
        })
    }
    export namespace Listing {
        export const Schema = z.object({
            kind: z.literal("listing"),
            id:   ListingId,
        })
    }

    export type DraftWorkflow     = z.infer<typeof DraftWorkflow.Schema>
    export type PublishedWorkflow = z.infer<typeof PublishedWorkflow.Schema>
    export type Listing           = z.infer<typeof Listing.Schema>

    // Any pointer to an embedded workflow.
    export namespace Workflow {
        export const Schema = z.discriminatedUnion("kind", [DraftWorkflow.Schema, PublishedWorkflow.Schema, Listing.Schema])
    }
    export type Workflow = z.infer<typeof Workflow.Schema>

    export const Schema = z.discriminatedUnion("kind", [DraftWorkflow.Schema, PublishedWorkflow.Schema, Listing.Schema])
}
export type Ref = z.infer<typeof Ref.Schema>
