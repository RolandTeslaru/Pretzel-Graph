import { createFileRoute, redirect } from '@tanstack/react-router'
import AuthenticationPanel from '@/SDKs/AuthSDK/ui/AuthenticationPanel'
import Dither from '@/components/Dither/Dither'
import { createDitherCtx } from '@/components/Dither/createDitherCtx'
import { Pretzel } from '@pretzel-graph/standard-ui/icons/system'
import { SystemSDK } from '@/SDKs/SystemSDK'

// Created once outside the component so the WebGL renderer/canvas survive
// remounts of the auth page.
const ditherCtx = createDitherCtx()


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

    const theme = SystemSDK.useStore(s => s.theme)

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
            <div className="absolute left-0 top-0 z-10 flex h-full xl:w-[500px] w-full  bg-background/70 backdrop-blur-lg r">
                <div className='max-w-md min-w-md h-auto m-auto'>
                    <Pretzel className="mx-auto mb-4 text-primary" size={80} />
                    <AuthenticationPanel />
                </div>
            </div>
        </div>
    )
}
