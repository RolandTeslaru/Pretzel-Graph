import { useMemo, useState } from 'react'
import { useDebounce } from 'use-debounce'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Tree } from '@/components/Tree/Tree'
import type { Tree as TreeDomain } from '@/components/Tree/domain'
import { ContextMenu, Input } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { LibrarySDK } from '../sdk'
import type { FileSystemNodeData } from '../actions'
import type { Library, Workflow } from '@pretzel-graph/shared/domain'
import { openEditFolderDialog, openEditProjectDialog, openEditWorkflowDialog } from './CreateDialogs'
import { openDeleteFolderDialog } from '@/routes/home/projects/-components/FolderCard'
import { openDeleteProjectDialog } from '@/routes/home/projects/-components/ProjectCard'
import { openDeleteWorkflowDialog } from '@/routes/home/projects/-components/WorkflowCard'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import classNames from 'classnames';

type FileSystemTreeProps = {
    className?: string
}

type FileNode = TreeDomain.Dummy.Branch<FileSystemNodeData>

// Keep a branch if its name matches (with its whole subtree) or any descendant matches
// (as an expanded ancestor). Returns null when nothing in the subtree matches.
function filterBranch(branch: FileNode, query: string): FileNode | null {
    if ((branch.data?.name ?? '').toLowerCase().includes(query)) {
        return { ...branch, isExpandedByDefault: true }
    }
    if (!branch.childBranches) return null

    const kept: Record<string, FileNode> = {}
    for (const [key, child] of Object.entries(branch.childBranches)) {
        const f = filterBranch(child, query)
        if (f) kept[key] = f
    }
    if (Object.keys(kept).length === 0) return null

    return {
        ...branch,
        isExpandedByDefault: true,
        childBranches: kept as FileNode['childBranches'],
    }
}

function filterTree(root: FileNode, query: string): FileNode {
    if (!root.childBranches) return root
    const kept: Record<string, FileNode> = {}
    for (const [key, child] of Object.entries(root.childBranches)) {
        const f = filterBranch(child, query)
        if (f) kept[key] = f
    }
    return { childBranches: kept as FileNode['childBranches'] }
}

export function FileSystemTree({ className }: FileSystemTreeProps) {
    const navigate = useNavigate()
    const pathname = useRouterState({ select: (s) => s.location.pathname })

    const treeData = LibrarySDK.useStore((s) => s.treeData)

    const [search, setSearch] = useState('')
    const [debouncedSearch] = useDebounce(search, 250)
    const query = debouncedSearch.trim().toLowerCase()

    const displayTree = useMemo(
        () => (query ? filterTree(treeData, query) : treeData),
        [treeData, query],
    )

    const pathParts = pathname.split('/').filter(Boolean)
    const selectedFolderId = pathParts.length === 3 && pathParts[0] === 'home' && pathParts[1] === 'projects'
        ? pathParts[2]
        : undefined
    const selectedWorkflowId = pathParts.length === 2 && pathParts[0] === 'workflow'
        ? pathParts[1]
        : undefined
    const selectedKey = selectedWorkflowId
        ? `workflow:${selectedWorkflowId}`
        : selectedFolderId
            ? `folder:${selectedFolderId}`
            : undefined

    const handleSelect = (key: string) => {
        if (key.startsWith('folder:')) {
            const folderId = key.slice('folder:'.length) as Library.Folder.Id
            navigate({ to: '/home/projects/$folderId', params: { folderId } })
        } else if (key.startsWith('workflow:')) {
            const workflowid = key.slice('workflow:'.length) as Workflow.Id
            navigate({ to: '/workflow/$workflowid', params: { workflowid } })
        }
    }

    const hasFolders = treeData.childBranches && Object.keys(treeData.childBranches).length > 0
    const hasResults = displayTree.childBranches && Object.keys(displayTree.childBranches).length > 0

    return (
        <>
            <div className='sticky z-10 top-1 flex flex-row gap-1 mb-3'>
                <Input className='rounded-full! mx-1 backdrop-blur-md'
                    placeholder='Search'
                    size='sm'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            {!hasFolders ? (
                <div className='text-sm opacity-60 px-2 py-1'>No folders yet.</div>
            ) : !hasResults ? (
                <div className='text-sm opacity-60 px-2 py-1'>No matches.</div>
            ) : (
                <Tree<FileSystemNodeData>
                    key={query || 'all'}
                    root={displayTree}
                    className={className}
                    renderBranch={(props) => (
                        <FileSystemTreeItem
                            {...props}
                            isSelected={props.branch.key === selectedKey}
                            onSelect={handleSelect}
                        />
                    )}
                />
            )}
        </>
    )
}

