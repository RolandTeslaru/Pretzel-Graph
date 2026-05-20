import { memo, useState } from 'react'
import { Dialog, Input } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'
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

    const dependencyMode = WorkbenchSDK.useStore(s => s.data.staticValues[nodeId]?.["dependencyMode" as Field.Id] as string | undefined)
    const isDraftMode = dependencyMode === "latest-draft"

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

            {isDraftMode
                ? <DraftSelector nodeId={nodeId} fieldId={field.id} dialogId={dialogId} searchQuery={searchQuery} selectedWorkflowId={selectedWorkflowId} />
                : <PublicationSelector nodeId={nodeId} fieldId={field.id} dialogId={dialogId} searchQuery={searchQuery} selectedWorkflowId={selectedWorkflowId} />
            }
        </div>
    )
})
DependencySelectorDialogContent.displayName = "DependencySelectorDialogContent"
