import type { Tree as TreeDomain } from '@/components/Tree/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { LibrarySDK } from '../../../sdk'
import type { FileSystemNodeData } from '../../../actions'
import type { Library, Workflow } from '@pretzel-graph/shared/domain'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import classNames from 'classnames'
import { sizeStyles, type FileSystemTreeSize } from './sizes'
import { FolderContextMenu } from '../context-menus/folder'
import { WorkflowContextMenu } from '../context-menus/workflow'

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

    const folder = LibrarySDK.useStore((s) => (folderId ? s.folders[folderId] : undefined))
    const workflow = LibrarySDK.useStore((s) => (workflowId ? s.workflowMetas[workflowId] : undefined))

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
        if (folderId) {
            LibrarySDK.actions.preferences.setFolderExpanded(folderId, !isExpanded)
        }
        onToggle()
    }

    const isHidden = branch.data?.hidden === true

    const row = (
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
    )

    if (workflow) {
        return (
            <WorkflowContextMenu workflow={workflow} onOpen={() => onWorkflowClick?.(workflow.id)}>
                {row}
            </WorkflowContextMenu>
        )
    }

    if (folder) {
        return (
            <FolderContextMenu folder={folder} onOpen={() => onFolderClick?.(folder.id)}>
                {row}
            </FolderContextMenu>
        )
    }

    return row
}
