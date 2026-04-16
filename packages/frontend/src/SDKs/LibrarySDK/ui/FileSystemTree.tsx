import { useMemo } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Tree, type TreeDataItem } from '@vx-agent-editor/vx-ui/components/Tree/tree-view'
import { ContextMenu } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { LibrarySDK } from '../sdk'
import type { Library, Workflow } from '@vx-agent-editor/shared/domain'
import { openEditFolderDialog, openEditProjectDialog, openEditWorkflowDialog } from './CreateDialogs'
import { openDeleteFolderDialog } from '@/routes/home/projects/-components/FolderCard'
import { openDeleteProjectDialog } from '@/routes/home/projects/-components/ProjectCard'
import { openDeleteWorkflowDialog } from '@/routes/home/projects/-components/WorkflowCard'

type FileSystemTreeProps = {
    className?: string
    rootFolderId?: Library.Folder.Id
    includeWorkflows?: boolean
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
    rootFolderId,
    includeWorkflows = true,
    expandAll,
}: FileSystemTreeProps) {
    const navigate = useNavigate()
    const pathname = useRouterState({ select: (s) => s.location.pathname })

    const [folders, workflowMetas, treeExpandedByFolderId] = LibrarySDK.useStore((s) => [
        s.folders,
        s.workflowMetas,
        s.treeExpandedByFolderId,
    ])

    const roots = useMemo(() => {
        const values = Object.values(folders)
        if (rootFolderId) {
            const root = folders[rootFolderId]
            return root ? [root] : []
        }

        return values
            .filter((f) => f.is_root)
            .sort((a, b) => a.display_name.localeCompare(b.display_name))
    }, [folders, rootFolderId])

    const treeData = useMemo<TreeDataItem[]>(() => {
        const childFoldersByParent = new Map<string, Library.Folder[]>()
        const workflowsByFolder = new Map<string, Library.WorkflowMeta[]>()

        for (const folder of Object.values(folders)) {
            if (!folder.parent_folder_id) continue
            const key = folder.parent_folder_id
            const list = childFoldersByParent.get(key) ?? []
            list.push(folder)
            childFoldersByParent.set(key, list)
        }

        for (const workflow of Object.values(workflowMetas)) {
            const key = workflow.folder_id
            const list = workflowsByFolder.get(key) ?? []
            list.push(workflow)
            workflowsByFolder.set(key, list)
        }

        for (const list of childFoldersByParent.values()) {
            list.sort((a, b) => a.display_name.localeCompare(b.display_name))
        }
        for (const list of workflowsByFolder.values()) {
            list.sort((a, b) => a.display_name.localeCompare(b.display_name))
        }

        const buildFolderNode = (folder: Library.Folder): TreeDataItem => {
            const folderChildren = (childFoldersByParent.get(folder.id) ?? []).map(buildFolderNode)
            const workflowChildren = includeWorkflows
                ? (workflowsByFolder.get(folder.id) ?? []).map((workflow) => ({
                      id: workflowTreeId(workflow.id),
                      name: workflow.display_name,
                      icon: SystemIcons.Graph,
                      selectedIcon: SystemIcons.Graph,
                      onClick: () => {
                          navigate({ to: '/workflow/$workflowid', params: { workflowid: workflow.id } })
                      },
                  }))
                : []

            const children = [...folderChildren, ...workflowChildren]

            return {
                id: folderTreeId(folder.id),
                name: folder.display_name,
                icon: SystemIcons.Folder,
                openIcon: SystemIcons.FolderOpen,
                selectedIcon: SystemIcons.FolderOpen,
                expanded: treeExpandedByFolderId[folder.id] ?? true,
                onClick: () => {
                    navigate({ to: '/home/projects/$folderId', params: { folderId: folder.id } })
                },
                children: children.length > 0 ? children : undefined,
            }
        }

        return roots.map(buildFolderNode)
    }, [folders, workflowMetas, includeWorkflows, roots, treeExpandedByFolderId, navigate])

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
                    if (item.id.startsWith('folder:')) {
                        const folderId = item.id.slice('folder:'.length) as Library.Folder.Id
                        const folder = folders[folderId]
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
                        const workflow = workflowMetas[workflowId]
                        if (!workflow) return
                        openDeleteWorkflowDialog(workflow)
                    }
                }

                const handleEdit = () => {
                    if (item.id.startsWith('folder:')) {
                        const folderId = item.id.slice('folder:'.length) as Library.Folder.Id
                        const folder = folders[folderId]
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
                        const workflow = workflowMetas[workflowId]
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
