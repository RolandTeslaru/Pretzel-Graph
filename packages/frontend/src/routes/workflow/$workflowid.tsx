import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import ShelfSidebar from '@/routes/workflow/-SDKs/ShelfSDK/ui/ShelfSidebar'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import WorkflowCanvas from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/Canvas'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DropdownMenu } from '@vx-agent-editor/vx-ui/foundations'
import NodeSidebar from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/NodeSidebar'
import ChatSidebar from '@/routes/workflow/-SDKs/ChatSDK/ui/ChatSidebar'
import WorkflowControls from '@/routes/workflow/-SDKs/OrchestratorSDK/ui/WorkflowControls'
import { AdminJobsPanel } from '@/routes/workflow/-SDKs/OrchestratorSDK/ui/AdminJobsPanel'
import ChatButton from '@/routes/workflow/-SDKs/ChatSDK/ui/ChatButton'
import TemporalControls from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/TemporalControls'
import SpotlightSearch from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/SpotlightSearch'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { SystemSDK } from '@/SDKs/SystemSDK/sdk'
import { Validation } from '@vx-agent-editor/shared/domain'
import { StackSDK } from '@/routes/workflow/-SDKs/StackSDK/sdk'

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
        WorkbenchSDK.actions.commit();
        QuerySDK.client.clear();
    },
    component: WorkflowLayoutComponent,
})

function WorkflowLayoutComponent() {

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (WorkbenchSDK.state.isDirty) {
                WorkbenchSDK.actions.commit();
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
            <ChatSidebar/>
            <NodeSidebar />
            <BottomPanel/>
            <PathPanel/>
            <AdminJobsPanel />
            {/* <StackDebugPanel/> */}
            <SpotlightSearch />
            <StackSDK.UIOverlay />  
            <Outlet />
        </div>
    )
}


const BottomPanel = () => {

    const hasIssues = WorkbenchSDK.useStore(s => Validation.workflowHasIssues(s.issues));

    return (
        <div className='flex flex-row p-1 gap-2 rounded-xl bg-card/70 backdrop-blur-sm border border-border fixed bottom-5 left-1/2 -translate-x-1/2 z-10'>
            <TemporalControls/>
            <ChatButton/>
            <WorkflowControls canRun={!hasIssues} />
        </div>
    )
}


const PathPanel = () => {
    const workflowName = WorkbenchSDK.useStore(s => s.workflow?.display_name) || "Untitled Workflow";
    return (
        <div className='fixed top-5 left-5 flex gap-2 text-sm font-medium'>
            <PretzelLogoDropwdown/>
            <div className='flex flex-row gap-2 h-auto my-auto text-foreground/70'>
                <p>/</p>
                <p>PretzelHQ</p>
                <p>/</p>
                <p>Demos</p>
                <p>/</p>
                <p>Basic Agent Loop Test</p>
            </div>
        </div>
    )
}

const PretzelLogoDropwdown = () => {
    const theme = SystemSDK.useStore(s => s.theme);
    
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <SystemIcons.Pretzel size={30} className='text-primary cursor-pointer '/>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align='start' >
                <h4 className='px-2 py-1 text-md font-medium text-primary'>
                    PretzelGraph.ai
                </h4>
                <DropdownMenu.Item>
                    <SystemIcons.User/>
                    Account
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                    <SystemIcons.Settings/>
                    Settings
                </DropdownMenu.Item>
                <DropdownMenu.Separator/>
                <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => SystemSDK.actions.setTheme(value as "light" | "dark")}>
                    <p className='px-2 py-1 text-sm text-muted-foreground'>
                        Theme
                    </p>
                    <DropdownMenu.RadioItem value="light">
                        <SystemIcons.Sun/>
                        Light
                    </DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem value="dark">
                        <SystemIcons.Moon/>
                        Dark
                    </DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem value="system">
                        <SystemIcons.Monitor/>
                        System
                    </DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}