import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { DialogSDK } from '@/SDKs/DialogSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { AlertDialog, ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import { Workbench } from '@pretzel-graph/shared/domain'
import type { Library } from '@pretzel-graph/shared/domain'
import { openEditWorkflowDialog } from '@/SDKs/LibrarySDK/ui/CreateDialogs'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { api } from '@/SDKs/ApiInterceptorSDK'
import { toast } from 'sonner'

interface WorkflowCardProps {
    workflow: Library.WorkflowMeta
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
    return (
        <WorkflowCardContextMenu workflow={workflow}>
            <Link
                to="/workflow/$workflowid"
                params={{ workflowid: workflow.id }}
                className="p-4 flex flex-col gap-1 hover:bg-accent/30 rounded-md relative m-auto"
            >
                <LazyIcon
                    name={workflow.icon ?? "Graph"}
                    size={40}
                    className="shrink-0 w-fit h-fit m-auto"
                    style={{ color: (workflow.icon_color ?? workflow.accent) ? `var(--${workflow.icon_color ?? workflow.accent})` : "var(--primary)" }}
                />
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-center truncate">{workflow.display_name || 'Untitled'}</p>
                    {workflow.description && (
                        <p className="text-xs opacity-60 truncate mt-0.5">{workflow.description}</p>
                    )}
                </div>
            </Link>
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
