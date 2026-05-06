import { memo, useEffect, useMemo, useRef } from 'react'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { Workflow } from '@pretzel-graph/shared/domain'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { WorkbenchSDK } from '../../../sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { FieldLabel } from '../FieldLabel'
import type { RendererProps } from '../FieldLabel'
import { DependencySelectorDialogContent } from './Dialog'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

const DIALOG_ID = "dependency-selector"

export const DependencySelectorField = memo<RendererProps<'DependencySelector'>>(({ field, nodeId, className }) => {
    const [value, issue, isReconciling] = WorkbenchSDK.useField(nodeId, field.id)

    const dependency = WorkbenchSDK.useStore(s => s.selectors.getDependency(s, value as Workflow.Id));

    const openDialog = () => {
        DialogSDK.actions.push(DIALOG_ID, (props) => (
            <DialogSDK.Template {...props}>
                <DependencySelectorDialogContent
                    nodeId={nodeId}
                    field={field}
                    dialogId={DIALOG_ID}
                    selectedWorkflowId={value as Workflow.Id}
                />
            </DialogSDK.Template>
        ))
    }

    let triggerClassName = ""
    if (issue)
        triggerClassName = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    const iconColor = dependency?.accent ? `var(--${dependency.accent}-foreground)` : undefined
    const backgroundColor = dependency?.accent ? `color-mix(in srgb, var(--${dependency.accent}) 25%, transparent)` : 'var(--muted)'

    return (
        <div className={cn(className, "w-full nodrag cursor-auto flex flex-col gap-1")}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn("h-auto min-h-7 w-full justify-between px-2 py-1 text-left", triggerClassName)}
                onClick={openDialog}
            >
                <span className="flex min-w-0 items-center gap-2">
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
                            {dependency?.display_name ?? ( field.placeholder || "Select workflow")}
                        </span>

                        <span className='flex text-[10px] font-normal text-muted-foreground'>
                            {dependency?.publication_name}
                        </span>
                    </span>
                </span>
                <SystemIcons.ChevronDown/>
            </Button>
        </div>
    )
})
DependencySelectorField.displayName = "DependencySelectorField"
