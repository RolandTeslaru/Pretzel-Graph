import { useMemo, useState } from 'react'
import { Tree } from '@/components/Tree'
import { ScrollArea, SearchInput } from '@pretzel-graph/standard-ui/foundations'
import type { FileSystemNodeData } from '../../../actions'
import { LibrarySDK } from '../../../sdk'
import type { LibraryBrowserBaseProps } from '..'
import { sizeStyles } from './sizes'
import { filterTree } from './utils'
import { TreeItem } from './tree-item'

interface Props extends LibraryBrowserBaseProps {
    scrollContainerClassName?: string
    className?: string
    searchQuery?: string
}

export const LibraryTree: React.FC<Props> = ({ scrollContainerClassName, size = 'default', cwd, selectedWorkflowId, setCwd, onWorkflowClick, className, searchQuery }) => {
    const styles = sizeStyles[size]

    const treeData = LibrarySDK.useStore((s) => s.treeData)

    const query = searchQuery ? searchQuery.trim().toLowerCase() : ""

    const displayTree = useMemo(
        () => (query ? filterTree(treeData, query) : treeData),
        [treeData, query],
    )

    const selectedFolderKey = cwd ? `folder:${cwd}` : undefined
    const selectedWorkflowKey = selectedWorkflowId ? `workflow:${selectedWorkflowId}` : undefined

    const hasContents = treeData.childBranches && Object.keys(treeData.childBranches).length > 0
    const hasResults = displayTree.childBranches && Object.keys(displayTree.childBranches).length > 0

    return (
        <ScrollArea.Root className={"relative " + scrollContainerClassName}>
            {!hasContents ? (
                <div className='text-sm opacity-60 px-2 py-1'>Nothing here yet.</div>
            ) : !hasResults ? (
                <div className='text-sm opacity-60 px-2 py-1'>No matches.</div>
            ) : (
                <Tree<FileSystemNodeData>
                    key={query || 'all'}
                    root={displayTree}
                    className={className}
                    renderBranch={(props) => (
                        <TreeItem
                            {...props}
                            isSelected={props.branch.key === selectedFolderKey || props.branch.key === selectedWorkflowKey}
                            styles={styles}
                            size={size}
                            onFolderClick={(id) => setCwd(id)}
                            onWorkflowClick={onWorkflowClick}
                        />
                    )}
                />
            )}
        </ScrollArea.Root>
    )
}
