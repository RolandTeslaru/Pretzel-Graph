import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/workflow/$workflowid/')({
    component: WorkflowIndexComponent,
})

function WorkflowIndexComponent() {
    return <div>Hello "/workflow/$workflowid"!</div>
}
