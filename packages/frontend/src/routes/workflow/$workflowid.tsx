import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import ShelfSidebar from '@/routes/workflow/-SDKs/ShelfSDK/ui/ShelfSidebar'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import WorkflowCanvas from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/Canvas'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Badge, Button, Dialog, DropdownMenu, Popover, Spinner } from '@pretzel-graph/standard-ui/foundations'
import NodeSidebar from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/NodeSidebar'
import ChatSidebar from '@/routes/workflow/-SDKs/ChatSDK/ui/ChatSidebar'
import ExecutionControls from '@/routes/workflow/-SDKs/ExecutionSDK/ui/ExecutionControls'
import ChatButton from '@/routes/workflow/-SDKs/ChatSDK/ui/ChatButton'
import TemporalControls from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/TemporalControls'
import SpotlightSearch from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/SpotlightSearch'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { SystemSDK } from '@/SDKs/SystemSDK/sdk'
import { Validation, Workflow } from '@pretzel-graph/shared/domain'
import { StackSDK } from '@/routes/workflow/-SDKs/StackSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import Breadcrumbs from '../home/projects/-components/Breadcrumbs'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { openPublishDialog } from '@/SDKs/VersionControlSDK/ui/PublishDialog'
import VersionHistory from '@/SDKs/VersionControlSDK/ui/VersionHistory'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { GlowingAlertTriangle, GlowingAlertTriangleRed } from './-SDKs/WorkbenchSDK/ui/Canvas/Node/Header/icons'
import { AnimatePresence, motion } from 'motion/react'
import IssuesViewer from './-SDKs/WorkbenchSDK/ui/IssuesViewer'
import ErrorViewer from './-SDKs/ExecutionSDK/ui/ErrorViewer'
import { ExecutionSDK } from './-SDKs/ExecutionSDK/sdk'


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

        // Fire and forget
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

        // QuerySDK.client.prefetchQuery({
        //     queryKey: ['execution-session-metas', workflowId],
        //     queryFn: () => ExecutionSDK.actions.meta.list(workflowId),
        //     staleTime: 30_000,
        // })

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
            <ChatSidebar />
            <NodeSidebar />
            <BottomPanel />
            <PathPanel />
            <TopRightPanel />
            {/* <BottomRightPanel /> */}
            {/* <AdminJobsPanel /> */}
            {/* <StackDebugPanel/> */}
            <SpotlightSearch />
            <StackSDK.UIOverlay />
        </div>
    )
}


