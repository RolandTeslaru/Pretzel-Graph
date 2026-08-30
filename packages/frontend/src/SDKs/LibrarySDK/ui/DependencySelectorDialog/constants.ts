import { Listing, Workflow } from '@pretzel-graph/shared/domain'

export const DEPENDENCY_SELECTOR_DIALOG_ID = "dependency-selector"

export interface DependencySelectorCallbacks {
    onLocalWorkflowSelected: (workflowId: Workflow.Id, variant: Workflow.Dependency.Variant) => Promise<boolean>
    onListingSelected: (listingId: Listing.Id) => Promise<boolean>
    onListingPreview?: (listingId: Listing.Id) => void
}
