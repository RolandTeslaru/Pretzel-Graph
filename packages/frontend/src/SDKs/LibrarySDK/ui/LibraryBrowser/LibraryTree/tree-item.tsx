import type { Tree as TreeDomain } from '@/components/Tree/domain'
import { ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { LibrarySDK } from '../../../sdk'
import type { FileSystemNodeData } from '../../../actions'
import { Library } from '@pretzel-graph/shared/domain'
import type { Workflow } from '@pretzel-graph/shared/domain'
import { openEditFolderDialog, openEditWorkflowDialog } from '../../create-dialogs'
import { openDeleteFolderDialog } from '../FolderView/items/folder'
import { openDeleteWorkflowDialog } from '../FolderView/items/workflow'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import classNames from 'classnames'
import { sizeStyles, type FileSystemTreeSize } from './sizes'

export function TreeItem({
    branch,
    level,
    isExpanded,
    isLeaf,
    isLastSibling,
    onToggle,
    isSelected,
    styles,
    onFolderClick,
    onWorkflowClick,
}: TreeDomain.Branch.RenderProps<FileSystemNodeData> & {
    isSelected: boolean
    styles: (typeof sizeStyles)[FileSystemTreeSize]
    onFolderClick?: (folderId: Library.Folder.Id) => void
    onWorkflowClick?: (workflowId: Workflow.Id) => void
}) {
    const key = branch.key
    const isFolder = key.startsWith('folder:')
    const folderId = isFolder
        ? (key.slice('folder:'.length) as Library.Folder.Id)
        : undefined
    const workflowId = key.startsWith('workflow:')
        ? (key.slice('workflow:'.length) as Workflow.Id)
        : undefined

    const isRootFolder = folderId === Library.Folder.ROOT_ID

    const handleClick = () => {
        if (folderId) return onFolderClick?.(folderId)
        if (workflowId) return onWorkflowClick?.(workflowId)
    }

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
            openEditFolderDialog({ folder })
            return
        }
        if (workflowId) {
            const workflow = s.workflowMetas[workflowId]
            if (!workflow) return
            openEditWorkflowDialog({ workflow })
        }
    }

    const isHidden = branch.data?.hidden === true

    const handleToggleHidden = () => {
        if (folderId) return LibrarySDK.actions.folder.setHidden(folderId, !isHidden)
        if (workflowId) return LibrarySDK.actions.workflow.setHidden(workflowId, !isHidden)
    }

    const handleDelete = () => {
        const s = LibrarySDK.useStore.getState()
        if (isFolder) {
            const folderId = key.slice('folder:'.length) as Library.Folder.Id
            const folder = s.folders[folderId]
            if (!folder) return
            openDeleteFolderDialog(folder)
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
                    className={classNames(
                        'flex items-center pr-1 pl-1 rounded-md cursor-pointer select-none',
                        styles.row,
                        isSelected ? 'bg-accent' : 'hover:bg-accent/50',
                        isHidden && 'opacity-50',
                    )}
                    onClick={handleClick}
                >
                    {Array.from({ length: level }).map((_, i) => {
                        const isInnermost = i === level - 1
                        return (
                            <span key={i} className={classNames('shrink-0 relative self-stretch opacity-20', styles.indent)}>
                                {isInnermost ? (
                                    isLastSibling ? (
                                        <span className={classNames('absolute top-0 h-1/2 right-0.5 border-l border-b border-accent-foreground', styles.line, styles.radius)} />
                                    ) : (
                                        <>
                                            <span className={classNames('absolute inset-y-0 border-l border-accent-foreground', styles.line)} />
                                            {isFolder && (
                                                <span className={classNames('absolute right-0.5 border-l border-b border-accent-foreground', styles.line, styles.radius, styles.corner)} />
                                            )}
                                        </>
                                    )
                                ) : !branch.ancestorIsLast[i + 1] ? (
                                    <span className={classNames('absolute inset-y-0 border-l border-accent-foreground', styles.line)} />
                                ) : null}
                            </span>
                        )
                    })}
                    {!isLeaf ? (
                        <span className='shrink-0' onClick={handleToggle}>
                            <SystemIcons.ChevronRight
                                className={classNames('text-muted-foreground transition-transform duration-150', styles.icon)}
                                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            />
                        </span>
                    ) : (
                        <></>
                    )}
                    <Icon className={classNames('mr-1 shrink-0', styles.icon, isFolder ? 'text-muted-foreground' : 'text-primary')} />
                    <span className='min-w-0 flex-1 truncate whitespace-nowrap text-foreground'>{branch.data?.name}</span>
                    {hasActiveWorkflow ? (
                        <div className='my-auto ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400' />
                    ) : null}
                </div>
            </ContextMenu.Trigger>
            <ContextMenu.Content>
                {workflowId && (
                    <>
                        <ContextMenu.Item
                            icon={<SystemIcons.Graph className='size-4' />}
                            onClick={() => onWorkflowClick?.(workflowId)}
                        >
                            Open here
                        </ContextMenu.Item>
                        <ContextMenu.Item
                            icon={<SystemIcons.ExternalLink className='size-4' />}
                            onClick={() => WorkbenchSDK.openWorkflowWindow(workflowId)}
                        >
                            Open in new tab
                        </ContextMenu.Item>
                        <ContextMenu.Separator />
                    </>
                )}
                <ContextMenu.Item
                    icon={<SystemIcons.SquarePen className='size-4' />}
                    onClick={handleEdit}
                >
                    Edit
                </ContextMenu.Item>
                {!isRootFolder && (
                    <ContextMenu.Item
                        icon={isHidden ? <SystemIcons.Eye className='size-4' /> : <SystemIcons.EyeOff className='size-4' />}
                        onClick={handleToggleHidden}
                    >
                        {isHidden ? 'Unhide' : 'Hide'}
                    </ContextMenu.Item>
                )}
                {!isRootFolder && (
                    <ContextMenu.Item
                        variant='destructive'
                        icon={<SystemIcons.Trash2 className='size-4' />}
                        onClick={handleDelete}
                    >
                        Delete
                    </ContextMenu.Item>
                )}
            </ContextMenu.Content>
        </ContextMenu.Root>
    )
}
