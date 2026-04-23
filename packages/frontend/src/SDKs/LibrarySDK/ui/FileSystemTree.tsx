import { useCallback } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Tree, type TreeDataItem } from '@pretzel-graph/vx-ui/components/Tree/tree-view'
import { ContextMenu } from '@pretzel-graph/vx-ui/foundations'
import { SystemIcons } from '@pretzel-graph/vx-ui/icons'
import { LibrarySDK } from '../sdk'
import type { Library, Workflow } from '@pretzel-graph/shared/domain'
import { openEditFolderDialog, openEditProjectDialog, openEditWorkflowDialog } from './CreateDialogs'
import { openDeleteFolderDialog } from '@/routes/home/projects/-components/FolderCard'
import { openDeleteProjectDialog } from '@/routes/home/projects/-components/ProjectCard'
import { openDeleteWorkflowDialog } from '@/routes/home/projects/-components/WorkflowCard'

type FileSystemTreeProps = {
    className?: string
    expandAll?: boolean
}

function folderTreeId(id: Library.Folder.Id) {
    return `folder:${id}`
}

function workflowTreeId(id: Workflow.Id) {
    return `workflow:${id}`
}

export function FileSystemTree({
    className,
    expandAll,
}: FileSystemTreeProps) {
    const navigate = useNavigate()
    const pathname = useRouterState({ select: (s) => s.location.pathname })

    const treeData = LibrarySDK.useStore((s) => s.treeData)

    const handleSelectChange = useCallback((item: TreeDataItem | undefined) => {
        if (!item) return
        if (item.id.startsWith('folder:')) {
            const folderId = item.id.slice('folder:'.length) as Library.Folder.Id
            navigate({ to: '/home/projects/$folderId', params: { folderId } })
        } else if (item.id.startsWith('workflow:')) {
            const workflowid = item.id.slice('workflow:'.length) as Workflow.Id
            navigate({ to: '/workflow/$workflowid', params: { workflowid } })
        }
    }, [navigate])

    const pathParts = pathname.split('/').filter(Boolean)
    const selectedFolderId = pathParts.length === 3 && pathParts[0] === 'home' && pathParts[1] === 'projects'
        ? (pathParts[2] as Library.Folder.Id)
        : undefined
    const selectedWorkflowId = pathParts.length === 2 && pathParts[0] === 'workflow'
        ? (pathParts[1] as Workflow.Id)
        : undefined

    const initialSelectedItemId = selectedWorkflowId
        ? workflowTreeId(selectedWorkflowId)
        : selectedFolderId
            ? folderTreeId(selectedFolderId)
            : undefined

    if (treeData.length === 0) {
        return (
            <div className={className}>
                <div className='text-sm opacity-60 px-2 py-1'>No folders yet.</div>
            </div>
        )
    }

    return (
        <Tree.Root
            className={className}
            data={treeData}
            expandAll={expandAll}
            initialSelectedItemId={initialSelectedItemId}
            onSelectChange={handleSelectChange}
            onExpandedChange={(item, isExpanded) => {
                if (item.id.startsWith('folder:')) {
                    const folderId = item.id.slice('folder:'.length) as Library.Folder.Id
                    LibrarySDK.actions.preferences.setFolderExpanded(folderId, isExpanded)
                }
            }}
            renderItem={({ item, isOpen, isSelected }) => {
                const Icon = isSelected && item.selectedIcon
                    ? item.selectedIcon
                    : isOpen && item.openIcon
                      ? item.openIcon
                      : item.icon

                const handleDelete = () => {
                    const s = LibrarySDK.useStore.getState()
                    if (item.id.startsWith('folder:')) {
                        const folderId = item.id.slice('folder:'.length) as Library.Folder.Id
                        const folder = s.folders[folderId]
                        if (!folder) return

                        if (folder.is_root) {
                            openDeleteProjectDialog(folder)
                        } else {
                            openDeleteFolderDialog(folder)
                        }
                        return
                    }

                    if (item.id.startsWith('workflow:')) {
                        const workflowId = item.id.slice('workflow:'.length) as Workflow.Id
                        const workflow = s.workflowMetas[workflowId]
                        if (!workflow) return
                        openDeleteWorkflowDialog(workflow)
                    }
                }

                const handleEdit = () => {
                    const s = LibrarySDK.useStore.getState()
                    if (item.id.startsWith('folder:')) {
                        const folderId = item.id.slice('folder:'.length) as Library.Folder.Id
                        const folder = s.folders[folderId]
                        if (!folder) return

                        if (folder.is_root) {
                            openEditProjectDialog({ project: folder })
                        } else {
                            openEditFolderDialog({ folder })
                        }
                        return
                    }

                    if (item.id.startsWith('workflow:')) {
                        const workflowId = item.id.slice('workflow:'.length) as Workflow.Id
                        const workflow = s.workflowMetas[workflowId]
                        if (!workflow) return
                        openEditWorkflowDialog({ workflow })
                    }
                }

                return (
                    <ContextMenu.Root>
                        <ContextMenu.Trigger asChild>
                            <div className='flex w-full min-w-0 items-center'>
                                {Icon ? <Icon className='mr-2 h-4 w-4 shrink-0' /> : null}
                                <span className='truncate text-sm'>{item.name}</span>
                            </div>
                        </ContextMenu.Trigger>
                        <ContextMenu.Content>
                            <ContextMenu.Item
                                icon={<SystemIcons.SquarePen className='size-4' />}
                                onClick={handleEdit}
                            >
                                Edit
                            </ContextMenu.Item>
                            <ContextMenu.Item
                                variant='destructive'
                                icon={<SystemIcons.Trash2 className='size-4' />}
                                onClick={handleDelete}
                            >
                                Delete
                            </ContextMenu.Item>
                        </ContextMenu.Content>
                    </ContextMenu.Root>
                )
            }}
        />
    )
}
