import { createFileRoute, redirect } from '@tanstack/react-router'
import AuthenticationPanel from '@/SDKs/AuthSDK/ui/AuthenticationPanel'


export const Route = createFileRoute('/auth/')({
    // If already authenticated, redirect to home
    beforeLoad: ({ context }) => {
        if (context.auth.isAuthenticated) {
            throw redirect({ to: '/' })
        }
    },
    component: AuthPage,
})

function AuthPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-full h-full max-w-md p-6">
                <h1 className="text-2xl font-bold text-center mb-6">Welcome to vxAgentEditor</h1>
                
                <AuthenticationPanel />
            </div>
        </div>
    )
}
