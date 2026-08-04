import { memo, useState } from 'react'
import { Badge, Button, Dialog, Input, ScrollArea, Select, Spinner, Tabs } from '@pretzel-graph/standard-ui/foundations'
import { Library, Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { FileSystemTree } from '@/SDKs/LibrarySDK/ui/FileSystemTree'
import FolderView from '@/SDKs/LibrarySDK/ui/FolderView'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'

interface Props {
    nodeId: Workflow.Node.Id
    dialogId: string
}

export const DependencySelectorDialogContent = memo<Props>(({ nodeId, dialogId }) => {
    const depRef = WorkbenchSDK.useStore(s => s.selectors.node.getDependencyRef(s, nodeId))

    const [cwd, setCwd] = useState<Library.Folder.Id>()

    const [childFolders, childWorkflows] = LibrarySDK.useStore(s => [
        Object.values(s.folders).filter((f) => f.parent_folder_id === cwd),
        Object.values(s.workflowMetas).filter((w) => w.folder_id === cwd)
    ])

    const query = QuerySDK.useQuery(
        ['version-control', 'active-workflows'],
        () => VersionControlSDK.actions.listActiveWorkflows(),
        { staleTime: 60_000 },
    )

    const handleWorkflowClick = (workflowId: Workflow.Id) => {
        const typeDialogId = `dependency-type-${nodeId}-${workflowId}`

        DialogSDK.actions.push(typeDialogId, (props) => (
            <DialogSDK.Template {...props} className='p-2'>
                <DependencyTypeDialog
                    nodeId={nodeId}
                    workflowId={workflowId}
                    dialogId={dialogId}
                    typeDialogId={typeDialogId}
                />
            </DialogSDK.Template>
        ))
    }


    return (
        <div className=' w-[600px] p-2! flex flex-col gap-2'>
            <Dialog.Title className='flex flex-row gap-2'>Select a Workflow</Dialog.Title>
            <Dialog.Description className=' text-xs text-muted-foreground'>
                Choose a workflow to attach to this node.
            </Dialog.Description>
            <div className='flex flex-row h-[400px]'>
                <ScrollArea.Root className='max-w-[200px] min-w-[200px] px-1'>
                    <FileSystemTree size="sm" cwd={cwd}
                        // selectedWorkflowId={selectedWorkflowId}
                        onFolderClick={(id) => setCwd(id)}
                        onWorkflowClick={handleWorkflowClick}
                    />
                </ScrollArea.Root>
                <ScrollArea.Root className='w-full pt-2'>
                    <FolderView
                        childFolders={childFolders}
                        workflows={childWorkflows}
                        className='px-1'
                        size='sm'
                        onFolderClick={(id) => setCwd(id)}
                        onWorkflowClick={handleWorkflowClick}
                    />
                </ScrollArea.Root>
            </div>
        </div>
    )
})
DependencySelectorDialogContent.displayName = "DependencySelectorDialogContent"


const variantDescriptions: Record<Workflow.Dependency.Variant, string> = {
    draft: "Follows the workflow's current working version. You'll be offered an update whenever it's saved with changes.",
    publication: "Pins to the workflow's active published version. You'll be offered an update only when a new version is published.",
}

interface DependencyTypeDialogProps {
    nodeId: Workflow.Node.Id
    workflowId: Workflow.Id
    dialogId: string
    typeDialogId: string
}

const DependencyTypeDialog = ({ nodeId, workflowId, dialogId, typeDialogId }: DependencyTypeDialogProps) => {

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

        const success = await WorkbenchSDK.actions.dependency.attachToNode(nodeId, workflowId, variant)

        setIsAttaching(false)

        if (!success)
            return

        DialogSDK.actions.pop(typeDialogId)
        DialogSDK.actions.pop(dialogId)
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
                                <SystemIcons.DraftingCompass className='size-10'/>
                                Draft
                            </Tabs.Trigger>
                            <Tabs.Trigger value="publication" className='w-1/2 flex flex-col gap-2' disabled={!hasPublication}>
                                <SystemIcons.ShieldCheck className='size-10'/>
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