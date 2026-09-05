import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import type { Library } from '@pretzel-graph/shared/domain'
import { FolderIllustration } from '@pretzel-graph/standard-ui/icons/illustrations'
import classNames from 'classnames'
import { sizeStyles, type ItemSize } from './sizes'
import { FolderContextMenu } from '../../context-menus/folder'

interface FolderCardProps {
    folder: Library.Folder
    size?: ItemSize
    onClick?: () => void
}

export function FolderItem({ folder, size = 'default', onClick }: FolderCardProps) {
    const itemCount = LibrarySDK.useStore((s) =>
        s.selectors.childFoldersOf(folder.id).length +
        s.selectors.workflowsInFolder(folder.id).length,
    )

    const styles = sizeStyles[size]

    return (
        <FolderContextMenu folder={folder} onOpen={onClick}>
            <div
                onClick={onClick}
                className={classNames('group flex relative m-auto cursor-pointer select-none rounded-md hover:bg-accent/30', styles.card, folder.hidden && 'opacity-50')}
            >
                <div className='rounded-md p-1 flex flex-col gap-1 m-auto w-auto h-auto '>
                    <FolderIllustration color="var(--primary)" className={classNames('shrink-0 mx-auto', styles.folderIcon)} />
                    <div className="min-w-0 flex-1">
                        <p className={classNames('font-medium text-center truncate', styles.name)}>{folder.display_name}</p>
                        <div className={classNames('opacity-50 flex items-center justify-center gap-3', styles.meta)}>
                            <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </FolderContextMenu>
    )
}
