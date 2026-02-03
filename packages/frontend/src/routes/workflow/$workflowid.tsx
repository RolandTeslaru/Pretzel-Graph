import { supabase } from '@/libs/supabase'
import ShelfSidebar from '@/SDKs/ShelfSDK/ui/ShelfSidebar'
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import WorkflowCanvas from '@/SDKs/WorkbenchSDK/ui/Canvas'
import InputSidebar from '@/SDKs/WorkbenchSDK/ui/InputSidebar'
import { Spinner } from '@/vx-ui/foundations'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import type { Workflow } from '@vx-agent-editor/shared/types'


export const Route = createFileRoute('/workflow/$workflowid')({
    beforeLoad: ({ context }) => {
        if (!context.auth.isAuthenticated) {
            throw redirect({ to: '/auth' })
        }
    },
    loader: async ({ params }) => {
        await WorkbenchSDK.loadWorkflow(params.workflowid as Workflow.Id);
    },
    component: WorkflowLayoutComponent,
    pendingComponent: () => (
        <div className="flex items-center justify-center min-h-screen">
            <Spinner />
        </div>
    )
})

function WorkflowLayoutComponent() {
    return (
        <div className='w-full h-screen overflow-hidden'>
            <ShelfSidebar />
            <WorkflowCanvas />
            <InputSidebar/>
        </div>
    )
}
