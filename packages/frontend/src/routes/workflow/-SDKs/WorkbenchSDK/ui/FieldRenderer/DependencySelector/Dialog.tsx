import { memo, useState } from 'react'
import { Button, Dialog, Input } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field'
import { PublicationSelector } from './PublicationSelector'
import { DraftSelector } from './DraftSelector'

interface Props {
    nodeId: Workflow.Node.Id
    field: Field.DependencySelector
    dialogId: string
    selectedWorkflowId: Workflow.Id | ""
}

export const DependencySelectorDialogContent = memo<Props>(({ nodeId, field, dialogId, selectedWorkflowId }) => {
    const [searchQuery, setSearchQuery] = useState("")
    const [manualWorkflowId, setManualWorkflowId] = useState<Workflow.Id>("" as Workflow.Id)

    const dependencyMode = WorkbenchSDK.useStore(s => s.data.staticValues[nodeId]?.["dependencyMode" as Field.Id] as string | undefined)
    const isDraftMode = dependencyMode === "latest-draft"

    const handleSelect = async (workflowId: Workflow.Id) => {
        const action = isDraftMode
            ? WorkbenchSDK.actions.dependency.draft.attachToNode
            : WorkbenchSDK.actions.dependency.published.attachToNode
        const success = await action(nodeId, field.id, workflowId)
        if (success) DialogSDK.actions.pop(dialogId)
    }

    const handleManualSet = async () => {
        const action = isDraftMode
            ? WorkbenchSDK.actions.dependency.draft.attachToNode
            : WorkbenchSDK.actions.dependency.published.attachToNode
        const success = await action(nodeId, field.id, manualWorkflowId)
        if (success) DialogSDK.actions.pop(dialogId)
    }

    return (
        <div className="flex flex-col gap-3 p-4 w-[360px]">
            <Dialog.Title className="text-sm font-semibold">Select Workflow</Dialog.Title>
            <Dialog.Description className="sr-only">
                {isDraftMode ? "Search and select a draft workflow" : "Search and select an active published workflow"}
            </Dialog.Description>

            <Input
                size="sm"
                placeholder={isDraftMode ? "Search workflows" : "Search published workflows"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="max-h-64 overflow-y-auto rounded-md border border-border/60">
                {isDraftMode
                    ? <DraftSelector searchQuery={searchQuery} selectedWorkflowId={selectedWorkflowId} onSelect={handleSelect} />
                    : <PublicationSelector searchQuery={searchQuery} selectedWorkflowId={selectedWorkflowId} onSelect={handleSelect} />
                }
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
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!manualWorkflowId}
                        onClick={handleManualSet}
                    >
                        Set
                    </Button>
                </div>
            </div>
        </div>
    )
})
DependencySelectorDialogContent.displayName = "DependencySelectorDialogContent"
