import { useState, type MouseEvent, type ReactNode } from 'react'
import { ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import type { Library } from '@pretzel-graph/shared/domain'
import { useLibraryBrowser } from '../root'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { FolderMenuItems } from './folder'
import { WorkflowMenuItems } from './workflow'
import { SkillMenuItems } from './skill'
import { BackgroundMenuItems } from './background'

export function LibraryContextMenu({ children }: { children: ReactNode }) {
    const [target, setTarget] = useState<LibraryContextMenu.Target | null>(null)

    const handleContextMenu = (event: MouseEvent) => {
        const element = (event.target as HTMLElement).closest<HTMLElement>('[data-library-item]')

        if (!element) {
            setTarget({ type: 'background' })
            return
        }

        setTarget({
            type: element.dataset.libraryItem as LibraryContextMenu.Target['type'],
            id: element.dataset.libraryId!,
        } as LibraryContextMenu.Target)
    }

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild onContextMenu={handleContextMenu}>
                <div className='contents'>
                    {children}
                </div>
            </ContextMenu.Trigger>
            <ContextMenu.Content className='w-[170px]'>
                {target && (
                    <TargetMenuItems target={target} />
                )}
            </ContextMenu.Content>
        </ContextMenu.Root>
    )
}

function TargetMenuItems({ target }: { target: LibraryContextMenu.Target }) {
    const { cwd, setCwd, onItemClick, isItemDisabled } = useLibraryBrowser()

    const entity = LibrarySDK.useStore((s) => {
        switch (target.type) {
            case 'background':
                return undefined

            case 'folder':
                return s.folders[target.id]

            case 'workflow':
                return s.workflowMetas[target.id]

            case 'skill':
                return s.skillMetas[target.id]
        }
    })

    if (target.type === 'background')
        return <BackgroundMenuItems cwd={cwd} />

    if (!entity)
        return null

    switch (target.type) {
        case 'folder':
            return <FolderMenuItems folder={entity as Library.Folder} onOpen={() => setCwd(target.id)} />

        case 'workflow': {
            const canOpen = onItemClick && !(isItemDisabled?.(target) ?? false)

            return <WorkflowMenuItems workflow={entity as Library.WorkflowMeta} onOpen={canOpen ? () => onItemClick(target) : undefined} />
        }

        case 'skill':
            return <SkillMenuItems skill={entity as Parameters<typeof SkillMenuItems>[0]['skill']} />
    }
}

export namespace LibraryContextMenu {
    export type Target =
        | LibrarySDK.Item
        | { type: 'folder'; id: Library.Folder.Id }
        | { type: 'background' }
}
