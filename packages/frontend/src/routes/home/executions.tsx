import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/home/executions')({
    component: ExecutionsRoute,
})

function ExecutionsRoute() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold">Executions</h1>
        </div>
    )
}
