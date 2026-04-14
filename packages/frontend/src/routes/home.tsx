import { createFileRoute, Outlet, redirect, Link, useRouterState } from '@tanstack/react-router'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import type { ComponentType } from 'react'
import type { BaseIconProps } from '@vx-agent-editor/vx-ui/icons/baseIcon'


export const Route = createFileRoute('/home')({
    beforeLoad: ({ context }) => {
        if (!context.auth.isAuthenticated) {
            throw redirect({ to: '/auth' })
        }
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
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 bg-card m-2 rounded-2xl overflow-auto border border-border shadow-md shadow-black/5">
                <Outlet />
            </main>
        </div>
    )
}


function Sidebar() {
    return (
        <aside className="w-56 shrink-0 flex flex-col bg-background">
            <div className="h-14 px-4 flex items-center">
                <SystemIcons.Pretzel size={30} className="mr-2 fill-primary" />
                <span className="font-semibold tracking-tight">PretzelGraph</span>
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
