import { useState } from 'react'
import { Button, Dialog } from '@pretzel-graph/standard-ui/foundations'
import { Library } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { LibraryBrowser } from '@/SDKs/LibrarySDK/ui/LibraryBrowser'

export const LIBRARY_SELECTOR_DIALOG_ID = 'library-selector'

const DEFAULT_QUERY_DELAY = 150

export namespace LibrarySelector {
    export type Accept = 'workflow' | 'folder' | 'skill' | 'any'

    export type WorkflowItem = Extract<LibrarySDK.Item, { type: 'workflow' }>
    export type SkillItem = Extract<LibrarySDK.Item, { type: 'skill' }>
    export type FolderItem = { type: 'folder'; id: Library.Folder.Id }
    export type Item = LibrarySDK.Item | FolderItem

    export type ItemFor<A extends Accept> =
        A extends 'workflow' ? WorkflowItem :
        A extends 'folder' ? FolderItem :
        A extends 'skill' ? SkillItem :
        Item

    export interface Options<A extends Accept> {
        accept: A
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
    any: 'Select an Item',
}

export function openLibrarySelector<A extends LibrarySelector.Accept>(options: LibrarySelector.Options<A>) {
    const onSelect = options.onSelect as (item: LibrarySelector.Item) => void

    DialogSDK.actions.push(LIBRARY_SELECTOR_DIALOG_ID, (props) => (
        <LibrarySelectorDialog dialogProps={props} accept={options.accept} initialCwd={options.initialCwd} onSelect={onSelect} queryDelay={options.queryDelay ?? DEFAULT_QUERY_DELAY} />
    ))
}

interface Props {
    dialogProps: DialogSDK.TemplateProps
    accept: LibrarySelector.Accept
    initialCwd?: Library.Folder.Id
    onSelect: (item: LibrarySelector.Item) => void
    queryDelay: number
}

const LibrarySelectorDialog = ({ dialogProps, accept, initialCwd, onSelect, queryDelay }: Props) => {
    const [cwd, setCwd] = useState<Library.Folder.Id>(initialCwd ?? Library.Folder.ROOT_ID)

    const accepts = (type: LibrarySelector.Item['type']) => accept === type || accept === 'any'

    const cwdName = LibrarySDK.useStore((s) => s.folders[cwd]?.display_name ?? 'Library')

    const commit = (item: LibrarySelector.Item) => {
        onSelect(item)
        DialogSDK.actions.pop(LIBRARY_SELECTOR_DIALOG_ID)
    }

    const isItemDisabled = (item: LibrarySDK.Item) => !accepts(item.type)

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
                            <Dialog.Title className='text-sm h-auto my-auto'>{TITLES[accept]}</Dialog.Title>
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
                            <Button size='sm' onClick={handleSelectFolder}>
                                <SystemIcons.FolderOpen className='size-4' />
                                Select "{cwdName}"
                            </Button>
                        </div>
                    )}
                </div>
            </DialogSDK.SplitTemplate>
        </LibraryBrowser.Root>
    )
}
