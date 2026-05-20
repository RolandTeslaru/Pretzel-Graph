import { memo } from 'react'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { Library, Workflow } from '@pretzel-graph/shared/domain'

interface Props {
    workflow: Library.WorkflowMeta
    isSelected: boolean
    onSelect: (workflowId: Workflow.Id) => void
}

export const DraftSelectorItem = memo<Props>(({ workflow, isSelected, onSelect }) => (
    <button
        type="button"
        className={cn(
            "flex w-full items-center gap-2 border-b border-border px-2 py-1.5 text-left last:border-b-0 hover:bg-secondary",
            isSelected && "bg-primary/20"
        )}
        onClick={() => onSelect(workflow.id)}
    >
        <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full"
            style={{
                backgroundColor: workflow.accent
                    ? `color-mix(in srgb, var(--${workflow.accent}) 25%, transparent)`
                    : 'var(--muted)',
            }}
        >
            <LazyIcon
                name={workflow.icon ?? "Graph"}
                className="size-3.5"
                style={{ color: workflow.accent ? `var(--${workflow.accent}-foreground)` : undefined }}
            />
        </span>
        <span className="min-w-0 flex flex-1 flex-row items-center">
            <span className="truncate text-xs font-medium">{workflow.display_name}</span>
            <span className="truncate text-[10px] ml-auto text-muted-foreground">draft</span>
        </span>
    </button>
))
DraftSelectorItem.displayName = "DraftSelectorItem"
