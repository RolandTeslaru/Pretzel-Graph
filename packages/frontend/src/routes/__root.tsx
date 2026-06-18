import { DialogSDK } from '@/SDKs/DialogSDK'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { AuthSDK } from '@/SDKs/AuthSDK/sdk'
import { NotificationSDK } from '@/SDKs/NotificationSDK'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import VexrLabsWatermark from '@pretzel-graph/standard-ui/brands/vexrWatermark'
import { useState } from 'react'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { WebhookPanel } from '@/SDKs/WebhookSDK/ui/WebhookPanel'
import '@/SDKs/WebhookSDK/sdk'
import { StateViewer } from '@/components/StateViewer'

interface RouterContext {
    auth: AuthSDK.State
}

function WebhookTester() {
    const [minimized, setMinimized] = useState(true)

    return (
        <div className={`fixed right-[20px] bottom-[20px] z-50 w-[420px] bg-card/80 backdrop-blur-sm border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto ${minimized ? 'h-auto' : 'bottom-20 h-[560px]'}`}>
            <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground">Webhook Tester</h3>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setMinimized(m => !m)}
                    aria-label={minimized ? 'Expand webhook tester' : 'Minimize webhook tester'}
                >
                    {minimized ? <SystemIcons.Maximize2 /> : <SystemIcons.Minimize2 />}
                </Button>
            </div>
            {!minimized && <WebhookPanel />}
        </div>
    )
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: () => (
        <>
            <QuerySDK.Provider>
                <NotificationSDK.UIOverlay />
                <DialogSDK.UIOverlay />
                {/* <StateViewer /> */}
                {/* <WebhookTester /> */}
                <Outlet />
            </QuerySDK.Provider>

            {/* <VexrLabsWatermark/> */}
        </>
    ),
})

