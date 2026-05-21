import { memo, useState } from 'react'
import { Button, Dialog, Input, Select } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'
import { PublicationSelector } from './PublicationSelector'
import { DraftSelector } from './DraftSelector'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@/SDKs/DialogSDK'

interface Props {
    nodeId: Workflow.Node.Id
    dialogId: string
}

export const DependencySelectorDialogContent = memo<Props>(({ nodeId, dialogId }) => {
    const [searchQuery, setSearchQuery] = useState("")
    const [manualWorkflowId, setManualWorkflowId] = useState<Workflow.Id>("" as Workflow.Id)

    const dependency = WorkbenchSDK.useStore(s => s.data.nodes[nodeId]?.dependency)
    const mode = dependency?.mode ?? "draft"
    const selectedWorkflowId = dependency?.workflowId ?? "" as Workflow.Id

    const onModeChange = (value: string) => {
        setSearchQuery("")
        WorkbenchSDK.actions.dependency.setMode(nodeId, value as "publication" | "draft")
    }

    return (
        <div className="flex flex-col gap-3 p-3 w-[360px]">
            <div className='inline-flex items-center justify-between'>
                <Dialog.Title className="text-sm font-semibold inline-flex gap-2 items-center">
                    <SystemIcons.Graph className="size-4" />
                    Select Workflow
                </Dialog.Title>
                <Select.Root value={mode} onValueChange={onModeChange}>
                    <Select.Trigger size="xs" className='w-2/6 rounded-lg'>
                        <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="draft" size="xs">
                            <span className="flex items-center gap-1.5">
                                <SystemIcons.DraftingCompass className='size-3 text-muted-foreground' />
                                Draft
                            </span>
                        </Select.Item>
                        <Select.Item value="publication" size="xs">
                            <span className="flex items-center gap-1.5">
                                <SystemIcons.ShieldCheck className='size-3 text-muted-foreground' />
                                Published
                            </span>
                        </Select.Item>
                    </Select.Content>
                </Select.Root>
            </div>
            <Dialog.Description className="text-xs text-muted-foreground w-full">
                Select a workflow to attach as a sub workflow dependency
            </Dialog.Description>

            <div className='flex flex-row gap-2 items-center relative'>
                <Input
                    className="rounded-lg!"
                    size="sm"
                    placeholder={mode === "draft" ? "Search workflows" : "Search published workflows"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <SystemIcons.Search className='text-muted-foreground size-4 absolute right-2' />
            </div>


            {mode === "draft"
                ? <DraftSelector nodeId={nodeId} dialogId={dialogId} searchQuery={searchQuery} selectedWorkflowId={selectedWorkflowId} />
                : <PublicationSelector nodeId={nodeId} dialogId={dialogId} searchQuery={searchQuery} selectedWorkflowId={selectedWorkflowId} />
            }

            <div className="flex flex-col gap-1 border-t border-border pt-2">
                <span className="text-[10px] font-medium text-muted-foreground">or paste a workflow ID</span>
                <div className="flex gap-1">
                    <Input
                        size="sm"
                        placeholder="Paste workflow id"
                        className='rounded-lg!'
                        value={manualWorkflowId}
                        onChange={(e) => setManualWorkflowId(e.target.value as Workflow.Id)}
                    />
                    <Button type="button" size="sm" variant="outline" className='rounded-lg' disabled={!manualWorkflowId} onClick={() => {
                        WorkbenchSDK.actions.dependency.attachToNode(nodeId, manualWorkflowId, mode)
                        DialogSDK.actions.pop(dialogId)
                    }}>
                        Set
                        <SystemIcons.ArrowRight/>
                    </Button>
                </div>
            </div>
        </div>
    )
})
DependencySelectorDialogContent.displayName = "DependencySelectorDialogContent"
