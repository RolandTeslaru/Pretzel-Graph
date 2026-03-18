import { AuthSDK } from '@/SDKs/AuthSDK/sdk'
import { Button } from '@vx-agent-editor/vx-ui/foundations'
import { createFileRoute, redirect } from '@tanstack/react-router'


export const Route = createFileRoute('/')({
    beforeLoad: ({ context }) => {
        if (!context.auth.isAuthenticated) {
            throw redirect({ to: '/auth' })
        }
    },
    component: Index,
})

function Index() {
    return (
        <div className="p-2">
            <Button
                onClick={() => {
                    AuthSDK.actions.logout();
                }}
            >
                Log Out
            </Button>
            <h3 className="text-2xl font-bold">Welcome to vxAgentEditor!</h3>
            <p className="mt-4">Start building your agent flows.</p>
        </div>
    )
}
