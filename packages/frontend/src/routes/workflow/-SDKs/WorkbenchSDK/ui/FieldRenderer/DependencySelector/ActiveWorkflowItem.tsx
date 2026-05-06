import { memo } from 'react'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { Workflow, VersionControl, Library } from '@pretzel-graph/shared/domain'

interface Props {
    publication: VersionControl.Publication.Meta
    workflow: Library.WorkflowMeta | undefined
    isSelected: boolean
    onSelect: (workflowId: Workflow.Id) => void
}

export const ActiveWorkflowItem = memo<Props>(({ publication, workflow, isSelected, onSelect }) => {
    const workflowName = workflow?.display_name ?? publication.name
    return (
    <button
        type="button"
        className={cn(
            "flex w-full items-center gap-2 border-b border-border px-2 py-1.5 text-left last:border-b-0 hover:bg-secondary",
            isSelected && "bg-primary/20"
        )}
        onClick={() => onSelect(publication.workflow_id)}
    >
        <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full"
            style={{
                backgroundColor: workflow?.accent
                    ? `color-mix(in srgb, var(--${workflow.accent}) 25%, transparent)`
                    : 'var(--muted)',
            }}
        >
            <LazyIcon
                name={workflow?.icon ?? "Graph"}
                className="size-3.5"
                style={{ color: workflow?.accent ? `var(--${workflow.accent}-foreground)` : undefined }}
            />
        </span>
        <span className="min-w-0 flex flex-1 flex-row items-center justify-between">
            <span className="truncate text-xs font-medium">{workflowName}</span>
            <span className="truncate text-[10px] text-muted-foreground">{publication.name}</span>
        </span>
    </button>
    )
})
ActiveWorkflowItem.displayName = "ActiveWorkflowItem"
