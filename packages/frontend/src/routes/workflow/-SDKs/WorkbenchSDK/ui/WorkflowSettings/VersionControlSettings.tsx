import { VersionControlSDK } from '@/SDKs/VersionControlSDK/sdk';
import { openPublishDialog } from '@/SDKs/VersionControlSDK/ui/PublishDialog';
import VersionHistory from '@/SDKs/VersionControlSDK/ui/VersionHistory'
import { openDeactivatePublicationDialog } from '@/SDKs/VersionControlSDK/ui/VersionHistory/utils';
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

export const VersionControlSettings = () => {
    const [hasPublications, hasActivePublication, activePublication] = VersionControlSDK.useStore(s => [
        s.currentWorkflowPublications.length > 0,
        s.currentWorkflowPublications.some(p => p.is_active),
        VersionControlSDK.selectors.getActive(s),
    ]);
        
    return (
        <>
            <div className='p-0.5 bg-card rounded-full absolute top-2 right-2 z-100 border border-border shadow-lg shadow-black/10 gap-1 inline-flex'>
                <Button className='rounded-full' variant="ghost" size="sm" onClick={openPublishDialog}>
                    {hasPublications && (
                        <div className={`content-[""] my-auto w-2 h-2 mr-2 rounded-full ${hasActivePublication ? "bg-green-400" : "bg-red-500"}`}/>
                    )}
                    <SystemIcons.CloudUpload className='size-4 mr-1'/>
                    Publish
                </Button>
                <Button
                    variant={activePublication ? "ghost-success" : "ghost-destructive"}
                    size="icon-sm"
                    className="gap-2"
                    disabled={!activePublication}
                    onClick={() => {
                        if (!activePublication) return;
                        openDeactivatePublicationDialog(
                            activePublication,
                            () => VersionControlSDK.actions.deactivate(activePublication.id),
                        );
                    }}
                >
                    <SystemIcons.Power className='size-4'/>
                </Button>
            </div>
            <VersionHistory className="w-full" hideHeader />
        </> 
    )
}
