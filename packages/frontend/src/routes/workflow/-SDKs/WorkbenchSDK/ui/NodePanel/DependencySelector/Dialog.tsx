import { memo, useState } from 'react'
import { Badge, Button, Dialog, Input, ScrollArea, Select, Spinner, Tabs } from '@pretzel-graph/standard-ui/foundations'
import { Library, Listing, Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { FileSystemTree } from '@/SDKs/LibrarySDK/ui/FileSystemTree'
import FolderView from '@/SDKs/LibrarySDK/ui/FolderView'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'

interface Props {
    nodeId: Workflow.Node.Id
}

const DEPENDENCY_SELECTOR_DIALOG_ID = "dependency-selector"

export const openDependencySelectorDialog = (nodeId: Workflow.Node.Id) => {
    DialogSDK.actions.push(DEPENDENCY_SELECTOR_DIALOG_ID, (props) => (
        <DialogSDK.SplitTemplate {...props}
            sidebarRenderer={() => (
                <>
                    <div className="flex flex-row items-center gap-2">
                        <SystemIcons.Graph className="size-5 shrink-0" />
                        <p className="text-md font-semibold text-foreground">Dependency Selector</p>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Embeds a snapshot of a workflow in this node
                    </p>
                </>
            )}
            sidebarClassName='w-[320px]'
            contentClassName='pr-0! py-0! gap-0! min-w-[600px]'
        >
            <MainContent nodeId={nodeId}/>
        </DialogSDK.SplitTemplate>
    ))
}

const MainContent = memo<Props>(({ nodeId }) => {
    const [cwd, setCwd] = useState<Library.Folder.Id>(Library.Folder.ROOT_ID)

    const [childFolders, childWorkflows] = LibrarySDK.useStore(s => [
        Object.values(s.folders).filter((f) => f.parent_folder_id === cwd),
        Object.values(s.workflowMetas).filter((w) => w.folder_id === cwd)
    ])

    const query = QuerySDK.useQuery(
        ['version-control', 'active-workflows'],
        () => VersionControlSDK.actions.listActiveWorkflows(),
        { staleTime: 60_000 },
    )

    

    return (
        <Tabs.Root
            defaultValue={"local"}
        >
            <div className='w-full flex flex-row gap-2 h-10 '>
                <Dialog.Title className='text-sm my-auto'>Select a Workflow</Dialog.Title>
                <Tabs.List size="xs" className="absolute top-2 right-2" variant="primary">
                    <Tabs.Trigger value='local'>
                        Local
                    </Tabs.Trigger>
                    <Tabs.Trigger value='publicListing'>
                        Public
                    </Tabs.Trigger>
                </Tabs.List>
            </div>
            <div className='flex flex-row h-[400px] w-full'>
                <Tabs.Content value="local" className='flex flex-row w-full'>
                    <ScrollArea.Root className='min-w-[200px] max-w-[200px] h-[400px]'>
                        <FileSystemTree size="sm" cwd={cwd}
                            onFolderClick={(id) => setCwd(id)}
                            onWorkflowClick={(workflowId) => openDependencyTypeDialog(nodeId, workflowId)}
                        />
                    </ScrollArea.Root>
                    <ScrollArea.Root className='w-full pt-2 h-[400px] w-full flex-1'>
                        <FolderView
                            childFolders={childFolders}
                            workflows={childWorkflows}
                            className='px-1 w-full!'
                            size='sm'
                            onFolderClick={(id) => setCwd(id)}
                            onWorkflowClick={(workflowId) => openDependencyTypeDialog(nodeId, workflowId)}
                        />
                    </ScrollArea.Root>

                </Tabs.Content>
                <Tabs.Content value="publicListing">
                    <ListingSelector nodeId={nodeId}/>
                </Tabs.Content>
            </div>
        </Tabs.Root>

    )
})

const ListingSelector = ({ nodeId }: Props) => {
    const [value, setValue] = useState('')

    const listingId = Listing.Id.safeParse(value.trim()).data

    const handlePreview = () => {
        if (!listingId)
            return

        WorkbenchSDK.openWorkflowWindow(listingId)
    }

    const handleAttach = () => {
        if (!listingId)
            return

        openAttachListingDialog(nodeId, listingId)
    }

    return (
        <div className='flex flex-col gap-2'>
            <p className='text-xs text-muted-foreground'>Enter the public workflow listing id:</p>
            <div className='flex flex-row gap-2'>
                <Input
                    size="sm"
                    className='w-[300px]'
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`${Listing.ID_PREFIX}-…`}
                    spellCheck={false}
                />
                <Button variant="input" disabled={!listingId} onClick={handlePreview}>
                    <SystemIcons.Graph/>
                    Preview
                </Button>
                <Button variant="input" disabled={!listingId} onClick={handleAttach}>
                    Attach
                </Button>
            </div>
        </div>
    )
}

const openAttachListingDialog = (nodeId: Workflow.Node.Id, listingId: Listing.Id) => {

    const dialogId = `attach-listing-${nodeId}-${listingId}`

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type='warning'
            onApprove={async () => {
                DialogSDK.actions.pop(dialogId)

                const success = await WorkbenchSDK.actions.dependency.attachToNode(nodeId, listingId, 'publication')

                if (success)
                    DialogSDK.actions.pop(DEPENDENCY_SELECTOR_DIALOG_ID)
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <div className='font-semibold'>Attach public workflow?</div>
            <div className='text-sm text-muted-foreground mt-1'>
                Only embed publicly listed workflows you trust. A snapshot of the
                listed version is copied into this workflow and runs with it.
            </div>
        </DialogSDK.AlertTemplate>
    ))
}


export const getDependencyTypeDialogId = (nodeId: Workflow.Node.Id, workflowId: Workflow.Id) => `dependency-type-${nodeId}-${workflowId}`

const openDependencyTypeDialog = (nodeId: Workflow.Node.Id, workflowId: Workflow.Id) => {

    const dialogId = getDependencyTypeDialogId(nodeId, workflowId)

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.Template {...props} className='p-2'>
            <DependencyTypeDialog
                nodeId={nodeId}
                workflowId={workflowId}
            />
        </DialogSDK.Template>
    ))
}

const variantDescriptions: Record<Workflow.Dependency.Variant, string> = {
    draft: "Follows the workflow's current working version. You'll be offered an update whenever it's saved with changes.",
    publication: "Pins to the workflow's active published version. You'll be offered an update only when a new version is published.",
}

interface DependencyTypeDialogProps {
    nodeId: Workflow.Node.Id
    workflowId: Workflow.Id
}

const DependencyTypeDialog = ({ nodeId, workflowId }: DependencyTypeDialogProps) => {

    const dialogId = getDependencyTypeDialogId(nodeId, workflowId)

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