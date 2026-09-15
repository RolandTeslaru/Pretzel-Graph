import type { Dependency, Library, Listing } from '@pretzel-graph/shared/domain'

export const DEPENDENCY_SELECTOR_DIALOG_ID = "dependency-selector"

// A local workflow is attached as its draft or its active publication.
export type LocalWorkflowKind = Exclude<Dependency.Ref.Workflow["kind"], "listing">

export interface DependencySelectorOptions {
    acceptsKind: Dependency.Ref.Kind[]
    initialCwd?: Library.Folder.Id
    onSelect: (ref: Dependency.Ref) => Promise<boolean>
    onListingPreview?: (listingId: Listing.Id) => void
}

export interface AcceptedKinds {
    localKinds: LocalWorkflowKind[]
    skill:      boolean
    listing:    boolean
}

const isLocalWorkflowKind = (kind: Dependency.Ref.Kind): kind is LocalWorkflowKind =>
    kind === "draftWorkflow" || kind === "publishedWorkflow"

// A field's accepted kinds, grouped the way the selector offers them.
export function groupAcceptedKinds(acceptsKind: Dependency.Ref.Kind[]): AcceptedKinds {
    return {
        localKinds: acceptsKind.filter(isLocalWorkflowKind),
        skill:      acceptsKind.includes("skill"),
        listing:    acceptsKind.includes("listing"),
    }
}

// What a field accepting these kinds asks for.
export function getAcceptedNoun({ localKinds, skill, listing }: AcceptedKinds) {
    const workflow = localKinds.length > 0 || listing

    if (workflow && skill)
        return "workflow or skill"

    if (skill)
        return "skill"

    return "workflow"
}
