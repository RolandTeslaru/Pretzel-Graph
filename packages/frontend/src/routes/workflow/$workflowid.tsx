import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import ShelfSidebar from '@/routes/workflow/-SDKs/ShelfSDK/ui/ShelfSidebar'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import WorkflowCanvas from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/Canvas'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useRef, useCallback } from 'react'
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

let isViteFullReloadPending = false
let isBrowserUnloadPending = false

if (import.meta.hot) {
    import.meta.hot.on('vite:beforeFullReload', () => {
        isViteFullReloadPending = true
    })
}

const isDevHmrFullReload = () => import.meta.env.DEV && isViteFullReloadPending
const isDevBrowserUnload = () => import.meta.env.DEV && isBrowserUnloadPending

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

        ExecutionSDK.actions.clear();

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
        if (!isDevHmrFullReload() && !isDevBrowserUnload()) WorkbenchSDK.actions.commit();
        WorkbenchSDK.actions.workflow.close()
    },
    component: WorkflowLayoutComponent,
})

function WorkflowLayoutComponent() {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            isBrowserUnloadPending = true;

            if (import.meta.env.DEV || isDevHmrFullReload()) return;

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

    const canvasRef   = useRef<HTMLDivElement>(null)
    const drawerRef   = useRef<HTMLDivElement>(null)
    const dragRef     = useRef<{ startY: number; startDrawerH: number } | null>(null)

    const DRAWER_MIN  = 80
    const DRAWER_MAX  = window.innerHeight * 0.85
    const DRAWER_DEFAULT = window.innerHeight * 0.35

    // remembers the last open height so re-opening restores it
    const openHeightRef = useRef(DRAWER_DEFAULT)

    // animate open/close when isDrawerOpen changes
    useEffect(() => {
        const drawer = drawerRef.current
        if (!drawer) return
        const t = "height 300ms ease-in-out"
        drawer.style.transition = t
        drawer.style.height = isDrawerOpen ? `${openHeightRef.current}px` : "0px"
    }, [isDrawerOpen])

    const onHandleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        const drawer = drawerRef.current
        if (!drawer) return
        // kill transition during drag, restore on mouseup
        drawer.style.transition = "none"
        canvasRef.current && (canvasRef.current.style.transition = "none")
        dragRef.current = {
            startY:       e.clientY,
            startDrawerH: drawer.getBoundingClientRect().height,
        }
    }, [])

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            const drag   = dragRef.current
            const drawer = drawerRef.current
            if (!drag || !drawer) return
            const newH = Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, drag.startDrawerH + (drag.startY - e.clientY)))
            drawer.style.height = `${newH}px`
        }
        const onMouseUp = () => {
            if (dragRef.current) {
                const t = "height 300ms ease-in-out"
                if (drawerRef.current) {
                    drawerRef.current.style.transition = t
                    openHeightRef.current = drawerRef.current.getBoundingClientRect().height
                }
                if (canvasRef.current) canvasRef.current.style.transition = t
            }
            dragRef.current = null
        }
        window.addEventListener("mousemove", onMouseMove)
        window.addEventListener("mouseup",   onMouseUp)
        return () => {
            window.removeEventListener("mousemove", onMouseMove)
            window.removeEventListener("mouseup",   onMouseUp)
        }
    }, [])

    return (
        <div className="h-screen flex flex-col">
            {/* Canvas — fills all space the drawer doesn't take */}
            <div
                ref={canvasRef}
                className="flex-1 relative overflow-hidden z-20 bg-background border-b border-border"
            >
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

            {/* Drawer — always mounted, height animates between 0 and open height */}
            <div
                ref={drawerRef}
                style={{ height: 0 }}
                className="flex-none flex flex-col w-full overflow-hidden"
            >
                    <div
                        onMouseDown={onHandleMouseDown}
                        className="h-2 w-full cursor-ns-resize flex items-center justify-center group flex-none"
                    >
                        <div className="w-10 h-0.5 rounded-full bg-border group-hover:bg-muted-foreground transition-colors" />
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <TimelineViewer />
                    </div>
                </div>
        </div>
    )
}
