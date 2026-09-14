import type { Dependency } from '@pretzel-graph/shared/domain'
import { memo } from 'react'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import type { Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'

const openSelector = (nodeId: Workflow.Node.Id, field: Foundations.Field.Dependency) => {
    LibrarySDK.dialogs.openDependencySelector({
        onLocalWorkflowSelected: (workflowId, kind) =>
            WorkbenchSDK.actions.field.dependency.setValue(nodeId, field.id, { kind, id: workflowId }),
        onListingSelected: (listingId) =>
            WorkbenchSDK.actions.field.dependency.setValue(nodeId, field.id, { kind: 'listing', id: listingId }),
        onListingPreview: (listingId) =>
            WorkbenchSDK.openWorkflowWindow(listingId),
    }, {
        initialFolderId: LibrarySDK.selectors.folderOf(WorkbenchSDK.document.workflowId),
        acceptsKind:     field.acceptsKind,
    })
}

export const DependencyField = memo<RendererProps<'Dependency'>>(({ field, nodeId, className }) => {

    const [value, , , issue] = WorkbenchSDK.useField<Dependency.Ref.Workflow | null>(nodeId, field)

    const dependency = WorkbenchSDK.useDocument(d => value ? d.selectors.dependency.getWorkflow(d, value.id, value.kind) : null)
    const kind = value?.kind ?? null

    const iconColor = dependency?.accent ? `var(--${dependency.accent}-foreground)` : undefined
    const backgroundColor = dependency?.accent ? `color-mix(in srgb, var(--${dependency.accent}) 25%, transparent)` : 'var(--muted)'

    const errorClass = issue ? 'border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50' : ''

    return (
        <div className={cn(className, "w-full nodrag cursor-auto flex flex-col gap-1")}>
            <FieldLabel field={field} />
            <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn("h-auto bg-card/80! min-h-7 w-full px-2 py-1 text-left", errorClass)}
                onClick={() => openSelector(nodeId, field)}
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
                            {dependency && "name" in dependency ? dependency.name : null}
                        </span>
                    </span>
                </span>
                {(kind === "publishedWorkflow" || kind === "listing") && <SystemIcons.ShieldCheck className='size-3 text-muted-foreground' />}
                {kind === "draftWorkflow" && <SystemIcons.DraftingCompass className='size-3 text-muted-foreground' />}
                <SystemIcons.ChevronDown />
            </Button>
        </div>
    )
})
DependencyField.displayName = "DependencyField"
