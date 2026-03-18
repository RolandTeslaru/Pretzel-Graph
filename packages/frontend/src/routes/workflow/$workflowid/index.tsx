import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk';
import { Spinner } from '@vx-agent-editor/vx-ui/foundations';
import { createFileRoute } from '@tanstack/react-router'
import type { Workflow } from '@vx-agent-editor/shared/domain';

export const Route = createFileRoute('/workflow/$workflowid/')({
    component: WorkflowIndexComponent,
    loader: async ({ params }) => {
        await WorkbenchSDK.loadWorkflow(params.workflowid as Workflow.Id);
    },
    onLeave: () => {
        WorkbenchSDK.actions.workflow.close()
    },
    pendingComponent: () => (
        <div className="flex items-center justify-center min-h-screen">
            <Spinner />
        </div>
    )
})

function WorkflowIndexComponent() {
    return <div>Hello "/workflow/$workflowid"!</div>
}
