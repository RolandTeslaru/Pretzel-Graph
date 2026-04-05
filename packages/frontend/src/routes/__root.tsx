import { DialogSDK } from '@/SDKs/DialogSDK'
import { StackSDK } from '@/SDKs/StackSDK'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { AuthSDK } from '@/SDKs/AuthSDK/sdk'
import { NotificationSDK } from '@/SDKs/NotificationSDK'
import { SandboxSDK } from '@/SDKs/SandboxSDK'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import ThemeSelector from '@/SDKs/SystemSDK/ui/ThemeSelector'
import VexrLabsWatermark from '@vx-agent-editor/vx-ui/brands/vexrWatermark'

interface RouterContext {
    auth: AuthSDK.State
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: () => (
        <>
            <QuerySDK.Provider>
                <div className='fixed bottom-5 right-5 z-50'>
                    <ThemeSelector />
                </div>
                <SandboxSDK.SandboxFrame />
                <NotificationSDK.UIOverlay />
                <DialogSDK.UIOverlay />
                <StackSDK.UIOverlay />
                <Outlet />
            </QuerySDK.Provider>

            <VexrLabsWatermark/>
        </>
    ),
})

