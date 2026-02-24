import RunnerPanel from '@/SDKs/OrchestratorSDK/ui/runnerPanel'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { ShelfSDK } from '@/SDKs/ShelfSDK/sdk'
import ShelfSidebar from '@/SDKs/ShelfSDK/ui/ShelfSidebar'
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import WorkflowCanvas from '@/SDKs/WorkbenchSDK/ui/Canvas'
import InputSidebar from '@/SDKs/WorkbenchSDK/ui/NodeSidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import JsonView from 'react18-json-view'
import 'react18-json-view/src/style.css'
import 'react18-json-view/src/dark.css'
import { Button } from '@/vx-ui/foundations'

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

function WorkflowStateViewer() {
    const issues = WorkbenchSDK.useStore(s => s.issues);

    return (
        <div className="fixed bottom-20 left-[300px] top-[100px] z-50 w-[400px] h-[500px] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
            <h3 className="text-sm font-semibold text-foreground p-3 border-b border-border bg-muted/30">
                Workflow State
            </h3>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-background text-[13px] leading-relaxed">
                <JsonView
                    src={issues}
                    collapsed={3}
                    theme="default"
                />
            </div>
            <Button onClick={() => { WorkbenchSDK.actions.workflow.validate()}}>Validate Workflow</Button>
        </div>
    )
}

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
            <WorkflowStateViewer />
            <Outlet />
        </div>
    )
}
