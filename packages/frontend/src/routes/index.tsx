import { Dither, ditherCtx } from '@pretzel-graph/standard-ui/components/Dither'
import { SystemSDK } from '@/SDKs/SystemSDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'


export const Route = createFileRoute('/')({
    beforeLoad: ({ context }) => {
        if (context.auth.isAuthenticated) {
            throw redirect({ to: '/home' })
        }
    },
    component: Landing,
})

function Landing() {
    const theme = SystemSDK.useStore(s => s.resolvedTheme)
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center z-10">
                <div className="flex items-center justify-center gap-2">
                    <SystemIcons.Pretzel className="size-10 fill-primary" />
                    <h1 className="text-3xl font-bold">PretzelGraph</h1>
                </div>
                <p className="mt-2 text-sm opacity-70">Visual agent workflow editor.</p>
                <Link
                    to="/auth"
                    className="inline-block mt-6 px-4 py-2 rounded border hover:bg-muted"
                >
                    Sign in →
                </Link>
            </div>
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
        </div>
    )
}
