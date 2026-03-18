import { createFileRoute, redirect } from '@tanstack/react-router'
import AuthenticationPanel from '@/SDKs/AuthSDK/ui/AuthenticationPanel'
import VexrLogo from '@/SDKs/DialogSDK/components/VexrLogo'
import GameOfLifeBackground from './GameOfLifeBackground'


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
        <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
            <GameOfLifeBackground />
            <div className="relative z-10 w-full h-full max-w-md p-6 bg-background/80 backdrop-blur-md border border-border/50 rounded-2xl shadow-black shadow-2xl">
                <VexrLogo className='h-[100px] mb-10 opacity-15' />
                <AuthenticationPanel />
            </div>
        </div>
    )
}
