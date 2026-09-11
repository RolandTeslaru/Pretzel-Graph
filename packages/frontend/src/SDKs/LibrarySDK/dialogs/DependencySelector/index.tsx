import { memo, useState } from 'react'
import { Dialog, SearchInput, Tabs } from '@pretzel-graph/standard-ui/foundations'
import { Library } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { LibraryTree } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/LibraryTree'
import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { FolderView } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/FolderView'
import { LibraryCwdBreadcrumbs } from '@/SDKs/LibrarySDK/ui/LibraryCwdBreadcrumbs'
import { DEPENDENCY_SELECTOR_DIALOG_ID, type DependencySelectorCallbacks } from './constants'
import { ListingSelector } from './listing-selector'
import { openDependencyTypeDialog } from './dependency-type-dialog'

interface Props {
    callbacks: DependencySelectorCallbacks
}

export const openDependencySelectorDialog = (callbacks: DependencySelectorCallbacks) => {
    DialogSDK.actions.push(DEPENDENCY_SELECTOR_DIALOG_ID, (props) => (
        <Tabs.Root defaultValue={"local"}>
            <DialogSDK.SplitTemplate {...props}
                sidebarRenderer={() => (
                    <>
                        <div className="flex flex-row items-center gap-2">
                            <SystemIcons.Graph className="size-5 shrink-0" />
                            <p className="text-md font-semibold text-foreground">Dependency Selector</p>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Embeds a snapshot of a workflow in this node
                        </p>

                        <Tabs.List size="xs" variant="accent" className='w-full mt-auto'>
                            <Tabs.Trigger value='local' className='w-1/2'>
                                Local Library
                            </Tabs.Trigger>
                            <Tabs.Trigger value='publicListing' className='w-1/2'>
                                Public Listings
                            </Tabs.Trigger>
                        </Tabs.List>
                    </>
                )}
                sidebarClassName='w-[260px] shrink-0'
                contentClassName=' pr-0! pl-1! py-0! gap-0!'
            >
                <WorkflowSelector callbacks={callbacks}/>
            </DialogSDK.SplitTemplate>
        </Tabs.Root>
    ))
}

const WorkflowSelector = memo<Props>(({ callbacks }) => {
    const [cwd, setCwd] = useState<Library.Folder.Id>(Library.Folder.ROOT_ID)

    const query = QuerySDK.useQuery(
        ['version-control', 'active-workflows'],
        () => VersionControlSDK.actions.listActiveWorkflows(),
        { staleTime: 60_000 },
    )

    const [treeSearchQuery, setTreeSearchQuery] = useState("");
    const [viewSearchQuery, setViewSearchQuery] = useState("")


    return (
        <>
            <div className='absolute top-0 pl-2 z-20 w-full flex flex-row gap-2 h-10 '>
                <Dialog.Title className='text-sm my-auto'>Select a Workflow</Dialog.Title>
            </div>
            <div className='flex flex-row h-[500px]  w-[700px] shrink-0 '>
                <Tabs.Content value="local" className='flex mt-0! gap-2 flex-row w-full '>
                    {/* Tree View */}
                    <div className='relative w-[220px] shrink-0'>
                        <div className='absolute z-10 top-10 w-full'>
                            <SearchInput size='xs'
                                className='rounded-full!'
                                wrapperClassName='flex-1 mx-1'
                                onSearch={(value) => setTreeSearchQuery(value)}
                            />
                        </div>
                        <LibraryTree
                            size="sm"
                            cwd={cwd}
                            setCwd={setCwd}
                            searchQuery={treeSearchQuery}
                            onWorkflowClick={(workflowId) => openDependencyTypeDialog(workflowId, callbacks.onLocalWorkflowSelected)}
                            className='pt-[70px]'
                            scrollContainerClassName='h-full [mask-image:linear-gradient(to_bottom,transparent_8px,black_50px)]'
                        />
                    </div>
                    <div className='relative flex-1 '>
                        <div className='absolute z-10 flex flex-row pr-4 justify-between top-2 w-full'>
                            <LibraryCwdBreadcrumbs className='h-auto my-auto' linkClassName='text-xs!' cwd={cwd} setCwd={setCwd}/>
                            <SearchInput className='rounded-full!' size="xs" onSearch={value => setViewSearchQuery(value)}/>
                        </div>
                        <FolderView
                            size="sm"
                            cwd={cwd}
                            setCwd={setCwd}
                            searchQuery={viewSearchQuery}
                            onWorkflowClick={(workflowId) => openDependencyTypeDialog(workflowId, callbacks.onLocalWorkflowSelected)}
                            className='pt-[50px] h-full '
                            scrollContainerClassName='h-full [mask-image:linear-gradient(to_bottom,transparent_8px,black_50px)]'
                        />
                    </div>
                </Tabs.Content>
                <Tabs.Content value="publicListing">
                    <ListingSelector
                        onListingSelected={callbacks.onListingSelected}
                        onListingPreview={callbacks.onListingPreview}
                    />
                </Tabs.Content>
            </div>
        </>
    )
})
