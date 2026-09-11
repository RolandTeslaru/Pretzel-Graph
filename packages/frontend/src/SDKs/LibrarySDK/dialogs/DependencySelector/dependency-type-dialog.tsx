import { useState } from 'react'
import { Badge, Button, Dialog, Spinner, Tabs } from '@pretzel-graph/standard-ui/foundations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { DEPENDENCY_SELECTOR_DIALOG_ID, type DependencySelectorCallbacks } from './constants'

export const getDependencyTypeDialogId = (workflowId: Workflow.Id) => `dependency-type-${workflowId}`

export const openDependencyTypeDialog = (workflowId: Workflow.Id, onSelected: DependencySelectorCallbacks['onLocalWorkflowSelected']) => {

    const dialogId = getDependencyTypeDialogId(workflowId)

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.Template {...props} className='p-2'>
            <DependencyTypeDialog
                workflowId={workflowId}
                onSelected={onSelected}
            />
        </DialogSDK.Template>
    ))
}

const variantDescriptions: Record<Workflow.Dependency.Variant, string> = {
    draft: "Follows the workflow's current working version. You'll be offered an update whenever it's saved with changes.",
    publication: "Pins to the workflow's active published version. You'll be offered an update only when a new version is published.",
}

interface DependencyTypeDialogProps {
    workflowId: Workflow.Id
    onSelected: DependencySelectorCallbacks['onLocalWorkflowSelected']
}

const DependencyTypeDialog = ({ workflowId, onSelected }: DependencyTypeDialogProps) => {

    const dialogId = getDependencyTypeDialogId(workflowId)

    const [variant, setVariant] = useState<Workflow.Dependency.Variant>("draft")

    const [isAttaching, setIsAttaching] = useState(false)

    const query = QuerySDK.useQuery(
        ['version-control', 'active-workflow', workflowId],
        () => VersionControlSDK.actions.getActiveByWorkflowId(workflowId),
        { staleTime: 60_000 },
    )

    const activePublication = VersionControlSDK.useStore(s => s.activeWorkflows[workflowId])

    const hasPublication = Boolean(activePublication)

    const handleAttach = async () => {
        setIsAttaching(true)

        const success = await onSelected(workflowId, variant)

        setIsAttaching(false)

        if (!success)
            return

        DialogSDK.actions.pop(dialogId)
        DialogSDK.actions.pop(DEPENDENCY_SELECTOR_DIALOG_ID)
    }

    return (
        <div className='p-2 w-[400px] h-[250px] flex flex-col gap-2'>
            <Dialog.Title>Attach workflow</Dialog.Title>
            <Dialog.Description></Dialog.Description>
            {query.isPending ? (
                <div className='flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground'>
                    <Spinner className='size-3.5' />
                    Checking publications
                </div>
            ) : (
                <>
                    <Tabs.Root value={variant} onValueChange={(val) => setVariant(val as Workflow.Dependency.Variant)}>
                        <Tabs.List size="lg" className='w-full'>
                            <Tabs.Trigger value='draft' className='w-1/2 flex flex-col gap-2'>
                                <SystemIcons.DraftingCompass className='size-10' />
                                Draft
                            </Tabs.Trigger>
                            <Tabs.Trigger value="publication" className='w-1/2 flex flex-col gap-2' disabled={!hasPublication}>
                                <SystemIcons.ShieldCheck className='size-10' />
                                <div className='flex flex-row gap-2'>
                                    Published
                                    {activePublication &&
                                        <Badge variant="success" className='h-auto my-auto'>
                                            {activePublication.name}
                                        </Badge>
                                    }
                                </div>
                            </Tabs.Trigger>
                        </Tabs.List>
                    </Tabs.Root>
                    <p className='px-1 text-xs text-muted-foreground'>
                        {variantDescriptions[variant]}
                    </p>
                    <Button className="mt-auto" onClick={handleAttach} disabled={isAttaching}>
                        Attach
                    </Button>
                </>
            )}
        </div>
    )
}
