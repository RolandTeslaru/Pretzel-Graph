import type { ReactNode } from 'react'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import { Workbench } from '@pretzel-graph/shared/domain'
import type { Library } from '@pretzel-graph/shared/domain'
import { OpenInSubMenu } from './open-in'
import { api } from '@/SDKs/ApiInterceptorSDK'
import { toast } from 'sonner'

interface Props {
    workflow: Library.WorkflowMeta
    onOpen?: () => void
    children: ReactNode
}

export function WorkflowContextMenu({ workflow, onOpen, children }: Props) {
    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                {children}
            </ContextMenu.Trigger>
            <ContextMenu.Content>
                {onOpen && (
                    <ContextMenu.Item
                        icon={<SystemIcons.Graph className='size-4' />}
                        onClick={onOpen}
                    >
                        Open here
                    </ContextMenu.Item>
                )}
                <OpenInSubMenu url={`/workflow/${workflow.id}`} />
                <ContextMenu.Separator />
                <ContextMenu.Item
                    icon={<SystemIcons.SquarePen className='size-4' />}
                    onClick={() => LibrarySDK.dialogs.openEditWorkflow({ workflow })}
                >
                    Edit
                </ContextMenu.Item>
                <ContextMenu.Item
                    icon={<SystemIcons.Copy className='size-4' />}
                    onClick={() => LibrarySDK.actions.workflow.duplicate(workflow.id)}
                >
                    Duplicate
                </ContextMenu.Item>
                <ContextMenu.Sub>
                    <ContextMenu.SubTrigger icon={<SystemIcons.Copy className='size-4' />}>
                        Copy
                    </ContextMenu.SubTrigger>
                    <ContextMenu.SubContent>
                        <ContextMenu.Item onClick={() => copy(workflow.id, 'Workflow id copied')}>
                            ID
                        </ContextMenu.Item>
                        <ContextMenu.Item onClick={() => copy(`${window.location.origin}/workflow/${workflow.id}`, 'Link copied')}>
                            Link
                        </ContextMenu.Item>
                        {workflow.listing_id && (
                            <ContextMenu.Item onClick={() => copy(workflow.listing_id!, 'Listing id copied')}>
                                Listing ID
                            </ContextMenu.Item>
                        )}
                    </ContextMenu.SubContent>
                </ContextMenu.Sub>
                <ContextMenu.Item
                    icon={<SystemIcons.ArrowRight className='size-4' />}
                    onClick={() => openMoveWorkflow(workflow)}
                >
                    Move to…
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
                    onClick={() => LibrarySDK.dialogs.openDeleteWorkflow(workflow)}
                >
                    Delete
                </ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Root>
    )
}

function openMoveWorkflow(workflow: Library.WorkflowMeta) {
    LibrarySDK.dialogs.openResourceSelector({
        accept: 'folder',
        onSelect: async ({ id }) => {
            if (id === workflow.folder_id) return

            await LibrarySDK.actions.workflow.move(workflow.id, id)
            toast.success('Workflow moved')
        },
    })
}

async function copy(text: string, message: string) {
    await navigator.clipboard.writeText(text)
    toast.success(message)
}

async function downloadWorkflowJson(workflow: Library.WorkflowMeta) {
    try {
        const { workflow: full } = await Workbench.API.Workflow.get(api, { workflowId: workflow.id })

        if (!full) {
            toast.error('Failed to fetch workflow')
            return
        }

        const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')

        a.href = url
        a.download = `${workflow.display_name || workflow.id}.json`
        a.click()

        URL.revokeObjectURL(url)
    } catch (error) {
        console.error('Failed to download workflow:', error)
        toast.error('Failed to download workflow')
    }
}
