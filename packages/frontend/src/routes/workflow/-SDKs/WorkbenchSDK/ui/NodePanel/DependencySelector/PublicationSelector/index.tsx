import { memo, useMemo, useState } from 'react'
import { Button, Input, Spinner } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK/sdk'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { WorkbenchSDK } from '../../../../sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { PublicationSelectorItem } from './Item'

const STALE_TIME = 60_000

interface Props {
    nodeId: Workflow.Node.Id
    dialogId: string
    searchQuery: string
    selectedWorkflowId: Workflow.Id | ""
}

export const PublicationSelector = memo<Props>(({ nodeId, dialogId, searchQuery, selectedWorkflowId }) => {
    const [manualWorkflowId, setManualWorkflowId] = useState<Workflow.Id>("" as Workflow.Id)

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
            .map(publication => ({ publication, workflow: workflowMetas[publication.workflow_id] }))
            .filter(({ publication, workflow }) => {
                if (!normalized) return true
                const name = workflow?.display_name ?? publication.name
                return (
                    name.toLowerCase().includes(normalized) ||
                    publication.name.toLowerCase().includes(normalized) ||
                    publication.id.toLowerCase().includes(normalized) ||
                    publication.workflow_id.toLowerCase().includes(normalized)
                )
            })
            .sort((a, b) => {
                const nameA = a.workflow?.display_name ?? a.publication.name
                const nameB = b.workflow?.display_name ?? b.publication.name
                return nameA.localeCompare(nameB)
            })
    }, [activeWorkflows, searchQuery, workflowMetas])

    const attach = async (workflowId: Workflow.Id) => {
        const success = await WorkbenchSDK.actions.dependency.attachToNode(nodeId, workflowId, "publication")
        if (success) DialogSDK.actions.pop(dialogId)
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
                    options.map(({ publication, workflow }) => (
                        <PublicationSelectorItem
                            key={publication.id}
                            publication={publication}
                            workflow={workflow}
                            isSelected={publication.workflow_id === selectedWorkflowId}
                            onSelect={attach}
                        />
                    ))
                )}
            </div>

            <div className="flex flex-col gap-1 border-t border-border pt-2">
                <span className="text-[10px] font-medium text-muted-foreground">or use a public workflow ID</span>
                <div className="flex gap-1">
                    <Input
                        size="sm"
                        placeholder="Paste workflow id"
                        value={manualWorkflowId}
                        onChange={(e) => setManualWorkflowId(e.target.value as Workflow.Id)}
                    />
                    <Button type="button" size="sm" variant="outline" disabled={!manualWorkflowId} onClick={() => attach(manualWorkflowId)}>
                        Set
                    </Button>
                </div>
            </div>
        </>
    )
})
PublicationSelector.displayName = "PublicationSelector"
