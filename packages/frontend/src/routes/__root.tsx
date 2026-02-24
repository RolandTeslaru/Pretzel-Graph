import { DialogSDK } from '@/vx-ui/SDKs/DialogSDK'
import { StackSDK } from '@/SDKs/StackSDK'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AuthSDK } from '@/SDKs/AuthSDK/sdk'
import { NotificationSDK } from '@/vx-ui/SDKs/NotificationSDK'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import ThemeSelector from '@/SDKs/SystemSDK/ui/ThemeSelector'

interface RouterContext {
    auth: AuthSDK.State
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: () => (
        <>
            <QuerySDK.Provider>
                <div className='fixed top-5 left-5 z-50'>
                    <ThemeSelector />
                </div>
                <NotificationSDK.UIOverlay />
                <DialogSDK.UIOverlay />
                <StackSDK.UIOverlay />
                <Outlet />
                {/* <TanStackRouterDevtools /> */}
            </QuerySDK.Provider>
        </>
    ),
})

