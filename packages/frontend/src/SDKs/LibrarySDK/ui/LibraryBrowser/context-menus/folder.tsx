import type { ReactNode } from 'react'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import { Library } from '@pretzel-graph/shared/domain'
import { OpenInSubMenu } from './open-in'

interface Props {
    folder: Library.Folder
    onOpen?: () => void
    children: ReactNode
}

export function FolderContextMenu({ folder, onOpen, children }: Props) {
    const isRoot = folder.id === Library.Folder.ROOT_ID

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                {children}
            </ContextMenu.Trigger>
            <ContextMenu.Content>
                {onOpen && (
                    <ContextMenu.Item
                        icon={<SystemIcons.FolderOpen className='size-4' />}
                        onClick={onOpen}
                    >
                        Open here
                    </ContextMenu.Item>
                )}
                <OpenInSubMenu url={`/home/library/${folder.id}`} />
                <ContextMenu.Separator />
                <ContextMenu.Sub>
                    <ContextMenu.SubTrigger icon={<SystemIcons.Plus className='size-4' />}>
                        New
                    </ContextMenu.SubTrigger>
                    <ContextMenu.SubContent>
                        <ContextMenu.Item
                            icon={<SystemIcons.Folder className='size-4' />}
                            onClick={() => LibrarySDK.dialogs.openCreateFolder({ parent_folder_id: folder.id })}
                        >
                            Folder
                        </ContextMenu.Item>
                        <ContextMenu.Item
                            icon={<SystemIcons.Graph className='size-4' />}
                            onClick={() => LibrarySDK.dialogs.openCreateWorkflow({ folder_id: folder.id })}
                        >
                            Workflow
                        </ContextMenu.Item>
                    </ContextMenu.SubContent>
                </ContextMenu.Sub>
                <ContextMenu.Separator />
                <ContextMenu.Item
                    icon={<SystemIcons.SquarePen className='size-4' />}
                    onClick={() => LibrarySDK.dialogs.openEditFolder({ folder })}
                >
                    Edit
                </ContextMenu.Item>
                <ContextMenu.Item
                    icon={<SystemIcons.Copy className='size-4' />}
                    onClick={() => navigator.clipboard.writeText(folder.id)}
                >
                    Copy ID
                </ContextMenu.Item>
                {!isRoot && (
                    <ContextMenu.Item
                        icon={folder.hidden ? <SystemIcons.Eye className='size-4' /> : <SystemIcons.EyeOff className='size-4' />}
                        onClick={() => LibrarySDK.actions.folder.setHidden(folder.id, !folder.hidden)}
                    >
                        {folder.hidden ? 'Unhide' : 'Hide'}
                    </ContextMenu.Item>
                )}
                {!isRoot && (
                    <>
                        <ContextMenu.Separator />
                        <ContextMenu.Item
                            variant='destructive'
                            icon={<SystemIcons.Trash2 className='size-4' />}
                            onClick={() => LibrarySDK.dialogs.openDeleteFolder(folder)}
                        >
                            Delete
                        </ContextMenu.Item>
                    </>
                )}
            </ContextMenu.Content>
        </ContextMenu.Root>
    )
}
