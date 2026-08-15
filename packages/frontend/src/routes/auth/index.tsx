import { createFileRoute, redirect } from '@tanstack/react-router'
import { Auth } from '@pretzel-graph/shared/domain'
import { api } from '@/SDKs/ApiInterceptorSDK'
import AuthenticationPanel from '@/SDKs/AuthSDK/ui/AuthenticationPanel'
import Dither from '@/components/Dither/Dither'
import { ditherCtx } from '@/components/Dither/ditherCtx'
import { Pretzel } from '@pretzel-graph/standard-ui/icons/system'
import { SystemSDK } from '@/SDKs/SystemSDK'


export const Route = createFileRoute('/auth/')({
    // If already authenticated, redirect to home
    beforeLoad: ({ context }) => {
        if (context.auth.isAuthenticated) {
            throw redirect({ to: '/home' })
        }
    },
    // A failed request degrades to the login screen rather than offering to claim
    // an instance that may already be owned.
    loader: () => Auth.API.Status.get(api).catch(() => ({ claimed: true })),
    component: AuthPage,
})

function AuthPage() {

    const { claimed } = Route.useLoaderData()
    const theme = SystemSDK.useStore(s => s.resolvedTheme)

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
            <div className="pointer-events-none w-full fixed inset-0 z-0">
                <Dither
                    ctx={ditherCtx}
                    waveColorVar="--primary"
                    bgColor={theme === "dark" ? [0.08, 0.08, 0.08] : [0.88, 0.88, 0.88]}
                    disableAnimation={false}
                    enableMouseInteraction={false}
                    mouseRadius={0.3}
                    colorNum={5.5}
                    waveAmplitude={0.20}
                    waveFrequency={1.4}
                    waveSpeed={0.05}
                />
            </div>
            <div className="absolute p-10 left-0 h-full z-10 flex xl:w-[900px] w-full  bg-background/70 backdrop-blur-lg rounded-r-2xl">
                <div className='max-w-md min-w-md h-auto m-auto'>
                    <Pretzel className="mx-auto mb-4 text-primary" size={80} />
                    <AuthenticationPanel claimed={claimed} />
                </div>
            </div>
        </div>
    )
}
