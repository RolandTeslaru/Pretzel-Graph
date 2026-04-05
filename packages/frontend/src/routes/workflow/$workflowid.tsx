import { ChatSDK } from '@/SDKs/ChatSDK/sdk'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { ShelfSDK } from '@/SDKs/ShelfSDK/sdk'
import ShelfSidebar from '@/SDKs/ShelfSDK/ui/ShelfSidebar'
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import WorkflowCanvas from '@/SDKs/WorkbenchSDK/ui/Canvas'
import { ExecutionSessionSDK } from '@/SDKs/ExecutionSessionSDK/sdk'
import { OrchestratorSDK } from '@/SDKs/OrchestratorSDK/sdk'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import JsonView from 'react18-json-view'
import 'react18-json-view/src/style.css'
import 'react18-json-view/src/dark.css'
import { Button, DropdownMenu, Select } from '@vx-agent-editor/vx-ui/foundations'
import NodeSidebar from '@/SDKs/WorkbenchSDK/ui/NodeSidebar'
import ChatSidebar from '@/SDKs/ChatSDK/ui/ChatSidebar'
import WorkflowControls from '@/SDKs/OrchestratorSDK/ui/WorkflowControls'
import { AdminJobsPanel } from '@/SDKs/OrchestratorSDK/ui/AdminJobsPanel'
import ChatButton from '@/SDKs/ChatSDK/ui/ChatButton'
import TemporalControls from '@/SDKs/WorkbenchSDK/ui/TemporalControls'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { SystemSDK } from '@/SDKs/SystemSDK/sdk'

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

const SDK_OPTIONS = ['WorkbenchSDK', 'ExecutionSessionSDK', 'OrchestratorSDK', 'ChatSDK'] as const
type SDKOption = typeof SDK_OPTIONS[number]

function useSDKState(selected: SDKOption) {
    const workbench = WorkbenchSDK.useStore(s => s);
    const execution = ExecutionSessionSDK.useStore(s => s);
    const orchestrator = OrchestratorSDK.useStore(s => s);
    const chat = ChatSDK.useStore(s => s);

    switch (selected) {
        case 'WorkbenchSDK': return workbench;
        case 'ExecutionSessionSDK': return execution;
        case 'OrchestratorSDK': return orchestrator;
        case 'ChatSDK': return chat;
    }
}

function StateViewer() {
    const [selected, setSelected] = useState<SDKOption>('WorkbenchSDK');
    const state = useSDKState(selected);

    return (
        <div className="fixed bottom-20 left-[260px] top-[20px] z-50 w-[400px] h-[500px] bg-card/70 backdrop-blur-sm border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
            <h3 className="text-sm font-semibold text-foreground p-3 border-b border-border bg-muted/30">
                State Viewer
            </h3>
            <div className="p-2 border-b border-border">
                <Select.Root value={selected} onValueChange={(v) => setSelected(v as SDKOption)}>
                    <Select.Trigger size="xs">
                        <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                        {SDK_OPTIONS.map(sdk => (
                            <Select.Item key={sdk} value={sdk}>{sdk}</Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar text-[11px] leading-relaxed">
                <JsonView
                    src={state}
                    collapsed={3}
                    theme="default"
                />
            </div>
        </div>
    )
}

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
            {/* <AdminJobsPanel /> */}
            {/* <StackDebugPanel/> */}
            {/* <StateViewer /> */}
            <Outlet />
        </div>
    )
}


const BottomPanel = () => {

    const hasIssues = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.workflow.hasIssues(s));

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
                <p>{workflowName}</p>
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