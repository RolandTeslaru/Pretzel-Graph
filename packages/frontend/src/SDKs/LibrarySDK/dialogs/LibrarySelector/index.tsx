import { useState } from 'react'
import { Dialog } from '@pretzel-graph/standard-ui/foundations'
import { Library, type Gateway } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { LibraryBrowser } from '@/SDKs/LibrarySDK/ui/LibraryBrowser'
import { GatewaySDK } from '@/SDKs/GatewaySDK/sdk'

export const LIBRARY_SELECTOR_DIALOG_ID = 'library-selector'

const DEFAULT_QUERY_DELAY = 150

export namespace LibrarySelector {
    export type Accept = 'workflow' | 'folder' | 'skill' | 'connection' | 'any'

    export type WorkflowItem = Extract<LibrarySDK.Item, { type: 'workflow' }>
    export type SkillItem = Extract<LibrarySDK.Item, { type: 'skill' }>
    export type ConnectionItem = Extract<LibrarySDK.Item, { type: 'connection' }>
    export type FolderItem = { type: 'folder'; id: Library.Folder.Id }
    export type Item = LibrarySDK.Item | FolderItem

    export type ItemFor<A extends Accept> =
        A extends 'workflow' ? WorkflowItem :
        A extends 'folder' ? FolderItem :
        A extends 'skill' ? SkillItem :
        A extends 'connection' ? ConnectionItem :
        Item

    export interface Options<A extends Accept> {
        // One kind, or several; everything else in the browser is disabled.
        accept: A | readonly A[]
        /** Connections only: narrows the pickable ones to one definition. */
        definitionId?: Gateway.Definition.Id
        /** Folder the browser opens in. Defaults to the library root. */
        initialCwd?: Library.Folder.Id
        onSelect: (item: ItemFor<A>) => void
        /** Holds the library queries back until the dialog has animated in. */
        queryDelay?: number
    }
}

const TITLES: Record<LibrarySelector.Accept, string> = {
    workflow: 'Select a Workflow',
    folder: 'Select a Folder',
    skill: 'Select a Skill',
    connection: 'Select a Connection',
    any: 'Select an Item',
}

export function openLibrarySelector<A extends LibrarySelector.Accept>(options: LibrarySelector.Options<A>) {
    const onSelect = options.onSelect as (item: LibrarySelector.Item) => void

    const accept = (Array.isArray(options.accept) ? options.accept : [options.accept]) as readonly LibrarySelector.Accept[]

    DialogSDK.actions.push(LIBRARY_SELECTOR_DIALOG_ID, (props) => (
        <LibrarySelectorDialog dialogProps={props} accept={accept} definitionId={options.definitionId} initialCwd={options.initialCwd} onSelect={onSelect} queryDelay={options.queryDelay ?? DEFAULT_QUERY_DELAY} />
    ))
}

interface Props {
    dialogProps: DialogSDK.TemplateProps
    accept: readonly LibrarySelector.Accept[]
    definitionId?: Gateway.Definition.Id
    initialCwd?: Library.Folder.Id
    onSelect: (item: LibrarySelector.Item) => void
    queryDelay: number
}

const LibrarySelectorDialog = ({ dialogProps, accept, definitionId, initialCwd, onSelect, queryDelay }: Props) => {
    const [cwd, setCwd] = useState<Library.Folder.Id>(initialCwd ?? Library.Folder.ROOT_ID)

    const accepts = (type: LibrarySelector.Item['type']) => accept.includes(type) || accept.includes('any')

    const cwdName = LibrarySDK.useStore((s) => s.folders[cwd]?.display_name ?? 'Library')

    const commit = (item: LibrarySelector.Item) => {
        onSelect(item)
        DialogSDK.actions.pop(LIBRARY_SELECTOR_DIALOG_ID)
    }

    const isItemDisabled = (item: LibrarySDK.Item) => {
        if (!accepts(item.type))
            return true

        // A field bound to one connection type only takes connections of that type.
        if (item.type === 'connection' && definitionId)
            return GatewaySDK.state.connections[item.id]?.definitionId !== definitionId

        return false
    }

    const handleSelectFolder = () => commit({ type: 'folder', id: cwd })

    return (
        <LibraryBrowser.Root cwd={cwd} setCwd={setCwd} onItemClick={commit} isItemDisabled={isItemDisabled} queryDelay={queryDelay}>
            <DialogSDK.SplitTemplate {...dialogProps}
                sidebarRenderer={() => (
                    <div className='relative'>
                        <LibraryBrowser.Tree.Header className='flex-col gap-2 top-0 left-0 px-2 py-2 z-20'>
                            <LibraryBrowser.Tree.SearchInput size='xs'
                                className='rounded-full! '
                            />
                        </LibraryBrowser.Tree.Header>

                        <div className='flex-1 min-h-0'>
                            <LibraryBrowser.Tree
                                size='sm'
                                className='pt-[40px] px-2'
                                scrollContainerClassName='h-[600px] [mask-image:linear-gradient(to_bottom,transparent_8px,black_40px)]'
                            />
                        </div>
                    </div>
                )}
                sidebarClassName='w-[260px] shrink-0 p-0!'
                contentClassName='p-0!'
            >
                <div className='relative flex h-full w-[480px] shrink-0 flex-col gap-2'>
                    <LibraryBrowser.View.Header className='z-20 px-2 top-2 flex flex-col!'>
                        <div className='flex flex-row w-full'>
                            <Dialog.Title className='text-sm h-auto my-auto'>{accept.length === 1 ? TITLES[accept[0]] : TITLES.any}</Dialog.Title>
                            <div className='ml-auto flex flex-row gap-2 w-auto'>
                                <LibraryBrowser.View.SearchInput className='rounded-full!' size='xs' />
                                <LibraryBrowser.View.CreateBtn size="xs" triggerClassName='rounded-full'/>
                            </div>
                        </div>
                        
                        <LibraryBrowser.View.Breadcrumbs className='w-auto mr-auto ' linkClassName='text-xs!' />
                    </LibraryBrowser.View.Header>
                    <div className='flex-1 min-h-0'>
                        <LibraryBrowser.View
                            size='sm'
                            className='pt-[70px] px-2'
                            scrollContainerClassName='h-[600px] [mask-image:linear-gradient(to_bottom,transparent_8px,black_90px)]'
                        />
                    </div>
                    {accepts('folder') && (
                        <div className='absolute z-20 bottom-2 right-2'>
                            <Dialog.Action size='sm' onClick={handleSelectFolder}>
                                <SystemIcons.FolderOpen />
                                Select "{cwdName}"
                            </Dialog.Action>
                        </div>
                    )}
                </div>
            </DialogSDK.SplitTemplate>
        </LibraryBrowser.Root>
    )
}