const BottomPanel = () => {

    const hasIssues = WorkbenchSDK.useStore(s => Validation.workflowHasIssues(s.issues));
    const executionHasError = ExecutionSDK.useStore(s => {
        const exec = s.currentExecution;
        if (!exec) return false;
        if (exec.error) return true;
        return Object.values(exec.session.node_status).some(ns => ns.status === 'failed');
    });

    return (
        <div className='bottom-5 left-1/2 -translate-x-1/2 z-10 fixed'>
            <motion.div layout transition={{ layout: { type: "spring", stiffness: 400, damping: 30 } }} className='relative shadow-md shadow-black/10 flex flex-row p-1 gap-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border overflow-visible'>
                <TemporalControls />
                <ChatButton />
                <ExecutionControls canRun={!hasIssues} />

                {/* Error bubble — absolutely positioned to the left of the bar */}
                <AnimatePresence>
                    {executionHasError && (
                        <Popover.Root>
                            <Popover.Trigger asChild>
                                <motion.div
                                    className='absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 p-1 h-10 w-10 bg-card/90 backdrop-blur-sm border border-border rounded-full flex cursor-pointer'
                                    initial={{ x: 24, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 24, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                >
                                    <div className='w-auto h-auto mx-auto mt-[5px]'>
                                        <GlowingAlertTriangleRed />
                                    </div>
                                </motion.div>
                            </Popover.Trigger>
                            <Popover.Content side="top" align="center" sideOffset={12} className='rounded-xl p-3 max-w-72'>
                                <ErrorViewer />
                            </Popover.Content>
                        </Popover.Root>
                    )}
                </AnimatePresence>

                {/* Issues bubble — absolutely positioned to the right of the bar */}
                <AnimatePresence>
                    {hasIssues && (
                        <Popover.Root>
                            <Popover.Trigger asChild>
                                <motion.div
                                    className='absolute left-[calc(100%+16px)] top-1/2 -translate-y-1/2 p-1 h-10 w-10 bg-card/90 backdrop-blur-sm border border-border rounded-full flex cursor-pointer'
                                    initial={{ x: -24, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -24, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                >
                                    <div className='w-auto h-auto mx-auto mt-[5px]'>
                                        <GlowingAlertTriangle/>
                                    </div>
                                </motion.div>
                            </Popover.Trigger>
                            <Popover.Content side="top" align="center" sideOffset={12} className='rounded-xl p-3 max-w-72'>
                                <IssuesViewer />
                            </Popover.Content>
                        </Popover.Root>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}


const PathPanel = () => {

    const workflowId = WorkbenchSDK.useStore(s => s.workflowId)
    const [folder_id, display_name] = LibrarySDK.useStore(s => {
        const meta = s.workflowMetas[workflowId]
        return [meta?.folder_id, meta?.display_name] as const
    })

    const breadCrumbs = LibrarySDK.useStore(s => {
        return LibrarySDK.selectors.getBreadcrumbs(s, folder_id);
    });

    return (
        <div className='fixed top-5 left-5 flex gap-3 text-sm font-medium'>
            <PretzelLogoDropwdown />
            <Breadcrumbs className='my-auto' cwd={breadCrumbs} finalFileName={display_name} />
        </div>
    )
}


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
        <div className='fixed top-5 right-5 flex flex-row gap-2'>
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
                <Button variant="ghost" size="icon-sm" onClick={() => openVisibilityDialog(workflowId, isPublic)}>
                    {isPublic ?
                        <SystemIcons.Globe strokeWidth={2} className='size-4 text-sky-500'/> :
                        <SystemIcons.GlobeOff strokeWidth={2} className='size-4 text-red-600'/>
                    }
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={handleLockToggle} disabled={isLockPending}>
                    {isLockPending ?
                        <Spinner className='size-4'/> :
                        isLocked ?
                            <SystemIcons.LockClosed strokeWidth={2} className='size-4'/> :
                            <SystemIcons.LockOpen strokeWidth={2} className='size-4'/>
                    }
                </Button>
            </div>
        </div>
    )
}


export const BottomRightPanel = () => {
    return (
        <div className='flex flex-row gap-2 fixed bottom-5 right-5 z-10 p-1 rounded-xl bg-card backdrop-blur-sm border border-border shadow-md shadow-black/10'>
            {/* <SessionSelector/> */}
        </div>
    )
}

const PretzelLogoDropwdown = () => {
    const theme = SystemSDK.useStore(s => s.theme);

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <SystemIcons.Pretzel size={30} className='text-primary cursor-pointer ' />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align='start' >
                <h4 className='px-2 py-1 text-md font-medium text-primary'>
                    PretzelGraph.ai
                </h4>
                <DropdownMenu.Item>
                    <SystemIcons.User />
                    Account
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                    <SystemIcons.Settings />
                    Settings
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => SystemSDK.actions.setTheme(value as "light" | "dark")}>
                    <p className='px-2 py-1 text-sm text-muted-foreground'>
                        Theme
                    </p>
                    <DropdownMenu.RadioItem value="light">
                        <SystemIcons.Sun />
                        Light
                    </DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem value="dark">
                        <SystemIcons.Moon />
                        Dark
                    </DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem value="system">
                        <SystemIcons.Monitor />
                        System
                    </DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}
