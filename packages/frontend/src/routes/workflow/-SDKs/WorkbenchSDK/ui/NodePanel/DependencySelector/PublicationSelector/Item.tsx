import { memo } from 'react'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { Workflow, VersionControl, Library } from '@pretzel-graph/shared/domain'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../../../sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

interface Props {
    publication: VersionControl.Publication.Meta
    workflowMeta: Library.WorkflowMeta | undefined
    isSelected: boolean
    onSelect: (workflowId: Workflow.Id) => void
}

export const PublicationSelectorItem = memo<Props>(({ publication, workflowMeta, isSelected, onSelect }) => {
    const workflowName = workflowMeta?.display_name ?? publication.name
    return (
        <button
            type="button"
            className={cn(
                "flex w-full items-center gap-2 px-5 py-1.5 text-left last:border-b-0 hover:bg-accent-foreground/10",
                isSelected && "bg-primary/20"
            )}
            onClick={() => onSelect(publication.workflow_id)}
        >
            <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full"
                style={{
                    backgroundColor: workflowMeta?.accent
                        ? `color-mix(in srgb, var(--${workflowMeta.accent}) 25%, transparent)`
                        : 'var(--muted)',
                }}
            >
                <LazyIcon
                    name={workflowMeta?.icon ?? "Graph"}
                    className="size-3.5"
                    style={{ color: workflowMeta?.accent ? `var(--${workflowMeta.accent}-foreground)` : undefined }}
                />
            </span>
            <span className="min-w-0 flex flex-1 gap-2 flex-row items-center">
                <span className="truncate text-xs font-medium">{workflowName}</span>
                <span className="truncate text-[10px] ml-auto text-muted-foreground">{publication.name}</span>
                <div className="content-[''] my-auto w-2 h-2 rounded-full bg-green-400" />
                <Button size="icon-xs" variant="ghost" className='rounded-full'
                    onClick={(e) => {
                        WorkbenchSDK.openWorkflowWindow(workflowMeta!.id)
                        e.stopPropagation()
                    }}
                >
                    <SystemIcons.ExternalLink  className='size-3 text-muted-foreground'/>
                </Button>
            </span>
        </button>
    )
})
PublicationSelectorItem.displayName = "PublicationSelectorItem"
