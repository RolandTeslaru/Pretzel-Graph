import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { type Workflow } from '@pretzel-graph/shared/domain'
import { ActivitySDK } from '@/SDKs/ActivitySDK/sdk'
import ActivityKanban from '@/SDKs/ActivitySDK/ActivityKanban'
import { ExecutionsTable } from '@/routes/workflow/-SDKs/ExecutionSDK/ui/ExecutionsTable'
import { WorkflowIllustration } from '@pretzel-graph/standard-ui/icons/illustrations'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'


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
        <div className='flex flex-col pt-[60px] h-full gap-4'>
            <div className='w-full pl-4 pb-4 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-4rem),transparent)]'>
                <ActivityKanban />
            </div>
            <div className='pr-10'>
                <div className='flex flex-row w-full'>
                    <Button variant={"input"} onClick={() => LibrarySDK.openWorkflowSelector(setWorkflowId)} className='w-fit'>
                        Select a Workflow
                    </Button>
                </div>
                {workflowId &&
                    <ExecutionsTable key={workflowId} workflowId={workflowId} />
                }
            </div>
           
        </div>
    )
}
