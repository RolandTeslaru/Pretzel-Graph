import { useState } from 'react'
import { Button, Dialog, SearchInput } from '@pretzel-graph/standard-ui/foundations'
import { Library, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { LibraryTree } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/LibraryTree'
import { FolderView } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/FolderView'
import { LibraryCwdBreadcrumbs } from '@/SDKs/LibrarySDK/ui/LibraryCwdBreadcrumbs'

export const RESOURCE_SELECTOR_DIALOG_ID = 'resource-selector'

export namespace ResourceSelector {
    export type Accept = 'workflow' | 'folder' | 'any'

    export type WorkflowResource = { type: 'workflow'; id: Workflow.Id }
    export type FolderResource = { type: 'folder'; id: Library.Folder.Id }
    export type Resource = WorkflowResource | FolderResource

    export type ResourceFor<A extends Accept> =
        A extends 'workflow' ? WorkflowResource :
        A extends 'folder' ? FolderResource :
        Resource

    export interface Options<A extends Accept> {
        accept: A
        onSelect: (resource: ResourceFor<A>) => void
    }
}

const TITLES: Record<ResourceSelector.Accept, string> = {
    workflow: 'Select a Workflow',
    folder: 'Select a Folder',
    any: 'Select a Resource',
}

export function openResourceSelector<A extends ResourceSelector.Accept>(options: ResourceSelector.Options<A>) {
    const onSelect = options.onSelect as (resource: ResourceSelector.Resource) => void

    DialogSDK.actions.push(RESOURCE_SELECTOR_DIALOG_ID, (props) => (
        <ResourceSelectorDialog dialogProps={props} accept={options.accept} onSelect={onSelect} />
    ))
}

interface Props {
    dialogProps: DialogSDK.TemplateProps
    accept: ResourceSelector.Accept
    onSelect: (resource: ResourceSelector.Resource) => void
}

const ResourceSelectorDialog = ({ dialogProps, accept, onSelect }: Props) => {
    const [cwd, setCwd] = useState<Library.Folder.Id>(Library.Folder.ROOT_ID)

    const [treeSearchQuery, setTreeSearchQuery] = useState('')
    const [viewSearchQuery, setViewSearchQuery] = useState('')

    const acceptsWorkflows = accept !== 'folder'
    const acceptsFolders = accept !== 'workflow'

    const cwdName = LibrarySDK.useStore((s) => s.folders[cwd]?.display_name ?? 'Library')

    QuerySDK.useQuery(
        ['version-control', 'active-workflows'],
        () => VersionControlSDK.actions.listActiveWorkflows(),
        { staleTime: 60_000 },
    )

    const commit = (resource: ResourceSelector.Resource) => {
        onSelect(resource)
        DialogSDK.actions.pop(RESOURCE_SELECTOR_DIALOG_ID)
    }

    const handleWorkflowClick = acceptsWorkflows
        ? (id: Workflow.Id) => commit({ type: 'workflow', id })
        : undefined

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
                            onWorkflowClick={handleWorkflowClick}
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
                        onWorkflowClick={handleWorkflowClick}
                        className='pt-[40px] px-2'
                        scrollContainerClassName='h-[600px] [mask-image:linear-gradient(to_bottom,transparent_8px,black_50px)]'
                    />
                </div>
                {acceptsFolders && (
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
