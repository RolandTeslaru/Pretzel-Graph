import { createFileRoute, Outlet, Link, useRouterState } from '@tanstack/react-router'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { useMemo, type ComponentType } from 'react'
import type { BaseIconProps } from '@pretzel-graph/standard-ui/icons/baseIcon'
import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { AdminPanelItem, PretzelGraphDropdown, WORKSPACES_URL } from '@/components/PretzelGraphDropdown'
import { Dither, ditherCtx } from '@pretzel-graph/standard-ui/components/Dither'
import { SystemSDK } from '@pretzel-graph/standard-ui/SDKs/SystemSDK'
// import { Preview } from 'shaders/react'

const HOME_STALE_TIME = 60_000

export const Route = createFileRoute('/home')({
    loader: async () => {
        await QuerySDK.client.fetchQuery({
            queryKey: ['library', 'bootstrap'],
            queryFn: () => LibrarySDK.actions.bootstrap.get(),
            staleTime: HOME_STALE_TIME,
        })

        return null
    },
    component: HomeLayout,
})


type NavEntry = {
    id: string
    label: string
    to: string
    icon: ComponentType<BaseIconProps>
}

const NAV_TOP: NavEntry[] = [
    { id: 'library',     label: 'Library',     to: '/home/library',     icon: SystemIcons.Folder },
    { id: 'credentials', label: 'Credentials', to: '/home/credentials', icon: SystemIcons.KeyRound },
    { id: 'executions',  label: 'Executions',  to: '/home/executions',  icon: SystemIcons.Activity },
    { id: 'usage',       label: 'Usage',       to: '/home/usage',       icon: SystemIcons.Layers },
    { id: 'templates',   label: 'Templates',   to: '/home/templates',   icon: SystemIcons.FileText },
]

const NAV_BOTTOM: NavEntry[] = [
    { id: 'settings', label: 'Settings', to: '/home/settings', icon: SystemIcons.Settings },
]



function HomeLayout() {
    const theme = SystemSDK.useStore(s => s.resolvedTheme)
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    const currentNav =  useMemo(() => {
        return NAV_TOP.find(e => pathname === e.to || pathname.startsWith(e.to + '/'))
    }, [pathname])
    

    return (
        <div className="flex max-h-screen w-full min-h-screen  relative overflow-hidden">
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
            <div className="relative z-10 flex  max-w-7xl w-full  flex-row bg-background/80 backdrop-blur-lg max-h-screen rounded-tr-2xl min-h-screen mr-auto">
                <Sidebar />
                <div className='relative w-full'>
                    <nav className="absolute z-20 top-0 min-h-[60px] px-4 flex items-center">
                        <h1 className="text-xl font-semibold">
                            {currentNav && currentNav.label}
                        </h1>
                    </nav>
                    <div className="flex flex-col relative w-full max-h-screen overflow-hidden">
                        <main className="flex-1 pt-[60px] min-h-0 w-full overflow-y-auto pl-3 pr-10 pt-6 pb-10 [mask-image:linear-gradient(to_bottom,transparent_8px,black_72px)]">
                            <Outlet />
                        </main>
                    </div>
                </div>
            </div>
        </div>
    )
}


function Sidebar() {
    return (
        <aside className="w-56 shrink-0 flex flex-col">
            <div className="h-14 px-4 flex items-center">
                <PretzelGraphDropdown>
                    <AdminPanelItem />
                </PretzelGraphDropdown>
            </div>

            <nav className="flex-1 p-2 flex flex-col gap-0.5">
                {NAV_TOP.map((e) => <NavItem key={e.id} entry={e} />)}
            </nav>

            <div className="p-2 flex flex-col gap-0.5">
                {WORKSPACES_URL && <ExternalNavItem href={WORKSPACES_URL} label="Admin panel" />}
                {NAV_BOTTOM.map((e) => <NavItem key={e.id} entry={e} />)}
            </div>
        </aside>
    )
}

// Another origin, so a plain anchor rather than a router link.
function ExternalNavItem({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-muted/50 opacity-80 hover:opacity-100"
        >
            <SystemIcons.ArrowLeft size={16} />
            <span>{label}</span>
        </a>
    )
}

function NavItem({ entry }: { entry: NavEntry }) {
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    const active = pathname === entry.to || pathname.startsWith(entry.to + '/')
    const Icon = entry.icon

    return (
        <Link
            to={entry.to}
            className={[
                'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
                active ? 'bg-muted/80 font-medium' : 'hover:bg-muted/50 opacity-80 hover:opacity-100',
            ].join(' ')}
        >
            <Icon size={16} className={active ? 'stroke-primary' : ''} />
            <span>{entry.label}</span>
        </Link>
    )
}
