import { useState } from 'react'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { openPublishDialog } from '@/SDKs/VersionControlSDK/ui/PublishDialog'
import VersionHistory from '@/SDKs/VersionControlSDK/ui/VersionHistory'
import { Button, Popover, Spinner } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Workflow } from '@pretzel-graph/shared/domain'
import Tipped from '@/components/Tipped'
import { openWorkflowSettingsDialog } from '../-SDKs/WorkbenchSDK/ui/WorkflowSettings'

function openVisibilityDialog(workflowId: Workflow.Id, isPublic: boolean) {
    const DIALOG_ID = "workflow-visibility"

    DialogSDK.actions.push(DIALOG_ID, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type={isPublic ? "warning" : "default"}
            onApprove={async () => {
                await LibrarySDK.actions.workflow.setVisibility(workflowId, !isPublic)
                DialogSDK.actions.pop(DIALOG_ID)
            }}
            onCancel={() => DialogSDK.actions.pop(DIALOG_ID)}
        >
            {isPublic ? (
                <>
                    <p className="font-semibold text-base">Make workflow private?</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        This workflow is currently public. Making it private means other users will no longer be able to read it or execute it as a sub-workflow. Any workflows that depend on it as a sub-workflow will fail to run.
                    </p>
                </>
            ) : (
                <>
                    <p className="font-semibold text-base">Make workflow public?</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Making this workflow public allows any user to read it and use it as a sub-workflow in their own workflows. They cannot edit or execute it directly — only embed it as a dependency.
                    </p>
                </>
            )}
        </DialogSDK.AlertTemplate>
    ))
}

export const TopRightPanel = () => {
    const workflowId = WorkbenchSDK.useStore(s => s.workflowId);
    const [hasPublications, hasActivePublication] = VersionControlSDK.useStore(s => [
        s.currentWorkflowPublications.length > 0,
        s.currentWorkflowPublications.some(p => p.is_active),
    ]);
    const [isPublic, isLocked] = LibrarySDK.useStore(s => {
        const meta = s.workflowMetas[workflowId]
        return [meta?.is_public ?? false, meta?.locked ?? false] as const
    });
    const [isLockPending, setIsLockPending] = useState(false);

    const handleLockToggle = async () => {
        setIsLockPending(true);
        try {
            await LibrarySDK.actions.workflow.setLock(workflowId, !isLocked);
        } finally {
            setIsLockPending(false);
        }
    };

    return (
        <div className='fixed top-5 right-5 z-100 flex flex-row gap-2'>
            <div className='flex flex-row gap-2 z-10 p-0.5 rounded-xl bg-card backdrop-blur-sm border border-border shadow-md shadow-black/10'>
                <Button className='rounded-full' variant="ghost" size="sm" onClick={openPublishDialog}>
                    {hasPublications && (
                        <div className={`content-[""] my-auto w-2 h-2 mr-2 rounded-full ${hasActivePublication ? "bg-green-400" : "bg-red-500"}`}/>
                    )}
                    <SystemIcons.CloudUpload className='size-4 mr-1'/>
                    Publish
                </Button>

                <div className='h-4 my-auto border-l border-border' />

                <Popover.Root>
                    <Popover.Trigger asChild>
                        <Button variant="ghost" size="icon-sm">
                            <SystemIcons.History className='size-4'/>
                        </Button>
                    </Popover.Trigger>
                    <Popover.Content align="end" className='p-0 rounded-xl' sideOffset={10}>
                        <VersionHistory />
                    </Popover.Content>
                </Popover.Root>
            </div>
            <div className='p-0.5 z-10 flex flex-row gap-1 rounded-xl bg-card backdrop-blur-sm border border-border shadow-md shadow-black/10'>
                <Tipped label="Visibility">
                    <Button variant="ghost" size="icon-sm" onClick={() => openVisibilityDialog(workflowId, isPublic)}>
                        {isPublic ?
                            <SystemIcons.Globe strokeWidth={2} className='size-4 text-sky-500'/> :
                            <SystemIcons.GlobeOff strokeWidth={2} className='size-4 text-red-600'/>
                        }
                    </Button>
                </Tipped>
                <Tipped label="Lock">
                    <Button variant="ghost" size="icon-sm" onClick={handleLockToggle} disabled={isLockPending}>
                        {isLockPending ?
                            <Spinner className='size-4'/> :
                            isLocked ?
                                <SystemIcons.LockClosed strokeWidth={2} className='size-4'/> :
                                <SystemIcons.LockOpen strokeWidth={2} className='size-4'/>
                        }
                    </Button>
                </Tipped>
            </div>
            <div className='p-0.5 z-10 flex flex-row gap-1 rounded-xl bg-card backdrop-blur-sm border border-border shadow-md shadow-black/10'>
                <Tipped label="Workflow Config">
                    <Button variant="ghost" size="icon-sm" onClick={openWorkflowSettingsDialog}>
                        <SystemIcons.Cog className='size-5'/>
                    </Button>
                </Tipped>
            </div>
        </div>
    )
}
