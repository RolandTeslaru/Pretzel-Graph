import { useState } from 'react'
import { Dialog, Tabs } from '@pretzel-graph/standard-ui/foundations'
import { Library, type Dependency } from '@pretzel-graph/shared/domain'
import type { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { LibraryBrowser } from '@/SDKs/LibrarySDK/ui/LibraryBrowser'
import { DEPENDENCY_SELECTOR_DIALOG_ID, getAcceptedNoun, groupAcceptedKinds, type DependencySelectorOptions } from './constants'
import { ListingSelector } from './listing-selector'
import { openDependencyTypeDialog } from './dependency-type-dialog'

export const openDependencySelectorDialog = (options: DependencySelectorOptions) => {
    DialogSDK.actions.push(DEPENDENCY_SELECTOR_DIALOG_ID, (props) => (
        <DependencySelectorDialog dialogProps={props} options={options} />
    ))
}

interface Props {
    dialogProps: DialogSDK.TemplateProps
    options:     DependencySelectorOptions
}

const DependencySelectorDialog = ({ dialogProps, options }: Props) => {
    const accepted  = groupAcceptedKinds(options.acceptsKind)
    const showLocal = accepted.localKinds.length > 0 || accepted.skill

    const [cwd, setCwd] = useState<Library.Folder.Id>(options.initialCwd ?? Library.Folder.ROOT_ID)

    const attach = async (ref: Dependency.Ref) => {
        const success = await options.onSelect(ref)

        if (success)
            DialogSDK.actions.pop(DEPENDENCY_SELECTOR_DIALOG_ID)
    }

    const isItemDisabled = (item: LibrarySDK.Item) => {
        switch (item.type) {
            case 'workflow':
                return accepted.localKinds.length === 0

            case 'skill':
                return !accepted.skill
        }
    }

    // A workflow asks draft or published only when the field accepts both; a skill attaches directly.
    const selectLocal = async (item: LibrarySDK.Item) => {
        switch (item.type) {
            case 'workflow': {
                if (accepted.localKinds.length > 1)
                    return openDependencyTypeDialog(item.id, options.onSelect)

                return attach({ kind: accepted.localKinds[0], id: item.id })
            }

            case 'skill':
                return attach({ kind: 'skill', id: item.id })
        }
    }

    return (
        <Tabs.Root defaultValue={showLocal ? 'local' : 'publicListing'}>
            <LibraryBrowser.Root cwd={cwd} setCwd={setCwd} onItemClick={selectLocal} isItemDisabled={isItemDisabled}>
                <DialogSDK.SplitTemplate {...dialogProps}
                    sidebarRenderer={() => (
                        <>
                            <div className="flex flex-row items-center gap-2">
                                <SystemIcons.Graph className="size-5 shrink-0" />
                                <p className="text-md font-semibold text-foreground">Dependency Selector</p>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Embeds a snapshot of the selection in this node
                            </p>

                            {showLocal && accepted.listing && (
                                <Tabs.List size="xs" variant="accent" className='w-full mt-auto'>
                                    <Tabs.Trigger value='local' className='w-1/2'>
                                        Local Library
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value='publicListing' className='w-1/2'>
                                        Public Listings
                                    </Tabs.Trigger>
                                </Tabs.List>
                            )}
                        </>
                    )}
                    sidebarClassName='w-[260px] shrink-0'
                    contentClassName=' pr-0! pl-1! py-0! gap-0!'
                >
                    <div className='absolute top-0 pl-2 z-20 w-full flex flex-row gap-2 h-10 '>
                        <Dialog.Title className='text-sm my-auto'>Select a {getAcceptedNoun(accepted)}</Dialog.Title>
                    </div>

                    <div className='flex flex-row h-[500px]  w-[700px] shrink-0 '>
                        <Tabs.Content value="local" className='flex mt-0! gap-2 flex-row w-full '>
                            {/* Tree View */}
                            <div className='relative w-[220px] shrink-0'>
                                <LibraryBrowser.Tree.Header className='top-10'>
                                    <LibraryBrowser.Tree.SearchInput size='xs'
                                        className='rounded-full!'
                                        wrapperClassName='flex-1 mx-1'
                                    />
                                </LibraryBrowser.Tree.Header>
                                <LibraryBrowser.Tree
                                    size="sm"
                                    className='pt-[70px]'
                                    scrollContainerClassName='h-full [mask-image:linear-gradient(to_bottom,transparent_8px,black_50px)]'
                                />
                            </div>
                            <div className='relative flex-1'>
                                <LibraryBrowser.View.Header className='pr-4 top-2'>
                                    <LibraryBrowser.View.Breadcrumbs className='h-auto my-auto' linkClassName='text-xs!' />
                                    <LibraryBrowser.View.SearchInput className='rounded-full!' size="xs" />
                                </LibraryBrowser.View.Header>
                                <LibraryBrowser.View
                                    size="sm"
                                    className='pt-[50px] h-full '
                                    scrollContainerClassName='h-full [mask-image:linear-gradient(to_bottom,transparent_8px,black_50px)]'
                                />
                            </div>
                        </Tabs.Content>
                        <Tabs.Content value="publicListing">
                            <ListingSelector
                                onSelect={options.onSelect}
                                onListingPreview={options.onListingPreview}
                            />
                        </Tabs.Content>
                    </div>
                </DialogSDK.SplitTemplate>
            </LibraryBrowser.Root>
        </Tabs.Root>
    )
}
