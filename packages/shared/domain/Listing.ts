import { z } from "zod"
import type { AxiosInstance } from "axios"
import { Workflow } from "./Workflow"
import { VersionControl } from "./VersionControl"
import { ListingId, LISTING_ID_PREFIX, isListingId as isListingIdValue } from "./Workflow/ids"

// A workflow shared through the listing registry, usable by any deployment.
export namespace Listing {

    export const Id = ListingId
    export type  Id = ListingId

    export const ID_PREFIX = LISTING_ID_PREFIX

    export const isListingId = isListingIdValue

    export const createId = (): Id =>
        `${LISTING_ID_PREFIX}${crypto.randomUUID().slice(LISTING_ID_PREFIX.length)}` as Id

    // The owner's active publication, verbatim, under the registry's id.
    export const Schema = z.object({
        id:              Id,
        publicationMeta: VersionControl.Publication.Meta.Schema,
        get workflowData() { return Workflow.Data.Schema },
        // Set by the registry operator on extended shelf entries only.
        blueprintId:     z.string().nullable().optional(),
        createdAt:       z.coerce.date(),
        updatedAt:       z.coerce.date(),
    })

    // The embedded form a depending workflow keeps.
    export function toPublication(listing: Listing): Workflow.Dependency.Publication {
        const meta = listing.publicationMeta

        return {
            id:               meta.id,
            workflow_id:      listing.id,
            version:          meta.version,
            workflow_data:    listing.workflowData,
            published_at:     meta.published_at,
            publication_name: meta.name,
            display_name:     meta.workflow_meta.display_name,
            icon:             meta.workflow_meta.icon ?? null,
            accent:           meta.workflow_meta.accent ?? null,
        }
    }

    export namespace API {

        export namespace Get {
            export const Response = z.object({
                workflow: Listing.Schema,
            })
            export type Response = z.infer<typeof Response>
        }

        export namespace Updates {
            export const Response = z.object({
                updates: z.record(Workflow.Id, VersionControl.Publication.Meta.Schema),
            })
            export type Response = z.infer<typeof Response>
        }

        export namespace ExtendedShelf {
            export const Response = z.object({
                workflows: z.array(Listing.Schema),
            })
            export type Response = z.infer<typeof Response>
        }

        export namespace Put {
            export const Request = z.object({
                id:              Id.optional(),
                publicationMeta: VersionControl.Publication.Meta.Schema,
                get workflowData() { return Workflow.Data.Schema },
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                id: Id,
            })
            export type Response = z.infer<typeof Response>
        }

    }
}
export type Listing = z.infer<typeof Listing.Schema>
