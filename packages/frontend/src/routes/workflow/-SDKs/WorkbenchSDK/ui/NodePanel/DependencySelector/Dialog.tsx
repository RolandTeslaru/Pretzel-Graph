import { memo, useState } from 'react'
import { Dialog, Input } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'
import { PublicationSelector } from './PublicationSelector'
import { DraftSelector } from './DraftSelector'

interface Props {
    node: Workflow.Node
    dialogId: string
    selectedWorkflowId: Workflow.Id | ""
}

export const DependencySelectorDialogContent = memo<Props>(({ node, dialogId, selectedWorkflowId }) => {
    const [searchQuery, setSearchQuery] = useState("")

    const isDraft = node.dependency?.mode === "draft"
    const isDraftMode = isDraft || !node.dependency

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
                ? <DraftSelector nodeId={node.id} dialogId={dialogId} searchQuery={searchQuery} selectedWorkflowId={selectedWorkflowId} />
                : <PublicationSelector nodeId={node.id} dialogId={dialogId} searchQuery={searchQuery} selectedWorkflowId={selectedWorkflowId} />
            }
        </div>
    )
})
DependencySelectorDialogContent.displayName = "DependencySelectorDialogContent"

