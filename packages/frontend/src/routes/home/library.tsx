import { createFileRoute, Outlet, useNavigate, useParams } from '@tanstack/react-router'
import { LibraryTree } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/LibraryTree'
import { useOpenLibraryItem } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/use-open-item'
import { ScrollArea, SearchInput } from '@pretzel-graph/standard-ui/foundations'
import type { Library } from '@pretzel-graph/shared/domain'
import { useState } from 'react'

export const Route = createFileRoute('/home/library')({
    component: LibraryLayout,
})

function LibraryLayout() {
    const navigate = useNavigate()
    const openItem = useOpenLibraryItem()
    const { folderId } = useParams({ strict: false })
    const cwd = folderId as Library.Folder.Id

    const [treeSearchQuery, setTreeSearchQuery] = useState("");

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">

            {/* Search input cannot be underneath a mask because blur stops working >:( */}
            <div className='relative'>
                <div className="absolute z-10 top-[60px] w-full flex flex-row " >
                    <SearchInput 
                        className='rounded-full!'
                        size="sm"
                        wrapperClassName='flex-1 mx-1'
                        onSearch={(value) => setTreeSearchQuery(value.trim().toLowerCase())}
                    />
                </div>
                <LibraryTree
                    scrollContainerClassName="h-screen [mask-image:linear-gradient(to_bottom,transparent_8px,black_72px)]"
                    cwd={cwd}
                    className={"pt-[95px] pr-2"}
                    searchQuery={treeSearchQuery}
                    setCwd={(folderId) => navigate({ to: '/home/library/$folderId', params: { folderId } })}
                    onItemClick={openItem}
                />
            </div>


            <Outlet />
        </div>
    )
}
