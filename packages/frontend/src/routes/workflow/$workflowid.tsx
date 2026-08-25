import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import ShelfSidebar from '@/routes/workflow/-SDKs/ShelfSDK/ui/ShelfSidebar'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import WorkflowCanvas from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/Canvas'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useCallback } from 'react'
import { Spinner } from '@pretzel-graph/standard-ui/foundations'
import NodeSidebar from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/NodePanel'
import { ChatSDK } from '@/routes/workflow/-SDKs/ChatSDK/sdk'
import ChatSidebar from '@/routes/workflow/-SDKs/ChatSDK/ui/ChatSidebar'
import AssistantSidebar from '@/routes/workflow/-SDKs/AssistantSDK/ui/Sidebar'
import SpotlightSearch from '@/routes/workflow/-SDKs/WorkbenchSDK/ui/SpotlightSearch'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { StackSDK } from '@/routes/workflow/-SDKs/StackSDK/sdk'
import { ExecutionSDK } from './-SDKs/ExecutionSDK/sdk'
import { Workflow } from '@pretzel-graph/shared/domain'
import { BottomPanel } from './-panels/BottomPanel'
import { TopLeftPanel } from './-panels/TopLeftPanel'
import { TopRightPanel } from './-panels/TopRightPanel'
import BottomLeftPanel from './-panels/BottomLeftPanel'
import { DrawerSDK } from './-SDKs/DrawerSDK/sdk'
import TimelineViewer from './-SDKs/ExecutionSDK/ui/Timeline'
import UoWInspectorSidebar from './-SDKs/ExecutionSDK/ui/UoWInspector/sidebar'
import { toast } from 'sonner'
import { router } from '@/main'
import { ConsultationSDK } from './-SDKs/ConsultationSDK'
import ConsultationDebugPanel from './-SDKs/ConsultationSDK/ui/ConsultationDebugPanel'

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
    loader: ({ params, abortController }) => {
        const workflowId = params.workflowid as Workflow.Id;

        QuerySDK.client.prefetchQuery({
            queryKey: ["core-blueprints"],
            queryFn: () => ShelfSDK.actions.loadSection("core_extended"),
            staleTime: Infinity,
        })
        QuerySDK.client.prefetchQuery({
            queryKey: ["bundle-blueprints"],
            queryFn: () => ShelfSDK.actions.loadSection("integrations"),
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
        QuerySDK.client.prefetchQuery({
            queryKey: ['chats', workflowId],
            queryFn: () => ChatSDK.actions.chat.listByWorkflow(workflowId),
        })

        ChatSDK.actions.chat.new();
        ChatSDK.actions.ui.setSidebarVisibility(false);

        ExecutionSDK.actions.clear();

        WorkbenchSDK.actions.setClickedNodeId(null)

        WorkbenchSDK.actions.workflow.load(workflowId, abortController.signal)
            .catch(err => {
                if (abortController.signal.aborted) return;

                toast.error("Failed to load workflow: " + (err instanceof Error ? err.message : String(err)))

                const folderId = LibrarySDK.state.workflowMetas[workflowId]?.folder_id
                router.navigate(
                    folderId
                        ? { to: '/home/library/$folderId', params: { folderId } }
                        : { to: '/home/library' }
                )
            })

        return null;
    },
    onLeave: ({ params }) => {
        const workflowId = params.workflowid as Workflow.Id;

        if (!isDevHmrFullReload() && !isDevBrowserUnload()) 
            WorkbenchSDK.actions.commit();
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

    const isLoaded = WorkbenchSDK.useStore(s => s.selectors.workflow.isLoaded(s))

    return (
        <>

            <div className="h-screen flex flex-col relative">

                {!isLoaded && (
                    <div className='fixed top-1/2 left-1/2 -translate-1/2 z-50'>
                        <Spinner className="w-[50px] h-[50px] "/>
                    </div>
                )}

                {/* Canvas — fills all space the drawer doesn't take */}
                <div
                    ref={canvasRef}
                    className="flex-1 relative overflow-hidden z-20 bg-background border-b border-border"
                >
                    <ShelfSidebar />
                    <WorkflowCanvas />
                    <ChatSidebar />
                    <BottomPanel />
                    <AssistantSidebar />
                    <NodeSidebar />
                    <UoWInspectorSidebar />
                    <TopLeftPanel />
                    <TopRightPanel />
                    <SpotlightSearch />
                    <StackSDK.UIOverlay />
                    <BottomLeftPanel />
                    <ConsultationSDK.UIOverlay/>
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
        </>
    )
}
