import type { Library, Workflow } from "@pretzel-graph/shared/domain";
import React from "react";
import { EmptyFolder } from "./empty-folder";
import { FolderCard } from "./folder-card";
import { WorkflowCard } from "./workflow-card";
import type { FolderViewSize } from "./size";
import classNames from "classnames";

interface Props {
    childFolders: Library.Folder[],
    workflows: Library.WorkflowMeta[]
    className?: string
    size?: FolderViewSize
    onFolderClick?: (folderId: Library.Folder.Id) => void
    onWorkflowClick?: (workflowId: Workflow.Id) => void
}

const sizeStyles = {
    default: {
        heading: '',
        grid: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2 mb-3',
    },
    sm: {
        heading: 'text-xs',
        grid: 'grid-cols-3 gap-1 mt-1 mb-2',
    },
} as const

const FolderView: React.FC<Props> = ({ childFolders, workflows, className, size = 'default', onFolderClick, onWorkflowClick }) => {

    const styles = sizeStyles[size]

    const isEmpty = childFolders.length === 0 && workflows.length === 0;

    return (
        <div className={className}>
            {isEmpty ? (
                <EmptyFolder />
            ) : (
                <>
                    {childFolders.length > 0 && (
                        <>
                            <h4 className={styles.heading}>
                                {childFolders.length} Folder
                                {childFolders.length === 1 ? "" : "s"}
                            </h4>
                            <div className={classNames('grid', styles.grid)}>
                                {childFolders.map((f) => (
                                    <FolderCard key={f.id} folder={f} size={size} onClick={() => onFolderClick?.(f.id)} />
                                ))}
                            </div>
                        </>
                    )}
                    {workflows.length > 0 && (
                        <>
                            <h4 className={styles.heading}>
                                {workflows.length} Workflow
                                {workflows.length === 1 ? "" : "s"}
                            </h4>
                            <div className={classNames('grid', styles.grid)}>
                                {workflows.map((w) => (
                                    <WorkflowCard key={w.id} workflow={w} size={size} onClick={() => onWorkflowClick?.(w.id)} />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default FolderView;