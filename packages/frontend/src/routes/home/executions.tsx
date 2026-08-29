import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { type Workflow } from '@pretzel-graph/shared/domain'
import { ActivitySDK } from '@/SDKs/ActivitySDK/sdk'
import ActivityKanban from '@/SDKs/ActivitySDK/ActivityKanban'
import { ExecutionsTable } from '@/routes/workflow/-SDKs/ExecutionSDK/ui/ExecutionsTable'
import WorkflowPicker from '@/SDKs/LibrarySDK/ui/WorkflowPicker'
import { WorkflowIllustration } from '@pretzel-graph/standard-ui/icons/illustrations'


export const Route = createFileRoute('/home/executions')({
    loader: async () => {
        await ActivitySDK.fetchActivityBootstrap()

        return null
    },
    component: ExecutionsRoute,
})


function ExecutionsRoute() {
    const [workflowId, setWorkflowId] = useState<Workflow.Id>()

    return (
        <div className='flex flex-col gap-4'>
            <div className='w-full'>
                <ActivityKanban />
            </div>

            {/* <WorkflowPicker selectedWorkflowId={workflowId} selectWorkflow={(id) => setWorkflowId(id)} /> */}
            {/* {workflowId
                ? (
                    <>
                        <ExecutionsTable key={workflowId} workflowId={workflowId} />
                    </>
                )
                : (
                        <div className='absolute top-1/2 left-1/2 -translate-1/2'>
                            <WorkflowIllustration className='size-20 text-primary mx-auto opacity-20' />
                            <p className='text-muted-foreground'>Select a Workflow</p>
                        </div>
                )
            } */}

        </div>
    )
}
