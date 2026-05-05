import { memo, useEffect, useMemo, useRef } from 'react'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { Workflow } from '@pretzel-graph/shared/domain'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK/sdk'
import { WorkbenchSDK } from '../../../sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { FieldLabel } from '../FieldLabel'
import type { RendererProps } from '../FieldLabel'
import { DependencySelectorDialogContent } from './Dialog'

const DIALOG_ID = "dependency-selector"

export const DependencySelectorField = memo<RendererProps<'DependencySelector'>>(({ field, nodeId, className }) => {
    const [value, issue, isReconciling] = WorkbenchSDK.useField(nodeId, field.id)
    const selectedWorkflowId = ((value as string | undefined) ?? "") as Workflow.Id | ""
    const requestedActiveWorkflowsRef = useRef(false)

    const activeWorkflows = VersionControlSDK.useStore(s => s.activeWorkflows)
    const workflowMetas = LibrarySDK.useStore(s => s.workflowMetas)

    useEffect(() => {
        if (requestedActiveWorkflowsRef.current) return
        requestedActiveWorkflowsRef.current = true
        void VersionControlSDK.actions.listActiveWorkflows().catch(console.error)
    }, [])

    const selectedOption = useMemo(() => {
        return selectedWorkflowId ? activeWorkflows[selectedWorkflowId] : undefined
    }, [activeWorkflows, selectedWorkflowId])

    const selectedWorkflowName = selectedOption
        ? workflowMetas[selectedOption.workflow_id]?.display_name ?? selectedOption.name
        : null
    const selectedWorkflowMeta = selectedOption ? workflowMetas[selectedOption.workflow_id] : undefined

    const openDialog = () => {
        DialogSDK.actions.push(DIALOG_ID, (props) => (
            <DialogSDK.Template {...props}>
                <DependencySelectorDialogContent
                    nodeId={nodeId}
                    field={field}
                    dialogId={DIALOG_ID}
                    selectedWorkflowId={selectedWorkflowId}
                />
            </DialogSDK.Template>
        ))
    }

    let triggerClassName = ""
    if (issue)
        triggerClassName = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

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
                        style={{
                            backgroundColor: selectedWorkflowMeta?.accent
                                ? `color-mix(in srgb, var(--${selectedWorkflowMeta.accent}) 25%, transparent)`
                                : 'var(--muted)',
                        }}
                    >
                        <LazyIcon
                            name={selectedWorkflowMeta?.icon ?? "Graph"}
                            className="size-3"
                            style={{ color: selectedWorkflowMeta?.accent ? `var(--${selectedWorkflowMeta.accent}-foreground)` : undefined }}
                        />
                    </span>
                    <span className="min-w-0 flex flex-col">
                        <span className="truncate text-xs font-medium">
                            {selectedWorkflowName ?? (selectedWorkflowId || field.placeholder || "Select workflow")}
                        </span>
                        {selectedWorkflowId && (
                            <span className="truncate text-[10px] font-normal text-muted-foreground">
                                {selectedWorkflowId}
                            </span>
                        )}
                    </span>
                </span>
                <span className="pl-2 text-muted-foreground">v</span>
            </Button>
        </div>
    )
})
DependencySelectorField.displayName = "DependencySelectorField"
