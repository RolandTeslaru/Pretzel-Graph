import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthSDK } from '@/SDKs/AuthSDK/sdk'

export const Route = createFileRoute('/')({
    beforeLoad: () => {
        if (!AuthSDK.state.isAuthenticated) {
            throw redirect({ to: '/auth' })
        }
    },
    component: Index,
})

function Index() {
    return (
        <div className="p-2">
            <h3 className="text-2xl font-bold">Welcome to vxAgentEditor!</h3>
            <p className="mt-4">Start building your agent flows.</p>
        </div>
    )
}
