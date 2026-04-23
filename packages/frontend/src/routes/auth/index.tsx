import { createFileRoute, redirect } from '@tanstack/react-router'
import AuthenticationPanel from '@/SDKs/AuthSDK/ui/AuthenticationPanel'
import GameOfLifeBackground from './GameOfLifeBackground'
import { Pretzel } from '@pretzel-graph/vx-ui/icons/system'


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
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
            <GameOfLifeBackground />
            <div className="relative z-10 w-full h-full max-w-md p-6 bg-background/80 backdrop-blur-md border border-border rounded-2xl shadow-black/20 shadow-2xl">
                <Pretzel className="mx-auto mb-4 text-primary" size={80} />
                <AuthenticationPanel />
            </div>
        </div>
    )
}
