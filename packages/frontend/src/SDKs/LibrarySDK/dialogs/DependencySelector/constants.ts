import type { Dependency } from '@pretzel-graph/shared/domain'
import { Listing, Workflow } from '@pretzel-graph/shared/domain'

export const DEPENDENCY_SELECTOR_DIALOG_ID = "dependency-selector"

// A local workflow is attached as its draft or its active publication.
export type LocalWorkflowKind = Exclude<Dependency.Ref.Workflow["kind"], "listing">

export interface DependencySelectorCallbacks {
    onLocalWorkflowSelected: (workflowId: Workflow.Id, kind: LocalWorkflowKind) => Promise<boolean>
    onListingSelected: (listingId: Listing.Id) => Promise<boolean>
    onListingPreview?: (listingId: Listing.Id) => void
}
