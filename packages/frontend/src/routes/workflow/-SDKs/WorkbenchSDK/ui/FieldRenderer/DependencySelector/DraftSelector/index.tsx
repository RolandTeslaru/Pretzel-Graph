import { memo, useMemo } from 'react'
import { Workflow } from '@pretzel-graph/shared/domain'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { DraftSelectorItem } from './Item'

interface Props {
    searchQuery: string
    selectedWorkflowId: Workflow.Id | ""
    onSelect: (workflowId: Workflow.Id) => void
}

export const DraftSelector = memo<Props>(({ searchQuery, selectedWorkflowId, onSelect }) => {
    const workflowMetas = LibrarySDK.useStore(s => s.workflowMetas)

    const options = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase()

        return Object.values(workflowMetas)
            .filter(w => !normalized || w.display_name.toLowerCase().includes(normalized) || w.id.toLowerCase().includes(normalized))
            .sort((a, b) => a.display_name.localeCompare(b.display_name))
    }, [workflowMetas, searchQuery])

    if (options.length === 0)
        return <div className="px-2 py-4 text-center text-xs text-muted-foreground">No workflows found</div>

    return (
        <>
            {options.map(workflow => (
                <DraftSelectorItem
                    key={workflow.id}
                    workflow={workflow}
                    isSelected={workflow.id === selectedWorkflowId}
                    onSelect={onSelect}
                />
            ))}
        </>
    )
})
DraftSelector.displayName = "DraftSelector"
