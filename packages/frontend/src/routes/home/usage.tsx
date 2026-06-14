import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/home/usage')({
    component: UsageRoute,
})

function UsageRoute() {
    return (
        <div className="p-6">
        </div>
    )
}
