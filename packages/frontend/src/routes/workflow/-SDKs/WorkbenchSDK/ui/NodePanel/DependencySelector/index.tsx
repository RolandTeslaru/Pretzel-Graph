import { memo } from 'react'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { DependencySelectorDialogContent } from './Dialog'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

const DIALOG_ID = "dependency-selector"

interface Props {
    nodeId: Workflow.Node.Id
    className?: string
}

export const DependencySelector = memo<Props>(({ nodeId, className }) => {
    const nodeDep    = WorkbenchSDK.useStore(s => s.data.nodes[nodeId]?.dependency)
    const dependency = WorkbenchSDK.useStore(s => {
        if (!nodeDep?.workflowId) return null
        return nodeDep.mode === "publication"
            ? s.selectors.dependency.published.get(s, nodeDep.workflowId)
            : s.selectors.dependency.draft.get(s, nodeDep.workflowId)
    })

    const openDialog = () => {
        DialogSDK.actions.push(DIALOG_ID, (props) => (
            <DialogSDK.Template {...props}>
                <DependencySelectorDialogContent
                    nodeId={nodeId}
                    dialogId={DIALOG_ID}
                />
            </DialogSDK.Template>
        ))
    }

    const mode = nodeDep?.mode === "publication" ? "publication" : "draft"

    const iconColor       = dependency?.accent ? `var(--${dependency.accent}-foreground)` : undefined
    const backgroundColor = dependency?.accent ? `color-mix(in srgb, var(--${dependency.accent}) 25%, transparent)` : 'var(--muted)'

    return (
        <div className={cn(className, "w-full nodrag cursor-auto flex flex-col gap-1")}>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto bg-card/80! min-h-7 w-full px-2 py-1 text-left"
                onClick={openDialog}
            >
                <span className="flex min-w-0 items-center gap-2 mr-auto">
                    <span
                        className="flex size-5 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor }}
                    >
                        <LazyIcon
                            name={"Graph"}
                            className="size-3"
                            style={{ color: iconColor }}
                        />
                    </span>
                    <span className="min-w-0 flex flex-col">
                        <span className="truncate text-xs font-medium">
                            {dependency?.display_name ?? "Select workflow"}
                        </span>
                        <span className='flex text-[10px] font-normal text-muted-foreground'>
                            {
                            // @ts-expect-error
                            dependency?.publication_name
                            }
                        </span>
                    </span>
                </span>
                {mode === "publication" && <SystemIcons.ShieldCheck className='size-3 text-muted-foreground'/>}
                {mode === "draft" && <SystemIcons.DraftingCompass className='size-3 text-muted-foreground'/>}
                <SystemIcons.ChevronDown />
            </Button>
        </div>
    )
})
DependencySelector.displayName = "DependencySelector"
