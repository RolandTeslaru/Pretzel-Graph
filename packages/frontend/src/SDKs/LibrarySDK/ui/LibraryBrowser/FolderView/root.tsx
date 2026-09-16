import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Library } from '@pretzel-graph/shared/domain'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'

type FolderViewContextValue = {
    cwd: Library.Folder.Id
    setCwd: (folderId: Library.Folder.Id) => void
    searchQuery: string
    setSearchQuery: (value: string) => void
}

const FolderViewContext = createContext<FolderViewContextValue | null>(null)

export const useFolderView = () => {
    const context = useContext(FolderViewContext)

    if (!context)
        throw new Error('FolderView parts must be rendered inside FolderView.Root')

    return context
}

interface Props {
    cwd: Library.Folder.Id
    setCwd: (folderId: Library.Folder.Id) => void
    className?: string
    children: ReactNode
}

export const Root = ({ cwd, setCwd, className, children }: Props) => {
    const [searchQuery, setSearchQuery] = useState('')

    return (
        <FolderViewContext.Provider value={{ cwd, setCwd, searchQuery, setSearchQuery }}>
            <div className={cn('relative', className)}>
                {children}
            </div>
        </FolderViewContext.Provider>
    )
}
