import type { ReactNode } from 'react'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { SystemSDK } from '@pretzel-graph/standard-ui/SDKs/SystemSDK/sdk'
import { AuthSDK } from '@/SDKs/AuthSDK/sdk'
import { CLOUD_URL } from '@/config'

// The origin is configured; the path is not.
export const WORKSPACES_URL = CLOUD_URL && `${CLOUD_URL.replace(/\/$/, '')}/workspaces`

/** Renders nothing without a cloud origin, so no call site needs a condition. */
export function AdminPanelItem() {
    if (!WORKSPACES_URL)
        return null

    return (
        <DropdownMenu.Item asChild>
            {/* Another origin, so a plain anchor rather than a router link. */}
            <a href={WORKSPACES_URL}>
                <SystemIcons.ArrowLeft />
                Admin panel
            </a>
        </DropdownMenu.Item>
    )
}

type Props = {
    compact?: boolean
    title?: string
    /** Entries for this screen, placed above the theme group. */
    children?: ReactNode
}

export function PretzelGraphDropdown({ compact = false, title = 'PretzelGraph', children }: Props) {
    const theme = SystemSDK.useStore(s => s.theme)

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                {compact ? (
                    <SystemIcons.Pretzel size={30} className="text-primary cursor-pointer" />
                ) : (
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-md px-1 py-1 -ml-1 hover:bg-muted/60 transition-colors"
                    >
                        <SystemIcons.Pretzel size={30} className="fill-primary" />
                        <span className="font-semibold tracking-tight">{title}</span>
                        <SystemIcons.ChevronDown size={14} className="text-muted-foreground" />
                    </button>
                )}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start">
                <h4 className="px-2 py-1 text-md font-medium text-primary">
                    {title}.ai
                </h4>
                {children}
                {/* <DropdownMenu.Item>
                    <SystemIcons.Settings />
                    Settings
                </DropdownMenu.Item> */}
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
                {/* Self-hosted only: with a cloud origin the session is managed there. */}
                {!WORKSPACES_URL && (
                    <>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item variant="destructive" onSelect={() => AuthSDK.openLogOutDialog()}>
                            <SystemIcons.Logout />
                            Log out
                        </DropdownMenu.Item>
                    </>
                )}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}
