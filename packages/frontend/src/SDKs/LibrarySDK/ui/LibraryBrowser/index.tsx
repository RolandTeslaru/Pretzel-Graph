import { ScrollArea } from "@pretzel-graph/standard-ui/foundations"
import { LibraryTree } from "./LibraryTree"
import { FolderView } from "./FolderView"
import type { Library, Workflow } from "@pretzel-graph/shared/domain"
import type { LibrarySDK } from "@/SDKs/LibrarySDK/sdk"
import type React from "react"

export interface LibraryBrowserBaseProps {
    size?: 'default' | 'sm'
    cwd: Library.Folder.Id,
    setCwd: (value: Library.Folder.Id) => void
    selectedWorkflowId?: Workflow.Id
    onItemClick?: (item: LibrarySDK.Item) => void
    isItemDisabled?: (item: LibrarySDK.Item) => boolean
}

interface Props extends LibraryBrowserBaseProps {
    className?: string
    folderViewProps?: {
        className?: string
        headerClassName?: string
    }
    treeProps?: {
        className?: string
        headerClassName?: string
    }
}

export const LibraryBrowser: React.FC<Props> = ({ folderViewProps, className, treeProps, cwd, setCwd, selectedWorkflowId, onItemClick, isItemDisabled, size }) => {
    return (
        <div className={"flex flex-row w-full gap-2 " + className}>
            <LibraryTree
                size={size}
                cwd={cwd}
                selectedWorkflowId={selectedWorkflowId}
                setCwd={setCwd}
                onItemClick={onItemClick}
                isItemDisabled={isItemDisabled}
                {...treeProps}
            />
            <FolderView
                cwd={cwd}
                setCwd={setCwd}
                size={size}
                onItemClick={onItemClick}
                isItemDisabled={isItemDisabled}
                {...folderViewProps}
            />
        </div>
    )
}