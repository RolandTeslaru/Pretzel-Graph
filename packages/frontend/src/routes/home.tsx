import { createFileRoute, Outlet, redirect, Link, useRouterState } from '@tanstack/react-router'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { ComponentType } from 'react'
import type { BaseIconProps } from '@pretzel-graph/standard-ui/icons/baseIcon'
import { DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { SystemSDK } from '@/SDKs/SystemSDK/sdk'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
// import { Preview } from 'shaders/react'

const HOME_STALE_TIME = 60_000

export const Route = createFileRoute('/home')({
    beforeLoad: ({ context }) => {
        if (!context.auth.isAuthenticated) {
            throw redirect({ to: '/auth' })
        }
    },
    loader: async () => {
        await Promise.all([
            QuerySDK.client.fetchQuery({
                queryKey: ['library', 'bootstrap'],
                queryFn: () => LibrarySDK.actions.bootstrap.get(),
                staleTime: HOME_STALE_TIME,
            }),
            QuerySDK.client.fetchQuery({
                queryKey: ['version-control', 'active-workflows'],
                queryFn: () => VersionControlSDK.actions.listActiveWorkflows(),
                staleTime: HOME_STALE_TIME,
            }),
        ])

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
    { id: 'projects',    label: 'Projects',    to: '/home/projects',    icon: SystemIcons.Folder },
    { id: 'credentials', label: 'Credentials', to: '/home/credentials', icon: SystemIcons.KeyRound },
    { id: 'executions',  label: 'Executions',  to: '/home/executions',  icon: SystemIcons.Activity },
    { id: 'usage',       label: 'Usage',       to: '/home/usage',       icon: SystemIcons.Layers },
    { id: 'templates',   label: 'Templates',   to: '/home/templates',   icon: SystemIcons.FileText },
]

const NAV_BOTTOM: NavEntry[] = [
    { id: 'settings', label: 'Settings', to: '/home/settings', icon: SystemIcons.Settings },
]


function HomeLayout() {
    QuerySDK.useQuery(
        ['version-control', 'active-workflows'],
        () => VersionControlSDK.actions.listActiveWorkflows(),
        { staleTime: HOME_STALE_TIME },
    )

    return (
        <div className="flex min-h-screen relative">
            <Sidebar />
            <main className="flex-1 bg-card/80 backdrop-blur-md mt-4 mr-2 rounded-2xl overflow-auto border border-border shadow-md shadow-black/5">
                <Outlet />
            </main>
        </div>
    )
}


function Sidebar() {
    return (
        <aside className="w-56 shrink-0 flex flex-col">
            <div className="h-14 px-4 flex items-center">
                <PretzelGraphDropdown />
            </div>

            <nav className="flex-1 p-2 flex flex-col gap-0.5">
                {NAV_TOP.map((e) => <NavItem key={e.id} entry={e} />)}
            </nav>

            <div className="p-2 border-t flex flex-col gap-0.5">
                {NAV_BOTTOM.map((e) => <NavItem key={e.id} entry={e} />)}
            </div>
        </aside>
    )
}

function PretzelGraphDropdown() {
    const theme = SystemSDK.useStore(s => s.theme)

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    type="button"
                    className="flex items-center gap-2 rounded-md px-1 py-1 -ml-1 hover:bg-muted/60 transition-colors"
                >
                    <SystemIcons.Pretzel size={30} className="fill-primary" />
                    <span className="font-semibold tracking-tight">PretzelGraph</span>
                    <SystemIcons.ChevronDown size={14} className="text-muted-foreground" />
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start">
                <h4 className="px-2 py-1 text-md font-medium text-primary">
                    PretzelGraph.ai
                </h4>
                <DropdownMenu.Item>
                    <SystemIcons.User />
                    Account
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                    <SystemIcons.Settings />
                    Settings
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => SystemSDK.actions.setTheme(value as 'light' | 'dark' | 'system')}>
                    <p className="px-2 py-1 text-sm text-muted-foreground">
                        Theme
                    </p>
                    <DropdownMenu.RadioItem value="light">
                        <SystemIcons.Sun />
                        Light
                    </DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem value="dark">
                        <SystemIcons.Moon />
                        Dark
                    </DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem value="system">
                        <SystemIcons.Monitor />
                        System
                    </DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
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
                active ? 'bg-muted font-medium' : 'hover:bg-muted/50 opacity-80 hover:opacity-100',
            ].join(' ')}
        >
            <Icon size={16} className={active ? 'stroke-primary' : ''} />
            <span>{entry.label}</span>
        </Link>
    )
}
