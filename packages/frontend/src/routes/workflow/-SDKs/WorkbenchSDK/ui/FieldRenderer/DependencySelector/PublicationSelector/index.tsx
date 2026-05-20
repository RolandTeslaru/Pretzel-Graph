import { memo, useMemo } from 'react'
import { Spinner } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK/sdk'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { PublicationSelectorItem } from './Item'

const STALE_TIME = 60_000

interface Props {
    searchQuery: string
    selectedWorkflowId: Workflow.Id | ""
    onSelect: (workflowId: Workflow.Id) => void
}

export const PublicationSelector = memo<Props>(({ searchQuery, selectedWorkflowId, onSelect }) => {
    const activeWorkflows = VersionControlSDK.useStore(s => s.activeWorkflows)
    const workflowMetas = LibrarySDK.useStore(s => s.workflowMetas)

    const query = QuerySDK.useQuery(
        ['version-control', 'active-workflows'],
        () => VersionControlSDK.actions.listActiveWorkflows(),
        { staleTime: STALE_TIME },
    )
    const isLoading = Object.keys(activeWorkflows).length === 0 && query.isFetching

    const options = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase()

        return Object.values(activeWorkflows)
            .map(publication => ({ publication, workflow: workflowMetas[publication.workflow_id] }))
            .filter(({ publication, workflow }) => {
                if (!normalized) return true
                const name = workflow?.display_name ?? publication.name
                return (
                    name.toLowerCase().includes(normalized) ||
                    publication.name.toLowerCase().includes(normalized) ||
                    publication.id.toLowerCase().includes(normalized) ||
                    publication.workflow_id.toLowerCase().includes(normalized)
                )
            })
            .sort((a, b) => {
                const nameA = a.workflow?.display_name ?? a.publication.name
                const nameB = b.workflow?.display_name ?? b.publication.name
                return nameA.localeCompare(nameB)
            })
    }, [activeWorkflows, searchQuery, workflowMetas])

    if (isLoading)
        return (
            <div className="flex items-center justify-center gap-2 px-2 py-4 text-xs text-muted-foreground">
                <Spinner className="size-3.5" />
                Loading published workflows
            </div>
        )

    if (options.length === 0)
        return <div className="px-2 py-4 text-center text-xs text-muted-foreground">No published workflows found</div>

    return (
        <>
            {options.map(({ publication, workflow }) => (
                <PublicationSelectorItem
                    key={publication.id}
                    publication={publication}
                    workflow={workflow}
                    isSelected={publication.workflow_id === selectedWorkflowId}
                    onSelect={onSelect}
                />
            ))}
        </>
    )
})
PublicationSelector.displayName = "PublicationSelector"
