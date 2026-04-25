import { createFileRoute, redirect } from '@tanstack/react-router'
import AuthenticationPanel from '@/SDKs/AuthSDK/ui/AuthenticationPanel'
import GameOfLifeBackground from './GameOfLifeBackground'
import { Pretzel } from '@pretzel-graph/standard-ui/icons/system'


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
            <div className="absolute left-0 top-0 z-10 flex h-full xl:w-[500px] w-full  bg-background/90 backdrop-blur-lg r">
                <div className='max-w-md min-w-md h-auto m-auto'>
                    <Pretzel className="mx-auto mb-4 text-primary" size={80} />
                    <AuthenticationPanel />
                </div>
            </div>
        </div>
    )
}
