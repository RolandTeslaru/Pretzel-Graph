import RunnerPanel from '@/SDKs/OrchestratorSDK/ui/runnerPanel'
import ShelfSidebar from '@/SDKs/ShelfSDK/ui/ShelfSidebar'
import WorkflowCanvas from '@/SDKs/WorkbenchSDK/ui/Canvas'
import InputSidebar from '@/SDKs/WorkbenchSDK/ui/InputSidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'


export const Route = createFileRoute('/workflow/$workflowid')({
    beforeLoad: ({ context }) => {
        if (!context.auth.isAuthenticated) {
            throw redirect({ to: '/auth' })
        }
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
