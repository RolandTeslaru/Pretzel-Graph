import { memo, useMemo, useState } from 'react'
import { Button, Input, Spinner } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK/sdk'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { WorkbenchSDK } from '../../../../sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { PublicationSelectorItem } from './Item'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

const STALE_TIME = 60_000

interface Props {
    nodeId: Workflow.Node.Id
    dialogId: string
    searchQuery: string
    nodeDependency: Workflow.Node.Dependency | undefined
}

export const PublicationSelector = memo<Props>(({ nodeId, dialogId, searchQuery, nodeDependency }) => {
    const activeWorkflows = VersionControlSDK.useStore(s => s.activeWorkflows)
    const workflowMetas   = LibrarySDK.useStore(s => s.workflowMetas)

    const query = QuerySDK.useQuery(
        ['version-control', 'active-workflows'],
        () => VersionControlSDK.actions.listActiveWorkflows(),
        { staleTime: STALE_TIME },
    )
    const isLoading = Object.keys(activeWorkflows).length === 0 && query.isFetching

    const options = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase()

        return Object.values(activeWorkflows)
            .map(publication => ({ publication, workflowMeta: workflowMetas[publication.workflow_id] }))
            .filter(({ publication, workflowMeta }) => {
                if (!normalized) return true
                const name = workflowMeta   ?.display_name ?? publication.name
                return (
                    name.toLowerCase().includes(normalized) ||
                    publication.name.toLowerCase().includes(normalized) ||
                    publication.id.toLowerCase().includes(normalized) ||
                    publication.workflow_id.toLowerCase().includes(normalized)
                )
            })
            .sort((a, b) => {
                const nameA = a.workflowMeta   ?.display_name ?? a.publication.name
                const nameB = b.workflowMeta   ?.display_name ?? b.publication.name
                return nameA.localeCompare(nameB)
            })
    }, [activeWorkflows, searchQuery, workflowMetas])

    const attach = async (workflowId: Workflow.Id) => {
        const success = await WorkbenchSDK.actions.dependency.attachToNode(nodeId, workflowId, "publication")
        if (success) 
            DialogSDK.actions.pop(dialogId)
    }

    return (
        <>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border/60">
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2 px-2 py-4 text-xs text-muted-foreground">
                        <Spinner className="size-3.5" />
                        Loading published workflows
                    </div>
                ) : options.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">No published workflows found</div>
                ) : (
                    options.map(({ publication, workflowMeta }) => (
                        <PublicationSelectorItem
                            key={publication.id}
                            publication={publication}
                            workflowMeta={workflowMeta}
                            isSelected={publication.workflow_id === nodeDependency?.workflowId && nodeDependency.mode === "publication"}
                            onSelect={attach}
                        />
                    ))
                )}
            </div>
        </>
    )
})
PublicationSelector.displayName = "PublicationSelector"
