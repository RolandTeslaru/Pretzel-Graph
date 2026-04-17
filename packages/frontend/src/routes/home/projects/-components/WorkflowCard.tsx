import { Link } from '@tanstack/react-router'
import { DialogSDK } from '@/SDKs/DialogSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { AlertDialog, Button, DropdownMenu } from '@vx-agent-editor/vx-ui/foundations'
import type { Library } from '@vx-agent-editor/shared/domain'
import { openEditWorkflowDialog } from '@/SDKs/LibrarySDK/ui/CreateDialogs'

interface WorkflowCardProps {
    workflow: Library.WorkflowMeta
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
    return (
        <div className="relative rounded-xl border hover:bg-muted/40 transition-colors">
            <div className="absolute top-2 right-2 z-10">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <Button variant="ghost" size="icon-xs" className="p-0!">
                            <SystemIcons.Ellipsis />
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                        <DropdownMenu.Item onClick={() => openEditWorkflowDialog({ workflow })}>
                            <SystemIcons.SquarePen />
                            Edit
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onClick={() => navigator.clipboard.writeText(workflow.id)}>
                            <SystemIcons.Copy />
                            Copy ID
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            variant="destructive"
                            onClick={() => openDeleteWorkflowDialog(workflow)}
                        >
                            <SystemIcons.Trash2 />
                            Delete
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>

            <Link
                to="/workflow/$workflowid"
                params={{ workflowid: workflow.id }}
                className="block p-4 pr-11"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                        <SystemIcons.FileCode size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{workflow.display_name || 'Untitled'}</div>
                        {workflow.description && (
                            <p className="text-xs opacity-60 truncate mt-0.5">{workflow.description}</p>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    )
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
