import { useState } from 'react'
import { Button, Dialog, SearchInput } from '@pretzel-graph/standard-ui/foundations'
import { Library } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { LibraryTree } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/LibraryTree'
import { FolderView } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/FolderView'
import { LibraryCwdBreadcrumbs } from '@/SDKs/LibrarySDK/ui/LibraryCwdBreadcrumbs'

export const LIBRARY_SELECTOR_DIALOG_ID = 'library-selector'

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
        <LibrarySelectorDialog dialogProps={props} accept={options.accept} initialCwd={options.initialCwd} onSelect={onSelect} />
    ))
}

interface Props {
    dialogProps: DialogSDK.TemplateProps
    accept: LibrarySelector.Accept
    initialCwd?: Library.Folder.Id
    onSelect: (item: LibrarySelector.Item) => void
}

const LibrarySelectorDialog = ({ dialogProps, accept, initialCwd, onSelect }: Props) => {
    const [cwd, setCwd] = useState<Library.Folder.Id>(initialCwd ?? Library.Folder.ROOT_ID)

    const [treeSearchQuery, setTreeSearchQuery] = useState('')
    const [viewSearchQuery, setViewSearchQuery] = useState('')

    const accepts = (type: LibrarySelector.Item['type']) => accept === type || accept === 'any'

    const cwdName = LibrarySDK.useStore((s) => s.folders[cwd]?.display_name ?? 'Library')

    QuerySDK.useQuery(
        ['version-control', 'active-workflows'],
        () => VersionControlSDK.actions.listActiveWorkflows(),
        { staleTime: 60_000 },
    )

    const commit = (item: LibrarySelector.Item) => {
        onSelect(item)
        DialogSDK.actions.pop(LIBRARY_SELECTOR_DIALOG_ID)
    }

    const isItemDisabled = (item: LibrarySDK.Item) => !accepts(item.type)

    const handleSelectFolder = () => commit({ type: 'folder', id: cwd })

    return (
        <DialogSDK.SplitTemplate {...dialogProps}
            sidebarRenderer={() => (
                <div className='relative'>
                    <div className='absolute flex flex-col gap-2 top-0 left-0 px-2 py-2 z-20 w-full'>
                        <Dialog.Title className='text-sm px-2'>{TITLES[accept]}</Dialog.Title>
                        <SearchInput size='xs'
                            className='rounded-full!'
                            onSearch={(value) => setTreeSearchQuery(value)}
                        />
                    </div>

                    <div className='flex-1 min-h-0'>
                        <LibraryTree
                            size='sm'
                            cwd={cwd}
                            setCwd={setCwd}
                            searchQuery={treeSearchQuery}
                            onItemClick={commit}
                            isItemDisabled={isItemDisabled}
                            className='pt-[70px] px-2'
                            scrollContainerClassName='h-[600px] [mask-image:linear-gradient(to_bottom,transparent_8px,black_80px)]'
                        />
                    </div>
                </div>
            )}
            sidebarClassName='w-[260px] shrink-0 p-0!'
            contentClassName='p-0!'
        >
            <div className='flex h-full w-[480px] shrink-0 flex-col gap-2 relative'>
                <div className='absolute z-20 px-2 w-full top-2 flex flex-row justify-between'>
                    <LibraryCwdBreadcrumbs className='h-auto my-auto' linkClassName='text-xs!' cwd={cwd} setCwd={setCwd} />
                    <SearchInput className='rounded-full!' size='xs' onSearch={(value) => setViewSearchQuery(value)} />
                </div>
                <div className='flex-1 min-h-0'>
                    <FolderView
                        size='sm'
                        cwd={cwd}
                        setCwd={setCwd}
                        searchQuery={viewSearchQuery}
                        onItemClick={commit}
                        isItemDisabled={isItemDisabled}
                        className='pt-[40px] px-2'
                        scrollContainerClassName='h-[600px] [mask-image:linear-gradient(to_bottom,transparent_8px,black_50px)]'
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
    )
}
