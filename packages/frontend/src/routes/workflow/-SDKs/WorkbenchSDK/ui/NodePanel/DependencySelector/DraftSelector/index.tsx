import { memo, useMemo, useState } from 'react'
import { Button, Input } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { WorkbenchSDK } from '../../../../sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { DraftSelectorItem } from './Item'

interface Props {
    nodeId: Workflow.Node.Id
    dialogId: string
    searchQuery: string
    selectedWorkflowId: Workflow.Id | ""
}

export const DraftSelector = memo<Props>(({ nodeId, dialogId, searchQuery, selectedWorkflowId }) => {
    const [manualWorkflowId, setManualWorkflowId] = useState<Workflow.Id>("" as Workflow.Id)

    const workflowMetas = LibrarySDK.useStore(s => s.workflowMetas)

    const options = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase()

        return Object.values(workflowMetas)
            .filter(w => !normalized || w.display_name.toLowerCase().includes(normalized) || w.id.toLowerCase().includes(normalized))
            .sort((a, b) => a.display_name.localeCompare(b.display_name))
    }, [workflowMetas, searchQuery])

    const attach = async (workflowId: Workflow.Id) => {
        const success = await WorkbenchSDK.actions.dependency.attachToNode(nodeId, workflowId, "draft")
        if (success) DialogSDK.actions.pop(dialogId)
    }

    return (
        <>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border/60">
                {options.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">No workflows found</div>
                ) : (
                    options.map(workflow => (
                        <DraftSelectorItem
                            key={workflow.id}
                            workflow={workflow}
                            isSelected={workflow.id === selectedWorkflowId}
                            onSelect={attach}
                        />
                    ))
                )}
            </div>

            <div className="flex flex-col gap-1 border-t border-border pt-2">
                <span className="text-[10px] font-medium text-muted-foreground">or paste a workflow ID</span>
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
DraftSelector.displayName = "DraftSelector"
