import type { Tree as TreeDomain } from '@/components/Tree/domain'
import { Tree } from '@/components/Tree'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { LibrarySDK } from '../../../sdk'
import type { FileSystemNodeData } from '../../../actions'
import { Skill, type Library, type Workflow } from '@pretzel-graph/shared/domain'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import classNames from 'classnames'
import { sizeStyles, type FileSystemTreeSize } from './sizes'
import { FolderContextMenu } from '../context-menus/folder'
import { WorkflowContextMenu } from '../context-menus/workflow'
import { SkillContextMenu } from '../context-menus/skill'

export function TreeItem({
    branch,
    level,
    isExpanded,
    isLeaf,
    isLastSibling,
    onToggle,
    isSelected,
    styles,
    size,
    onFolderClick,
    onItemClick,
    isItemDisabled,
}: TreeDomain.Branch.RenderProps<FileSystemNodeData> & {
    isSelected: boolean
    styles: (typeof sizeStyles)[FileSystemTreeSize]
    size: FileSystemTreeSize
    onFolderClick?: (folderId: Library.Folder.Id) => void
    onItemClick?: (item: LibrarySDK.Item) => void
    isItemDisabled?: (item: LibrarySDK.Item) => boolean
}) {
    const key = branch.key
    const isFolder = key.startsWith('folder:')
    const folderId = isFolder
        ? (key.slice('folder:'.length) as Library.Folder.Id)
        : undefined
    const workflowId = key.startsWith('workflow:')
        ? (key.slice('workflow:'.length) as Workflow.Id)
        : undefined
    const skillId = key.startsWith('skill:')
        ? (key.slice('skill:'.length) as Skill.Id)
        : undefined

    const folder = LibrarySDK.useStore((s) => (folderId ? s.folders[folderId] : undefined))
    const workflow = LibrarySDK.useStore((s) => (workflowId ? s.workflowMetas[workflowId] : undefined))
    const skill = LibrarySDK.useStore((s) => (skillId ? s.skillMetas[skillId] : undefined))

    const item       = getItem(workflowId, skillId)
    const isDisabled = item !== undefined && (isItemDisabled?.(item) ?? false)

    const handleClick = () => {
        if (folderId)
            return onFolderClick?.(folderId)

        if (item && !isDisabled)
            onItemClick?.(item)
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
                'flex items-center pr-1 pl-1 rounded-md select-none',
                styles.row,
                isSelected ? 'bg-accent' : 'hover:bg-accent/50',
                isHidden && 'opacity-50',
                isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
            )}
            onClick={handleClick}
        >
            <Tree.IndentGuides level={level} ancestorIsLast={branch.ancestorIsLast} isLastSibling={isLastSibling} elbow={isFolder} size={size} />
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
            {skillId ? (
                <IconRenderer
                    name={skill?.icon ?? Skill.DEFAULT_ICON}
                    className={classNames('mr-1 shrink-0', styles.icon)}
                    style={{ color: `var(--${skill?.accent ?? Skill.DEFAULT_ACCENT})` }}
                />
            ) : (
                <Icon className={classNames('mr-1 shrink-0', styles.icon, isFolder ? 'text-muted-foreground' : 'text-primary')} />
            )}
            <span className='min-w-0 flex-1 truncate whitespace-nowrap text-foreground'>{branch.data?.name}</span>
            {hasActiveWorkflow ? (
                <div className='my-auto ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400' />
            ) : null}
        </div>
    )

    if (workflow) {
        return (
            <WorkflowContextMenu workflow={workflow} onOpen={handleClick}>
                {row}
            </WorkflowContextMenu>
        )
    }

    if (skill) {
        return (
            <SkillContextMenu skill={skill}>
                {row}
            </SkillContextMenu>
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

// The library item a row stands for; folder rows have none.
function getItem(workflowId?: Workflow.Id, skillId?: Skill.Id): LibrarySDK.Item | undefined {
    if (workflowId)
        return { type: 'workflow', id: workflowId }

    if (skillId)
        return { type: 'skill', id: skillId }

    return undefined
}
