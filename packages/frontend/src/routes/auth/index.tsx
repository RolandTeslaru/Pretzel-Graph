import { createFileRoute, redirect } from '@tanstack/react-router'
import AuthenticationPanel from '@/SDKs/AuthSDK/ui/AuthenticationPanel'
import VexrLogo from '@/vx-ui/SDKs/DialogSDK/components/VexrLogo'


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
                <VexrLogo className='h-[100px] mb-10 opacity-15'/>
                
                <AuthenticationPanel />
            </div>
        </div>
    )
}