function FileSystemTreeItem({
    branch,
    level,
    isExpanded,
    isLeaf,
    isLastSibling,
    onToggle,
    isSelected,
    onSelect,
}: TreeDomain.Branch.RenderProps<FileSystemNodeData> & {
    isSelected: boolean
    onSelect: (key: string) => void
}) {
    const key = branch.key
    const isFolder = key.startsWith('folder:')
    const workflowId = key.startsWith('workflow:')
        ? (key.slice('workflow:'.length) as Workflow.Id)
        : undefined

    const hasActiveWorkflow = VersionControlSDK.useStore((s) => (
        workflowId ? Boolean(s.activeWorkflows[workflowId]) : false
    ))

    const Icon = isFolder
        ? (isSelected || isExpanded ? SystemIcons.FolderOpen : SystemIcons.Folder)
        : SystemIcons.Graph

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isFolder) {
            const folderId = key.slice('folder:'.length) as Library.Folder.Id
            LibrarySDK.actions.preferences.setFolderExpanded(folderId, !isExpanded)
        }
        onToggle()
    }

    const handleEdit = () => {
        const s = LibrarySDK.useStore.getState()
        if (isFolder) {
            const folderId = key.slice('folder:'.length) as Library.Folder.Id
            const folder = s.folders[folderId]
            if (!folder) return
            if (folder.is_root) openEditProjectDialog({ project: folder })
            else openEditFolderDialog({ folder })
            return
        }
        if (workflowId) {
            const workflow = s.workflowMetas[workflowId]
            if (!workflow) return
            openEditWorkflowDialog({ workflow })
        }
    }

    const handleDelete = () => {
        const s = LibrarySDK.useStore.getState()
        if (isFolder) {
            const folderId = key.slice('folder:'.length) as Library.Folder.Id
            const folder = s.folders[folderId]
            if (!folder) return
            if (folder.is_root) openDeleteProjectDialog(folder)
            else openDeleteFolderDialog(folder)
            return
        }
        if (workflowId) {
            const workflow = s.workflowMetas[workflowId]
            if (!workflow) return
            openDeleteWorkflowDialog(workflow)
        }
    }

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                <div
                    className={`flex items-center h-7.5 pr-1 pl-1 rounded-md cursor-pointer select-none text-sm ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
                    onClick={() => onSelect(key)}
                >
                    {Array.from({ length: level }).map((_, i) => {
                        const isInnermost = i === level - 1
                        return (
                            <span key={i} className='shrink-0 w-5 relative self-stretch'>
                                {isInnermost ? (
                                    isLastSibling ? (
                                        <span className='absolute top-0 h-1/2 left-[7px] right-1.5 border-l border-b border-accent-foreground/20 rounded-bl-lg' />
                                    ) : (
                                        <span className='absolute inset-y-0 left-[7px] border-l border-accent-foreground/20' />
                                    )
                                ) : !branch.ancestorIsLast[i + 1] ? (
                                    <span className='absolute inset-y-0 left-[7px] border-l border-accent-foreground/20' />
                                ) : null}
                            </span>
                        )
                    })}
                    {!isLeaf ? (
                        <span className='shrink-0' onClick={handleToggle}>
                            <SystemIcons.ChevronRight
                                className='h-4 w-4 text-muted-foreground transition-transform duration-150'
                                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            />
                        </span>
                    ) : (
                        <></>
                    )}
                    <Icon className={`mr-1 h-4 w-4 shrink-0 ${isFolder ? 'text-muted-foreground' : 'text-primary'}`} />
                    <span className='min-w-0 flex-1 truncate whitespace-nowrap text-foreground'>{branch.data?.name}</span>
                    {hasActiveWorkflow ? (
                        <div className='my-auto ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400' />
                    ) : null}
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
}
