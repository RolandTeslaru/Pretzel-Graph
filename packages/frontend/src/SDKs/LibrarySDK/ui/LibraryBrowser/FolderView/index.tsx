import type { Library, Workflow } from "@pretzel-graph/shared/domain";
import React, { useMemo, useState } from "react";
import { EmptyFolder } from "./empty-folder";
import classNames from "classnames";
import type { LibraryBrowserBaseProps } from "..";
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";
import { ScrollArea } from "@pretzel-graph/standard-ui/foundations";
import { FolderItem } from "./items/folder";
import { WorkflowItem } from "./items/workflow";
import { SystemIcons } from "@pretzel-graph/standard-ui/icons";

interface Props extends LibraryBrowserBaseProps {
    scrollContainerClassName?: string
    className?: string
    headerRenderer?: () => React.ReactNode
    searchQuery?: string
}

const sizeStyles = {
    default: {
        heading: '',
        grid: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 ',
        breadCrumbs: ""
    },
    sm: {
        heading: 'text-xs',
        grid: 'grid-cols-3 gap-1',
        breadCrumbs: "text-xs!"
    },
} as const

export const FolderView: React.FC<Props> = ({ scrollContainerClassName, className, setCwd, cwd, size = 'default', onWorkflowClick, headerRenderer, searchQuery }) => {

    const [view, breadCrumbs] = LibrarySDK.useStore(s => [
        s.selectors.getLibraryView(s, cwd), 
        s.selectors.getBreadcrumbs(s, cwd)
    ])
    
    const query = searchQuery ? searchQuery.trim().toLowerCase() : ""

    const filteredFolders = useMemo(() => view.folders.filter(f => matchesQuery(f, query)), [view.folders, query])
    const filteredWorkflows = useMemo(() => view.worfklows.filter(w => matchesQuery(w, query)), [view.worfklows, query])

    const styles = sizeStyles[size]

    const isEmpty = filteredFolders.length === 0 && filteredWorkflows.length === 0;
    const hasNoMatches = !isEmpty && filteredFolders.length === 0 && filteredWorkflows.length === 0

    return (
        <ScrollArea.Root className={"relative flex-1 mt-0! gap-2 flex flex-col " + scrollContainerClassName }>
            {isEmpty ? (
                <EmptyFolder />
            ) : (
                <div className={className}>
                    {filteredFolders.length > 0 && 
                        <h4 className={styles.heading}>
                            {filteredFolders.length} Folder
                            {filteredFolders.length === 1 ? "" : "s"}
                        </h4>
                    }
                    <div className={classNames('grid', styles.grid)}>
                        {filteredFolders.map((f) => (
                            <FolderItem key={f.id} folder={f} size={size} onClick={() => setCwd(f.id)} />
                        ))}
                    </div>
                    {filteredWorkflows.length > 0 && 
                        <h4 className={styles.heading}>
                            {filteredWorkflows.length} Workflow
                            {filteredWorkflows.length === 1 ? "" : "s"}
                        </h4>
                    }
                    <div className={classNames('grid', styles.grid)}>
                        {filteredWorkflows.map((w) => (
                            <WorkflowItem key={w.id} workflow={w} size={size} onClick={() => onWorkflowClick?.(w.id)} />
                        ))}
                    </div>
                </div>
            )}
        </ScrollArea.Root>
    );
};


function matchesQuery(item: { id: string, display_name: string }, query: string) {
    if (!query) return true

    return item.display_name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query)
}

function NoMatches({ query }: { query: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <SystemIcons.Search size={32} className="mb-3" />
            <p className="text-sm">No results for "{query}".</p>
        </div>
    )
}
