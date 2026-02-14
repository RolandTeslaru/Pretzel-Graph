import RunnerPanel from '@/SDKs/OrchestratorSDK/ui/runnerPanel'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { ShelfSDK } from '@/SDKs/ShelfSDK/sdk'
import ShelfSidebar from '@/SDKs/ShelfSDK/ui/ShelfSidebar'
import WorkflowCanvas from '@/SDKs/WorkbenchSDK/ui/Canvas'
import InputSidebar from '@/SDKs/WorkbenchSDK/ui/NodeSidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'


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
    component: WorkflowLayoutComponent,
})

function WorkflowLayoutComponent() {
    return (
        <div className='w-full h-screen overflow-hidden'>
            <ShelfSidebar />
            <WorkflowCanvas />
            <InputSidebar/>
            <RunnerPanel/>
            <Outlet/>
        </div>
    )
}
