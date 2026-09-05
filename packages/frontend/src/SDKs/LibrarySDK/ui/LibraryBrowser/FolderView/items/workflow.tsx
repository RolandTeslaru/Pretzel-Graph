import type { ReactNode } from 'react'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { AlertDialog, Badge, ContextMenu, Tooltip } from '@pretzel-graph/standard-ui/foundations'
import { Workbench } from '@pretzel-graph/shared/domain'
import type { Library } from '@pretzel-graph/shared/domain'
import { openEditWorkflowDialog } from '@/SDKs/LibrarySDK/ui/create-dialogs'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { WorkflowIllustration } from '@pretzel-graph/standard-ui/icons/illustrations'
import { api } from '@/SDKs/ApiInterceptorSDK'
import { toast } from 'sonner'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import classNames from 'classnames'
import { sizeStyles, type ItemSize } from './sizes'

interface WorkflowCardProps {
    workflow: Library.WorkflowMeta
    size?: ItemSize
    onClick?: () => void
}

function iconColor(workflow: Library.WorkflowMeta) {
    const token = workflow.icon_color ?? workflow.accent

    return token ? `var(--${token})` : "var(--primary)"
}

export function WorkflowItem({ workflow, size = 'default', onClick }: WorkflowCardProps) {

    const hasActiveWorkflow = VersionControlSDK.useStore((s) => Boolean(s.activeWorkflows[workflow.id]))

    const styles = sizeStyles[size]

    return (
        <WorkflowCardContextMenu workflow={workflow}>
            <div
                onClick={onClick}
                className={classNames('group flex gap-1 relative m-auto cursor-pointer select-none rounded-md hover:bg-accent/30', styles.card, workflow.hidden && 'opacity-50')}
            >
                <div className='rounded-md p-1 flex flex-col gap-1 m-auto w-auto h-auto '>
                    {workflow.icon ? (
                        <IconRenderer
                            name={workflow.icon}
                            className={classNames('shrink-0 m-auto', styles.workflowIcon)}
                            style={{ color: iconColor(workflow) }}
                        />
                    ) : (
                        <WorkflowIllustration
                            className={classNames('shrink-0 m-auto', styles.workflowIcon)}
                            style={{ color: "var(--primary)" }}
                        />
                    )}
                    <div className="min-w-0 flex flex-col gap-1">

                        <p className={classNames('font-medium text-center truncate', styles.name)}>{workflow.display_name || 'Untitled'}</p>
                        {hasActiveWorkflow ? (
                            <Badge variant="success" className='mx-auto' size={styles.badge}>
                                Active
                            </Badge>
                        ) : null}
                        {/* {workflow.description && (
                            <p className="text-xs opacity-60 truncate max-w-30 mt-0.5">{workflow.description}</p>
                        )} */}
                    </div>
                </div>
            </div>
        </WorkflowCardContextMenu>
    )
}

interface WorkflowCardContextMenuProps {
    workflow: Library.WorkflowMeta
    children: ReactNode
}

function WorkflowCardContextMenu({ workflow, children }: WorkflowCardContextMenuProps) {
    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                {children}
            </ContextMenu.Trigger>
            <ContextMenu.Content>
                <ContextMenu.Item
                    icon={<SystemIcons.SquarePen className='size-4' />}
                    onClick={() => openEditWorkflowDialog({ workflow })}
                >
                    Edit
                </ContextMenu.Item>
                <ContextMenu.Item
                    icon={<SystemIcons.Copy className='size-4' />}
                    onClick={() => LibrarySDK.actions.workflow.duplicate(workflow.id)}
                >
                    Duplicate
                </ContextMenu.Item>
                <ContextMenu.Item
                    icon={<SystemIcons.Copy className='size-4' />}
                    onClick={() => navigator.clipboard.writeText(workflow.id)}
                >
                    Copy ID
                </ContextMenu.Item>
                <ContextMenu.Item
                    icon={<SystemIcons.Download className='size-4' />}
                    onClick={() => downloadWorkflowJson(workflow)}
                >
                    Download JSON
                </ContextMenu.Item>
                <ContextMenu.Item
                    icon={workflow.hidden ? <SystemIcons.Eye className='size-4' /> : <SystemIcons.EyeOff className='size-4' />}
                    onClick={() => LibrarySDK.actions.workflow.setHidden(workflow.id, !workflow.hidden)}
                >
                    {workflow.hidden ? 'Unhide' : 'Hide'}
                </ContextMenu.Item>
                <ContextMenu.Separator />
                <ContextMenu.Item
                    variant='destructive'
                    icon={<SystemIcons.Trash2 className='size-4' />}
                    onClick={() => openDeleteWorkflowDialog(workflow)}
                >
                    Delete
                </ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Root>
    )
}

async function downloadWorkflowJson(workflow: Library.WorkflowMeta) {
    try {
        const { workflow: full } = await Workbench.API.Workflow.get(api, { workflowId: workflow.id })
        if (!full) {
            toast.error("Failed to fetch workflow")
            return
        }
        const blob = new Blob([JSON.stringify(full, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${workflow.display_name || workflow.id}.json`
        a.click()
        URL.revokeObjectURL(url)
    } catch (error) {
        console.error("Failed to download workflow:", error)
        toast.error("Failed to download workflow")
    }
}

export function openDeleteWorkflowDialog(workflow: Library.WorkflowMeta) {
    const dialogId = `delete-workflow-${workflow.id}`

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type="danger"
            onApprove={async () => {
                await LibrarySDK.actions.workflow.delete(workflow.id)
                DialogSDK.actions.pop(dialogId)
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <AlertDialog.Title>
                Delete workflow?
            </AlertDialog.Title>
            <AlertDialog.Description>
                This action is irreversible. Deleting <span className="font-semibold text-destructive">{workflow.display_name || 'Untitled'}</span> cannot be undone.
            </AlertDialog.Description>
        </DialogSDK.AlertTemplate>
    ))
}
