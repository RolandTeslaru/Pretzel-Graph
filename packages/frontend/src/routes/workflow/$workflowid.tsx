import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import ShelfSidebar from '@/routes/workflow/-SDKs/ShelfSDK/ui/ShelfSidebar'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import WorkflowCanvas from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/Canvas'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Dialog, Spinner } from '@pretzel-graph/standard-ui/foundations'
import NodeSidebar from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/NodePanel'
import ChatSidebar from '@/routes/workflow/-SDKs/ChatSDK/ui/ChatSidebar'
import SpotlightSearch from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/SpotlightSearch'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { StackSDK } from '@/routes/workflow/-SDKs/StackSDK/sdk'
import { ExecutionSDK } from './-SDKs/ExecutionSDK/sdk'
import { Workflow } from '@pretzel-graph/shared/domain'
import { BottomPanel } from './-panels/BottomPanel'
import { PathPanel } from './-panels/PathPanel'
import { TopRightPanel } from './-panels/TopRightPanel'
import BottomLeftPanel from './-panels/BottomLeftPanel'
import { DrawerSDK } from './-SDKs/DrawerSDK/sdk'
import TimelineViewer from './-SDKs/ExecutionSDK/ui/Timeline'
import UoWInspectorSidebar from './-SDKs/ExecutionSDK/ui/UoWInspector/sidebar'


export const Route = createFileRoute('/workflow/$workflowid')({
    beforeLoad: ({ context }) => {
        if (!context.auth.isAuthenticated) {
            throw redirect({ to: '/auth' })
        }
    },
    loader: ({ params, abortController }) => {
        const workflowId = params.workflowid as Workflow.Id;

        const loadtimeoutId = setTimeout(() => {
            DialogSDK.actions.push(`workflow-${workflowId}`, (props) => (
                <DialogSDK.Template dismissible={false} {...props} className='p-4 flex flex-row gap-4'>
                    <Dialog.Title className='text-lg font-bold'>Retrieving Workflow</Dialog.Title>
                    <Spinner />
                </DialogSDK.Template>
            ))
        }, 2000)

        QuerySDK.client.prefetchQuery({
            queryKey: ["core-blueprints"],
            queryFn: () => ShelfSDK.actions.loadSection("core"),
            staleTime: Infinity,
        })
        QuerySDK.client.prefetchQuery({
            queryKey: ["bundle-blueprints"],
            queryFn: () => ShelfSDK.actions.loadSection("bundle"),
            staleTime: Infinity
        })
        QuerySDK.client.prefetchQuery({
            queryKey: ['library', 'bootstrap'],
            queryFn: () => LibrarySDK.actions.bootstrap.get(),
            staleTime: 60_000,
        })
        QuerySDK.client.prefetchQuery({
            queryKey: ['version-control', 'publications', workflowId],
            queryFn: () => VersionControlSDK.actions.list(workflowId),
            staleTime: 30_000,
        })

        ExecutionSDK.actions.clearHistory();

        WorkbenchSDK.actions.workflow.load(workflowId, abortController.signal)
            .finally(() => {
                clearTimeout(loadtimeoutId);
                DialogSDK.actions.pop(`workflow-${workflowId}`)
            })

        return null;
    },
    onLeave: ({ params }) => {
        const workflowId = params.workflowid as Workflow.Id;

        DialogSDK.actions.pop(`workflow-${workflowId}`)
        WorkbenchSDK.actions.commit();
        WorkbenchSDK.actions.workflow.close()
    },
    component: WorkflowLayoutComponent,
})

function WorkflowLayoutComponent() {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (WorkbenchSDK.state.isDirty) {
                WorkbenchSDK.actions.commit();
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const isDrawerOpen = DrawerSDK.useStore(s => s.isOpen);

    return (
        <div className='bg-secondary'>
            <div className={`
                w-full relative overflow-hidden  z-20 bg-background
                border-b border-border transition-[height]
                ${isDrawerOpen ? "h-[65vh]" : "h-screen"}
            `}>
                <ShelfSidebar />
                <WorkflowCanvas />
                <ChatSidebar />
                <NodeSidebar />
                <UoWInspectorSidebar />
                <BottomPanel />
                <PathPanel />
                <TopRightPanel />
                <SpotlightSearch />
                <StackSDK.UIOverlay />
                <BottomLeftPanel />
            </div>
            
            <div className='h-[35vh] fixed bottom-0 left-0 w-full'>
                <TimelineViewer/>
            </div>
        </div>
    )
}
