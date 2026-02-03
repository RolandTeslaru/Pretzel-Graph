import { DialogSDK } from '@/vx-ui/SDKs/DialogSDK'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AuthSDK } from '@/SDKs/AuthSDK/sdk'
import { NotificationSDK } from '@/vx-ui/SDKs/NotificationSDK'

interface RouterContext {
    auth: AuthSDK.State
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: () => (
        <>
            <NotificationSDK.UIOverlay/>
            <DialogSDK.UIOverlay />
            <Outlet />
            <TanStackRouterDevtools />
        </>
    ),
})

