import { memo, useMemo, useState } from 'react'
import { Button, Input, ScrollArea } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { WorkbenchSDK } from '../../../../sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { DraftSelectorItem } from './Item'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

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
            <ScrollArea.Root className="h-64 rounded-md border border-border/60">
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
            </ScrollArea.Root>
        </>
    )
})
DraftSelector.displayName = "DraftSelector"
