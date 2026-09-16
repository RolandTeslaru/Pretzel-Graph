import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Library } from '@pretzel-graph/shared/domain'
import type { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'

type LibraryBrowserContextValue = {
    cwd: Library.Folder.Id
    setCwd: (folderId: Library.Folder.Id) => void
    onItemClick?: (item: LibrarySDK.Item) => void
    isItemDisabled?: (item: LibrarySDK.Item) => boolean
    queryDelay?: number
    searchQuery: string
    setSearchQuery: (value: string) => void
    treeSearchQuery: string
    setTreeSearchQuery: (value: string) => void
}

const LibraryBrowserContext = createContext<LibraryBrowserContextValue | null>(null)

export const useLibraryBrowser = () => {
    const context = useContext(LibraryBrowserContext)

    if (!context)
        throw new Error('Library browser parts must be rendered inside LibraryBrowser.Root')

    return context
}

interface Props {
    cwd: Library.Folder.Id
    setCwd: (folderId: Library.Folder.Id) => void
    onItemClick?: (item: LibrarySDK.Item) => void
    isItemDisabled?: (item: LibrarySDK.Item) => boolean
    queryDelay?: number
    children: ReactNode
}

export const Root = ({ cwd, setCwd, onItemClick, isItemDisabled, queryDelay, children }: Props) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [treeSearchQuery, setTreeSearchQuery] = useState('')

    return (
        <LibraryBrowserContext.Provider value={{ cwd, setCwd, onItemClick, isItemDisabled, queryDelay, searchQuery, setSearchQuery, treeSearchQuery, setTreeSearchQuery }}>
            {children}
        </LibraryBrowserContext.Provider>
    )
}
