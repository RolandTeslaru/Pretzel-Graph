import { memo } from 'react'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

interface Props {
    nodeId: Workflow.Node.Id
    className?: string
}

const openSelector = (nodeId: Workflow.Node.Id) => {
    LibrarySDK.dialogs.openDependencySelector({
        onLocalWorkflowSelected: (workflowId, variant) =>
            WorkbenchSDK.actions.node.attachDependency(nodeId, workflowId, variant),
        onListingSelected: (listingId) =>
            WorkbenchSDK.actions.node.attachDependency(nodeId, listingId, 'publication'),
        onListingPreview: (listingId) =>
            WorkbenchSDK.openWorkflowWindow(listingId),
    }, {
        initialFolderId: LibrarySDK.selectors.folderOf(WorkbenchSDK.document.workflowId),
    })
}

export const DependencySelector = memo<Props>(({ nodeId, className }) => {

    const [dependency, mode] = WorkbenchSDK.useDocument(d => {
        const depRef = d.selectors.node.getDependencyRef(d, nodeId)
        if(!depRef?.workflowId)
            return [null, null]

        return [d.selectors.dependency.get(d, depRef.workflowId, depRef.mode), depRef.mode]
    })

    const iconColor = dependency?.accent ? `var(--${dependency.accent}-foreground)` : undefined
    const backgroundColor = dependency?.accent ? `color-mix(in srgb, var(--${dependency.accent}) 25%, transparent)` : 'var(--muted)'

    return (
        <div className={cn(className, "w-full nodrag cursor-auto flex flex-col gap-1")}>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto bg-card/80! min-h-7 w-full px-2 py-1 text-left"
                onClick={() => openSelector(nodeId)}
            >
                <span className="flex min-w-0 items-center gap-2 mr-auto">
                    <span
                        className="flex size-5 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor }}
                    >
                        <IconRenderer
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
                {mode === "publication" && <SystemIcons.ShieldCheck className='size-3 text-muted-foreground' />}
                {mode === "draft" && <SystemIcons.DraftingCompass className='size-3 text-muted-foreground' />}
                <SystemIcons.ChevronDown />
            </Button>
        </div>
    )
})
DependencySelector.displayName = "DependencySelector"
