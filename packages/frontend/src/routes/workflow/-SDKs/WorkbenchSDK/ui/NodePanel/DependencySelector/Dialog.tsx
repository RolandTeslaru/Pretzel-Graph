import { memo, useState } from 'react'
import { Dialog, Input, Select } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'
import { PublicationSelector } from './PublicationSelector'
import { DraftSelector } from './DraftSelector'

interface Props {
    nodeId: Workflow.Node.Id
    dialogId: string
}

export const DependencySelectorDialogContent = memo<Props>(({ nodeId, dialogId }) => {
    const [searchQuery, setSearchQuery] = useState("")

    const dependency = WorkbenchSDK.useStore(s => s.data.nodes[nodeId]?.dependency)
    const mode = dependency?.mode ?? "draft"
    const selectedWorkflowId = dependency?.workflowId ?? "" as Workflow.Id

    const onModeChange = (value: string) => {
        setSearchQuery("")
        WorkbenchSDK.actions.dependency.setMode(nodeId, value as "publication" | "draft")
    }

    return (
        <div className="flex flex-col gap-3 p-4 w-[360px]">
            <Dialog.Title className="text-sm font-semibold">Select Workflow</Dialog.Title>
            <Dialog.Description className="sr-only">
                Select a workflow to attach as a sub-workflow dependency
            </Dialog.Description>

            <div className='flex flex-row gap-2 items-center'>
                <Input
                    className='min-w-2/3'
                    size="sm"
                    placeholder={mode === "draft" ? "Search workflows" : "Search published workflows"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select.Root value={mode} onValueChange={onModeChange}>
                    <Select.Trigger size="sm">
                        <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="draft">Draft</Select.Item>
                        <Select.Item value="publication">Published</Select.Item>
                    </Select.Content>
                </Select.Root>
            </div>


            {mode === "draft"
                ? <DraftSelector nodeId={nodeId} dialogId={dialogId} searchQuery={searchQuery} selectedWorkflowId={selectedWorkflowId} />
                : <PublicationSelector nodeId={nodeId} dialogId={dialogId} searchQuery={searchQuery} selectedWorkflowId={selectedWorkflowId} />
            }
        </div>
    )
})
DependencySelectorDialogContent.displayName = "DependencySelectorDialogContent"
