import RunnerPanel from '@/SDKs/OrchestratorSDK/ui/runnerPanel'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { ShelfSDK } from '@/SDKs/ShelfSDK/sdk'
import ShelfSidebar from '@/SDKs/ShelfSDK/ui/ShelfSidebar'
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import WorkflowCanvas from '@/SDKs/WorkbenchSDK/ui/Canvas'
import InputSidebar from '@/SDKs/WorkbenchSDK/ui/NodeSidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'


export const Route = createFileRoute('/workflow/$workflowid')({
    beforeLoad: ({ context }) => {
        if (!context.auth.isAuthenticated) {
            throw redirect({ to: '/auth' })
        }
    },
    loader: async () => {
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

        return null;
    },
    onLeave: () => {
        WorkbenchSDK.actions.commitImmediately();
        QuerySDK.client.clear();
    },
    component: WorkflowLayoutComponent,
})

function WorkflowLayoutComponent() {

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (WorkbenchSDK.state.isDirty) {
                WorkbenchSDK.actions.commitImmediately();
                // This triggers the browser's generic "Leave Site? Changes you made may not be saved." dialog.
                e.preventDefault();
                e.returnValue = ''; // Chrome requires returnValue to be set
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    return (
        <div className='w-full h-screen overflow-hidden'>
            <ShelfSidebar />
            <WorkflowCanvas />
            <InputSidebar />
            <RunnerPanel />
            <Outlet />
        </div>
    )
}
