import { DialogSDK } from '@/vx-ui/SDKs/DialogSDK'
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
    component: () => (
        <>
            <DialogSDK.UILayer/>
            <Outlet />
            <TanStackRouterDevtools />
        </>
    ),
})
