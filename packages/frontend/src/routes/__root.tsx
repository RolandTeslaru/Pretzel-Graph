import { DialogSDK } from '@/vx-ui/SDKs/DialogSDK'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AuthSDK } from '@/SDKs/AuthSDK/sdk'
import { NotificationSDK } from '@/vx-ui/SDKs/NotificationSDK'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'

interface RouterContext {
    auth: AuthSDK.State
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: () => (
        <>
            <QuerySDK.Provider>
                <NotificationSDK.UIOverlay/>
                <DialogSDK.UIOverlay />
                <Outlet />
                <TanStackRouterDevtools />
            </QuerySDK.Provider>
        </>
    ),
})

